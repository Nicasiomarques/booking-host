import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'
import { futureDate, futureCheckOutDate } from './helpers/factories.js'
import { prisma } from '../../src/adapters/outbound/prisma/prisma.client.js'

interface HotelBooking {
  id: string
  userId: string
  serviceId: string
  status: string
  totalPrice: number
  checkInDate?: string | null
  checkOutDate?: string | null
  roomId?: string | null
  numberOfNights?: number | null
  guestName?: string | null
  checkedInAt?: string | null
  checkedOutAt?: string | null
}

describe('Hotel Booking E2E @critical', () => {
  let sut: FastifyInstance
  let owner: T.TestUser
  let customer: T.TestUser
  let establishmentId: string
  let hotelServiceId: string
  let availabilityId: string
  let roomId: string

  beforeAll(async () => {
    sut = await T.getTestApp()
    
    // Create owner
    owner = await T.createTestUser(sut, {
      email: T.uniqueEmail('hotel-owner'),
      password: 'Test1234!',
      name: 'Hotel Owner',
    })

    // Create establishment
    const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
      name: 'Test Hotel',
      address: '123 Hotel St',
    })
    establishmentId = establishment.id

    // Login owner to get fresh token
    const loginResult = await T.loginTestUser(sut, {
      email: owner.email,
      password: 'Test1234!',
    })
    owner.accessToken = loginResult.accessToken

    // Create hotel service
    const service = await T.createTestService(sut, owner.accessToken, establishmentId, {
      name: 'Standard Room',
      basePrice: 100, // Price per night
      durationMinutes: 1440, // 24 hours
      capacity: 1,
      type: 'HOTEL',
    })
    hotelServiceId = service.id

    // Create availability (required for booking, even for hotel)
    // Note: For hotel bookings, availability is still required but times are less relevant
    const availabilityDate = futureDate(5) // 5 days from now
    const availability = await T.createTestAvailability(sut, owner.accessToken, hotelServiceId, {
      date: availabilityDate,
      startTime: '14:00',
      endTime: '15:00', // Fixed: endTime must be after startTime
      capacity: 1,
    })
    availabilityId = availability.id

    // Create a default room for tests that need a specific roomId
    const room1 = await prisma.room.create({
      data: {
        serviceId: hotelServiceId,
        number: '101',
        floor: 1,
        description: 'Standard room',
        status: 'AVAILABLE',
      },
    })
    roomId = room1.id
    
    // Create customer
    customer = await T.createTestUser(sut, {
      email: T.uniqueEmail('hotel-customer'),
      password: 'Test1234!',
      name: 'Hotel Customer',
    })
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('POST /v1/bookings - Hotel Booking', () => {
    it('create hotel booking - with check-in/check-out dates - returns 201 with correct price calculation', async () => {
      // Arrange
      const checkInDate = futureDate(10) // 10 days from now
      const checkOutDate = futureCheckOutDate(checkInDate, 4) // 4 nights
      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId, // Required even for hotel bookings
        quantity: 1,
        checkInDate,
        checkOutDate,
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        guestDocument: '12345678900',
      }
      

      // Act
      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        userId: customer.id,
        serviceId: hotelServiceId,
        status: 'CONFIRMED',
        checkInDate,
        checkOutDate,
        numberOfNights: 4,
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        guestDocument: '12345678900',
      })
      // Total price should be 100 * 4 = 400
      expect(body.totalPrice).toBe(400)
      expect(body.roomId).toBeTruthy() // Should auto-assign a room
    })

    it('create hotel booking - missing check-in/check-out - returns 409 conflict', async () => {
      // Arrange
      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        // Missing checkInDate and checkOutDate
      }

      // Act
      const response = await T.post(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - invalid date range - returns 409 conflict', async () => {
      // Arrange
      const checkInDate = futureDate(10)
      const checkOutDate = futureDate(5) // Before check-in
      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate,
        checkOutDate, // Check-out before check-in
      }

      // Act
      const response = await T.post(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - no rooms available - returns 409 conflict', async () => {
      // Arrange - create a room and book it with overlapping dates
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '201',
          floor: 2,
          status: 'AVAILABLE',
        },
      })
      
      const firstCheckIn = futureDate(10)
      const firstCheckOut = futureCheckOutDate(firstCheckIn, 5)
      const firstBooking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: firstCheckIn,
        checkOutDate: firstCheckOut,
        roomId: testRoom.id,
      })

      // Try to book overlapping dates on the same room
      const overlapCheckIn = futureDate(12) // Overlaps with first booking
      const overlapCheckOut = futureCheckOutDate(overlapCheckIn, 6)
      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate: overlapCheckIn, // Overlaps with first booking
        checkOutDate: overlapCheckOut,
        roomId: testRoom.id, // Same room
      }

      // Act
      const response = await T.post(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - with specific roomId - returns 201 with assigned room', async () => {
      // Arrange - create a fresh room for this test to avoid conflicts
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '202',
          floor: 2,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(15)
      const checkOutDate = futureCheckOutDate(checkInDate, 2) // 2 nights
      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id, // Specify room
        guestName: 'Jane Doe',
      }

      // Act
      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        status: 'CONFIRMED',
        checkInDate,
        checkOutDate,
        numberOfNights: 2,
        roomId: testRoom.id, // Should use specified room
        guestName: 'Jane Doe',
      })
      // Total price should be 100 * 2 = 200
      expect(body.totalPrice).toBe(200)
    })
  })

  describe('GET /v1/bookings/:id - Hotel Booking Details', () => {
    it('get hotel booking - by booking owner - returns 200 with hotel-specific fields', async () => {
      // Arrange - create a fresh room for this test
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '301',
          floor: 3,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(20)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        guestName: 'Test Guest',
        roomId: testRoom.id,
      })

      // Act
      const response = await T.get<HotelBooking>(sut, `/v1/bookings/${booking.id}`, {
        token: customer.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: booking.id,
        serviceId: hotelServiceId,
        checkInDate,
        checkOutDate,
        numberOfNights: 4,
        guestName: 'Test Guest',
        roomId: expect.any(String),
      })
    })
  })

  describe('GET /v1/bookings/my - Hotel Bookings List', () => {
    it('get my hotel bookings - returns 200 with paginated list including hotel fields', async () => {
      // Arrange - create a fresh room and booking for this test
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '401',
          floor: 4,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(20)
      const checkOutDate = futureCheckOutDate(checkInDate, 2)
      await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Act
      const response = await T.get<PaginatedResponse<HotelBooking>>(sut, '/v1/bookings/my', {
        token: customer.accessToken,
        query: { page: 1, limit: 10 },
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        data: expect.any(Array),
        meta: {
          total: expect.any(Number),
          page: 1,
          limit: 10,
          totalPages: expect.any(Number),
        },
      })
      // Check if hotel bookings have hotel-specific fields
      const hotelBookings = body.data.filter((b: HotelBooking) => b.checkInDate)
      expect(hotelBookings.length).toBeGreaterThan(0)
      hotelBookings.forEach((booking: HotelBooking) => {
        expect(booking).toHaveProperty('checkInDate')
        expect(booking).toHaveProperty('checkOutDate')
        expect(booking).toHaveProperty('numberOfNights')
      })
    })
  })

  describe('PUT /v1/bookings/:id/cancel - Hotel Booking Cancellation', () => {
    it('cancel hotel booking - returns 200 and frees the room', async () => {
      // Arrange - create a fresh room for this test
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '501',
          floor: 5,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(30)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Verify room is occupied (status should be OCCUPIED after booking)
      const roomBefore = await prisma.room.findUnique({
        where: { id: booking.roomId! },
      })
      expect(roomBefore?.status).toBe('OCCUPIED')

      // Act
      const response = await T.put<HotelBooking>(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: booking.id,
        status: 'CANCELLED',
      })

      // Verify room is now available
      const roomAfter = await prisma.room.findUnique({
        where: { id: booking.roomId! },
      })
      expect(roomAfter?.status).toBe('AVAILABLE')
    })

    it('cancel hotel booking - already cancelled - returns 409 conflict', async () => {
      // Arrange - create a fresh room for this test
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '601',
          floor: 6,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(40)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })
      await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      // Act
      const response = await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      // Assert
      T.expectStatus(response, 409)
    })

    it('cancel hotel booking - frees room and allows new booking', async () => {
      // Arrange - create a fresh room for this test
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '701',
          floor: 7,
          status: 'AVAILABLE',
        },
      })
      
      // Create and cancel a booking
      const firstCheckIn = futureDate(50)
      const firstCheckOut = futureCheckOutDate(firstCheckIn, 4)
      const firstBooking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: firstCheckIn,
        checkOutDate: firstCheckOut,
        roomId: testRoom.id,
      })
      
      // Verify room is OCCUPIED
      const roomBefore = await prisma.room.findUnique({ where: { id: testRoom.id } })
      expect(roomBefore?.status).toBe('OCCUPIED')
      
      // Cancel the booking
      await T.put(sut, `/v1/bookings/${firstBooking.id}/cancel`, {
        token: customer.accessToken,
      })

      // Verify room is AVAILABLE again
      const roomAfter = await prisma.room.findUnique({ where: { id: testRoom.id } })
      expect(roomAfter?.status).toBe('AVAILABLE')

      // Act - try to book the same room again with non-overlapping dates
      const secondCheckIn = futureDate(60) // After first booking checkout
      const secondCheckOut = futureCheckOutDate(secondCheckIn, 4)
      const secondBooking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: secondCheckIn,
        checkOutDate: secondCheckOut,
        roomId: testRoom.id, // Same room
      })

      // Assert - should succeed
      expect(secondBooking.roomId).toBe(testRoom.id)
      expect(secondBooking.status).toBe('CONFIRMED')
    })
  })

  describe('POST /v1/bookings - Hotel Booking Edge Cases', () => {
    it('create hotel booking - with room in maintenance - returns 409 conflict', async () => {
      // Arrange - create room in maintenance
      const maintenanceRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '999',
          floor: 9,
          status: 'MAINTENANCE',
        },
      })

      const checkInDate = futureDate(50)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate,
        checkOutDate,
        roomId: maintenanceRoom.id,
      }

      // Act
      const response = await T.post(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - with room blocked - returns 409 conflict', async () => {
      // Arrange - create blocked room
      const blockedRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '888',
          floor: 8,
          status: 'BLOCKED',
        },
      })

      const checkInDate = futureDate(70)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate,
        checkOutDate,
        roomId: blockedRoom.id,
      }

      // Act
      const response = await T.post(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - with room in cleaning - returns 409 conflict', async () => {
      // Arrange - create room in cleaning
      const cleaningRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '777',
          floor: 7,
          status: 'CLEANING',
        },
      })

      const checkInDate = futureDate(80)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate,
        checkOutDate,
        roomId: cleaningRoom.id,
      }

      // Act
      const response = await T.post(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - 1 night stay - returns 201 with correct price', async () => {
      // Arrange - create a fresh room for this test
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '801',
          floor: 8,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(90)
      const checkOutDate = futureCheckOutDate(checkInDate, 1) // 1 night
      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      }

      // Act
      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      expect(body.numberOfNights).toBe(1)
      expect(body.totalPrice).toBe(100) // 100 * 1 = 100
    })

    it('create hotel booking - with extras - returns 201 with total price including extras', async () => {
      // Arrange - create a fresh room and extra item for this test
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '901',
          floor: 9,
          status: 'AVAILABLE',
        },
      })
      
      const extraItem = await T.createTestExtraItem(sut, owner.accessToken, hotelServiceId, {
        name: 'Breakfast',
        price: 25,
        maxQuantity: 2,
      })

      const checkInDate = futureDate(100)
      const checkOutDate = futureCheckOutDate(checkInDate, 2) // 2 nights
      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
        extras: [{ extraItemId: extraItem.id, quantity: 1 }],
      }

      // Act
      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      // Base: 100 * 2 = 200, Extra: 25 * 1 = 25, Total: 225
      expect(body.totalPrice).toBe(225)
      expect(body.numberOfNights).toBe(2)
    })
  })

  describe('PUT /v1/bookings/:id/check-in - Hotel Check-in', () => {
    it('check-in hotel booking - returns 200 with CHECKED_IN status', async () => {
      // Arrange - create a fresh room and booking
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '1001',
          floor: 10,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(110)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Verify initial status
      expect(booking.status).toBe('CONFIRMED')

      // Act - owner checks in the guest
      const response = await T.put<HotelBooking>(sut, `/v1/bookings/${booking.id}/check-in`, {
        token: owner.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: booking.id,
        status: 'CHECKED_IN',
      })
      expect(body.checkedInAt).toBeTruthy()
      expect(new Date(body.checkedInAt!).getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('check-in hotel booking - already checked in - returns 409 conflict', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '1002',
          floor: 10,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(120)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Check in once
      await T.put(sut, `/v1/bookings/${booking.id}/check-in`, {
        token: owner.accessToken,
      })

      // Act - try to check in again
      const response = await T.put(sut, `/v1/bookings/${booking.id}/check-in`, {
        token: owner.accessToken,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('check-in hotel booking - non-staff user - returns 403 forbidden', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '1003',
          floor: 10,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(130)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Act - customer tries to check in (should fail)
      const response = await T.put(sut, `/v1/bookings/${booking.id}/check-in`, {
        token: customer.accessToken,
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('check-in non-hotel booking - returns 409 conflict', async () => {
      // Arrange - create a regular service booking (not hotel)
      const regularService = await T.createTestService(sut, owner.accessToken, establishmentId, {
        name: 'Regular Service',
        basePrice: 50,
        durationMinutes: 60,
        capacity: 1,
        type: 'SERVICE',
      })

      const regularAvailability = await T.createTestAvailability(sut, owner.accessToken, regularService.id, {
        date: futureDate(110),
        startTime: '09:00',
        endTime: '10:00',
        capacity: 1,
      })

      const regularBooking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: regularService.id,
        availabilityId: regularAvailability.id,
      })

      // Act - try to check in a non-hotel booking
      const response = await T.put(sut, `/v1/bookings/${regularBooking.id}/check-in`, {
        token: owner.accessToken,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })
  })

  describe('PUT /v1/bookings/:id/check-out - Hotel Check-out', () => {
    it('check-out hotel booking - returns 200 with CHECKED_OUT status and frees room', async () => {
      // Arrange - create a fresh room and booking
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '1101',
          floor: 11,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(110)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Check in first
      await T.put(sut, `/v1/bookings/${booking.id}/check-in`, {
        token: owner.accessToken,
      })

      // Verify room is OCCUPIED
      const roomBefore = await prisma.room.findUnique({ where: { id: testRoom.id } })
      expect(roomBefore?.status).toBe('OCCUPIED')

      // Act - owner checks out the guest
      const response = await T.put<HotelBooking>(sut, `/v1/bookings/${booking.id}/check-out`, {
        token: owner.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: booking.id,
        status: 'CHECKED_OUT',
      })
      expect(body.checkedOutAt).toBeTruthy()
      expect(new Date(body.checkedOutAt!).getTime()).toBeLessThanOrEqual(Date.now())

      // Verify room is AVAILABLE again
      const roomAfter = await prisma.room.findUnique({ where: { id: testRoom.id } })
      expect(roomAfter?.status).toBe('AVAILABLE')
    })

    it('check-out hotel booking - without check-in - returns 200 (allows direct check-out)', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '1102',
          floor: 11,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(120)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Act - check out without checking in first (should be allowed)
      const response = await T.put<HotelBooking>(sut, `/v1/bookings/${booking.id}/check-out`, {
        token: owner.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body.status).toBe('CHECKED_OUT')

      // Verify room is AVAILABLE
      const roomAfter = await prisma.room.findUnique({ where: { id: testRoom.id } })
      expect(roomAfter?.status).toBe('AVAILABLE')
    })

    it('check-out hotel booking - already checked out - returns 409 conflict', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '1103',
          floor: 11,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(130)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Check out once
      await T.put(sut, `/v1/bookings/${booking.id}/check-out`, {
        token: owner.accessToken,
      })

      // Act - try to check out again
      const response = await T.put(sut, `/v1/bookings/${booking.id}/check-out`, {
        token: owner.accessToken,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('check-out hotel booking - non-staff user - returns 403 forbidden', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '1104',
          floor: 11,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(140)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Act - customer tries to check out (should fail)
      const response = await T.put(sut, `/v1/bookings/${booking.id}/check-out`, {
        token: customer.accessToken,
      })

      // Assert
      T.expectStatus(response, 403)
    })
  })

  describe('PUT /v1/bookings/:id/no-show - Hotel No-Show', () => {
    it('mark hotel booking as no-show - returns 200 with NO_SHOW status and frees room', async () => {
      // Arrange - create a fresh room and booking
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '1201',
          floor: 12,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(110)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Verify room is OCCUPIED
      const roomBefore = await prisma.room.findUnique({ where: { id: testRoom.id } })
      expect(roomBefore?.status).toBe('OCCUPIED')

      // Act - owner marks as no-show
      const response = await T.put<HotelBooking>(sut, `/v1/bookings/${booking.id}/no-show`, {
        token: owner.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: booking.id,
        status: 'NO_SHOW',
      })

      // Verify room is AVAILABLE
      const roomAfter = await prisma.room.findUnique({ where: { id: testRoom.id } })
      expect(roomAfter?.status).toBe('AVAILABLE')
    })

    it('mark hotel booking as no-show - already checked in - returns 409 conflict', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '1202',
          floor: 12,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(120)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Check in first
      await T.put(sut, `/v1/bookings/${booking.id}/check-in`, {
        token: owner.accessToken,
      })

      // Act - try to mark as no-show
      const response = await T.put(sut, `/v1/bookings/${booking.id}/no-show`, {
        token: owner.accessToken,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('mark hotel booking as no-show - non-staff user - returns 403 forbidden', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '1203',
          floor: 12,
          status: 'AVAILABLE',
        },
      })
      
      const checkInDate = futureDate(130)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomId: testRoom.id,
      })

      // Act - customer tries to mark as no-show (should fail)
      const response = await T.put(sut, `/v1/bookings/${booking.id}/no-show`, {
        token: customer.accessToken,
      })

      // Assert
      T.expectStatus(response, 403)
    })
  })
})

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

