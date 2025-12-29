import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'
import { prisma } from '../../src/shared/adapters/outbound/prisma/prisma.client.js'

interface HotelBooking {
  id: string
  status: string
  totalPrice: number
  checkInDate?: string | null
  checkOutDate?: string | null
  numberOfNights?: number | null
  roomId?: string | null
}

describe('Hotel Booking Edge Cases E2E', () => {
  let sut: FastifyInstance
  let owner: T.TestUser
  let customer: T.TestUser
  let establishmentId: string
  let hotelServiceId: string
  let otherHotelServiceId: string
  let availabilityId: string

  beforeAll(async () => {
    sut = await T.getTestApp()

    // Create owner
    owner = await T.createTestUser(sut, {
      email: T.uniqueEmail('edge-owner'),
      password: 'Test1234!',
      name: 'Edge Cases Owner',
    })

    // Create establishment
    const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
      name: 'Test Hotel',
      address: '123 Hotel St',
    })
    establishmentId = establishment.id

    // Login owner
    const loginResult = await T.loginTestUser(sut, {
      email: owner.email,
      password: 'Test1234!',
    })
    owner.accessToken = loginResult.accessToken

    // Create hotel service
    const service = await T.createTestService(sut, owner.accessToken, establishmentId, {
      name: 'Standard Room',
      basePrice: 100,
      durationMinutes: 1440,
      capacity: 1,
      type: 'HOTEL',
    })
    hotelServiceId = service.id

    // Create another hotel service for cross-service validation
    const otherService = await T.createTestService(sut, owner.accessToken, establishmentId, {
      name: 'Another Hotel',
      basePrice: 150,
      durationMinutes: 1440,
      capacity: 1,
      type: 'HOTEL',
    })
    otherHotelServiceId = otherService.id

    // Create availability
    const availability = await T.createTestAvailability(sut, owner.accessToken, hotelServiceId, {
      date: '2025-12-01',
      startTime: '14:00',
      endTime: '15:00',
      capacity: 1,
    })
    availabilityId = availability.id

    // Create customer
    customer = await T.createTestUser(sut, {
      email: T.uniqueEmail('edge-customer'),
      password: 'Test1234!',
      name: 'Edge Cases Customer',
    })
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('POST /v1/bookings - Validation Edge Cases', () => {
    it('create hotel booking - with roomId from different service - returns 409 conflict', async () => {
      // Arrange - create room in different service
      const otherRoom = await prisma.room.create({
        data: {
          serviceId: otherHotelServiceId,
          number: '999',
          floor: 9,
          status: 'AVAILABLE',
        },
      })

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate: '2025-12-10',
        checkOutDate: '2025-12-15',
        roomId: otherRoom.id, // Room from different service
      }

      // Act
      const response = await T.post<{ error?: { code?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - with dates in the past - returns 409 conflict', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '998',
          floor: 9,
          status: 'AVAILABLE',
        },
      })

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      const pastDate = yesterday.toISOString().split('T')[0]
      
      // Use a future checkOutDate to avoid triggering the "checkOutDate must be after checkInDate" error
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const futureDate = tomorrow.toISOString().split('T')[0]

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate: pastDate,
        checkOutDate: futureDate,
        roomId: testRoom.id,
      }

      // Act
      const response = await T.post<{ error?: { code?: string; message?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert - should validate that dates are not in the past
      T.expectError(response, 409, 'CONFLICT')
      const body = response.body as any
      expect(body.error?.message).toContain('checkInDate cannot be in the past')
    })

    it('create hotel booking - long stay (30+ nights) - returns 201 with correct price', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '997',
          floor: 9,
          status: 'AVAILABLE',
        },
      })

      // Use future dates to avoid past date validation
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkInDate = futureDate.toISOString().split('T')[0]
      
      const checkOutDate = new Date(futureDate)
      checkOutDate.setDate(checkOutDate.getDate() + 31) // 31 nights
      const checkOutDateStr = checkOutDate.toISOString().split('T')[0]

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate: checkInDate,
        checkOutDate: checkOutDateStr,
        roomId: testRoom.id,
      }

      // Act
      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      expect(body.numberOfNights).toBe(31)
      expect(body.totalPrice).toBe(3100) // 100 * 31 = 3100
    })

    it('create hotel booking - check-in same day as previous check-out - returns 201 (allows same day)', async () => {
      // Arrange - use future dates to avoid past date validation
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkInDate1 = futureDate.toISOString().split('T')[0]
      
      const checkOutDate1 = new Date(futureDate)
      checkOutDate1.setDate(checkOutDate1.getDate() + 4)
      const checkOutDate1Str = checkOutDate1.toISOString().split('T')[0]

      const room1 = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '996',
          floor: 9,
          status: 'AVAILABLE',
        },
      })

      // Create first booking
      const firstBooking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: checkInDate1,
        checkOutDate: checkOutDate1Str,
        roomId: room1.id,
      })

      // Check in first (required before check-out)
      await T.put(sut, `/v1/bookings/${firstBooking.id}/check-in`, {
        token: owner.accessToken,
      })

      // Check out the first booking
      await T.put(sut, `/v1/bookings/${firstBooking.id}/check-out`, {
        token: owner.accessToken,
      })

      // Act - try to book same room with check-in on check-out day
      const checkOutDate2 = new Date(checkOutDate1)
      checkOutDate2.setDate(checkOutDate2.getDate() + 5)
      const checkOutDate2Str = checkOutDate2.toISOString().split('T')[0]

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate: checkOutDate1Str, // Same as previous check-out
        checkOutDate: checkOutDate2Str,
        roomId: room1.id, // Same room
      }

      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert - should succeed (same day check-in/check-out is allowed)
      const body = T.expectStatus(response, 201)
      expect(body.checkInDate).toBe(checkOutDate1Str)
      expect(body.roomId).toBe(room1.id)
    })

    it('create hotel booking - overlapping dates on same room - returns 409 conflict', async () => {
      // Arrange - use future dates
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkInDate1 = futureDate.toISOString().split('T')[0]
      
      const checkOutDate1 = new Date(futureDate)
      checkOutDate1.setDate(checkOutDate1.getDate() + 5)
      const checkOutDate1Str = checkOutDate1.toISOString().split('T')[0]

      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '994',
          floor: 9,
          status: 'AVAILABLE',
        },
      })

      // Create first booking
      await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: checkInDate1,
        checkOutDate: checkOutDate1Str,
        roomId: testRoom.id,
      })

      // Try to book overlapping dates
      const checkInDate2 = new Date(futureDate)
      checkInDate2.setDate(checkInDate2.getDate() + 2) // Overlaps (2 days after check-in, but before check-out)
      const checkInDate2Str = checkInDate2.toISOString().split('T')[0]
      
      const checkOutDate2 = new Date(checkOutDate1)
      checkOutDate2.setDate(checkOutDate2.getDate() + 3)
      const checkOutDate2Str = checkOutDate2.toISOString().split('T')[0]

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate: checkInDate2Str, // Overlaps
        checkOutDate: checkOutDate2Str,
        roomId: testRoom.id, // Same room
      }

      // Act
      const response = await T.post<{ error?: { code?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - non-overlapping dates on same room but room is OCCUPIED - returns 409 conflict', async () => {
      // Arrange - use future dates
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkInDate1 = futureDate.toISOString().split('T')[0]
      
      const checkOutDate1 = new Date(futureDate)
      checkOutDate1.setDate(checkOutDate1.getDate() + 5)
      const checkOutDate1Str = checkOutDate1.toISOString().split('T')[0]

      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '993',
          floor: 9,
          status: 'AVAILABLE',
        },
      })

      // Create first booking (room becomes OCCUPIED)
      await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: checkInDate1,
        checkOutDate: checkOutDate1Str,
        roomId: testRoom.id,
      })

      // Try to book non-overlapping dates (after first booking ends)
      // But room is OCCUPIED, so it should fail
      const checkInDate2 = new Date(checkOutDate1)
      checkInDate2.setDate(checkInDate2.getDate() + 1)
      const checkInDate2Str = checkInDate2.toISOString().split('T')[0]
      
      const checkOutDate2 = new Date(checkInDate2)
      checkOutDate2.setDate(checkOutDate2.getDate() + 4)
      const checkOutDate2Str = checkOutDate2.toISOString().split('T')[0]

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate: checkInDate2Str, // After first booking checkout
        checkOutDate: checkOutDate2Str,
        roomId: testRoom.id, // Same room (but OCCUPIED)
      }

      // Act
      const response = await T.post<{ error?: { code?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert - should fail because room is OCCUPIED
      // The room status is OCCUPIED, so it won't be found in findAvailableRooms
      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - non-overlapping dates on same room after check-out - returns 201', async () => {
      // Arrange - use future dates to avoid past date validation
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkInDate1 = futureDate.toISOString().split('T')[0]
      
      const checkOutDate1 = new Date(futureDate)
      checkOutDate1.setDate(checkOutDate1.getDate() + 5)
      const checkOutDate1Str = checkOutDate1.toISOString().split('T')[0]

      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '992',
          floor: 9,
          status: 'AVAILABLE',
        },
      })

      // Create first booking
      const firstBooking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: checkInDate1,
        checkOutDate: checkOutDate1Str,
        roomId: testRoom.id,
      })

      // Check in first (required before check-out)
      await T.put(sut, `/v1/bookings/${firstBooking.id}/check-in`, {
        token: owner.accessToken,
      })

      // Check out the first booking (room becomes AVAILABLE again)
      await T.put(sut, `/v1/bookings/${firstBooking.id}/check-out`, {
        token: owner.accessToken,
      })

      // Book non-overlapping dates (after first booking checkout)
      const checkInDate2 = new Date(checkOutDate1)
      checkInDate2.setDate(checkInDate2.getDate() + 1)
      const checkInDate2Str = checkInDate2.toISOString().split('T')[0]
      
      const checkOutDate2 = new Date(checkInDate2)
      checkOutDate2.setDate(checkOutDate2.getDate() + 4)
      const checkOutDate2Str = checkOutDate2.toISOString().split('T')[0]

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate: checkInDate2Str, // After first booking checkout
        checkOutDate: checkOutDate2Str,
        roomId: testRoom.id, // Same room (now AVAILABLE after check-out)
      }

      // Act
      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert - should succeed because room is AVAILABLE after check-out
      const body = T.expectStatus(response, 201)
      expect(body.checkInDate).toBe(checkInDate2Str)
      expect(body.roomId).toBe(testRoom.id)
    })

    it('create hotel booking - missing checkInDate - returns 409 conflict', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '991',
          floor: 9,
          status: 'AVAILABLE',
        },
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkOutDate = futureDate.toISOString().split('T')[0]

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkOutDate, // Missing checkInDate
        roomId: testRoom.id,
      }

      // Act
      const response = await T.post<{ error?: { code?: string; message?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
      const body = response.body as any
      expect(body.error?.message).toContain('checkInDate')
    })

    it('create hotel booking - missing checkOutDate - returns 409 conflict', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '990',
          floor: 9,
          status: 'AVAILABLE',
        },
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkInDate = futureDate.toISOString().split('T')[0]

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate, // Missing checkOutDate
        roomId: testRoom.id,
      }

      // Act
      const response = await T.post<{ error?: { code?: string; message?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
      const body = response.body as any
      expect(body.error?.message).toContain('checkOutDate')
    })

    it('create hotel booking - checkInDate equals checkOutDate - returns 409 conflict', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '989',
          floor: 9,
          status: 'AVAILABLE',
        },
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const sameDate = futureDate.toISOString().split('T')[0]

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate: sameDate,
        checkOutDate: sameDate, // Same as checkInDate
        roomId: testRoom.id,
      }

      // Act
      const response = await T.post<{ error?: { code?: string; message?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
      const body = response.body as any
      expect(body.error?.message).toContain('checkOutDate must be after checkInDate')
    })

    it('create hotel booking - checkInDate after checkOutDate - returns 409 conflict', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '988',
          floor: 9,
          status: 'AVAILABLE',
        },
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkInDate = futureDate.toISOString().split('T')[0]
      
      const pastDate = new Date(futureDate)
      pastDate.setDate(pastDate.getDate() - 2)
      const checkOutDate = pastDate.toISOString().split('T')[0] // Before checkInDate

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate,
        checkOutDate, // Before checkInDate
        roomId: testRoom.id,
      }

      // Act
      const response = await T.post<{ error?: { code?: string; message?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
      const body = response.body as any
      expect(body.error?.message).toContain('checkOutDate must be after checkInDate')
    })
  })
})

