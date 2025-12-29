import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'
import { createTestRoom } from './helpers/room.js'
import { checkInBooking, checkOutBooking } from './helpers/hotel-operations.js'
import { dateDaysFromNow, yesterdayDate, tomorrowDate } from './helpers/date-helpers.js'
import { attemptBookingCreation, createBookingPayload } from './helpers/booking-helpers.js'

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
      const otherRoom = await createTestRoom({
        serviceId: otherHotelServiceId,
        number: '999',
        floor: 9,
      })

      const bookingData = {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        quantity: 1,
        checkInDate: '2025-12-10',
        checkOutDate: '2025-12-15',
        roomId: otherRoom.id,
      }

      const response = await T.post<{ error?: { code?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - with dates in the past - returns 409 conflict', async () => {
      const testRoom = await createTestRoom({
        serviceId: hotelServiceId,
        number: '998',
        floor: 9,
      })

      const response = await attemptBookingCreation(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: yesterdayDate(),
        checkOutDate: tomorrowDate(),
        roomId: testRoom.id,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('checkInDate cannot be in the past')
    })

    it('create hotel booking - long stay (30+ nights) - returns 201 with correct price', async () => {
      const checkInDate = dateDaysFromNow(10)
      const checkOutDate = dateDaysFromNow(41)

      const response = await attemptBookingCreation(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate,
        checkOutDate,
        roomServiceId: hotelServiceId,
        roomNumber: '997',
        roomFloor: 9,
      })

      const body = T.expectStatus(response, 201)
      expect(body.numberOfNights).toBe(31)
      expect(body.totalPrice).toBe(3100)
    })

    it('create hotel booking - check-in same day as previous check-out - returns 201 (allows same day)', async () => {
      const checkInDate1 = dateDaysFromNow(10)
      const checkOutDate1 = dateDaysFromNow(14)
      const room1 = await createTestRoom({
        serviceId: hotelServiceId,
        number: '996',
        floor: 9,
      })

      const firstBooking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: checkInDate1,
        checkOutDate: checkOutDate1,
        roomId: room1.id,
      })

      await checkInBooking(sut, firstBooking.id, owner.accessToken)
      await checkOutBooking(sut, firstBooking.id, owner.accessToken)

      const checkOutDate2 = dateDaysFromNow(19)
      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate: checkOutDate1,
          checkOutDate: checkOutDate2,
          roomId: room1.id,
        }),
      })

      const body = T.expectStatus(response, 201)
      expect(body.checkInDate).toBe(checkOutDate1)
      expect(body.roomId).toBe(room1.id)
    })

    it('create hotel booking - overlapping dates on same room - returns 409 conflict', async () => {
      const checkInDate1 = dateDaysFromNow(10)
      const checkOutDate1 = dateDaysFromNow(15)
      const testRoom = await createTestRoom({
        serviceId: hotelServiceId,
        number: '994',
        floor: 9,
      })

      await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: checkInDate1,
        checkOutDate: checkOutDate1,
        roomId: testRoom.id,
      })

      const checkInDate2 = dateDaysFromNow(12)
      const checkOutDate2 = dateDaysFromNow(18)

      const response = await T.post<{ error?: { code?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate: checkInDate2,
          checkOutDate: checkOutDate2,
          roomId: testRoom.id,
        }),
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - non-overlapping dates on same room but room is OCCUPIED - returns 409 conflict', async () => {
      const checkInDate1 = dateDaysFromNow(10)
      const checkOutDate1 = dateDaysFromNow(15)
      const testRoom = await createTestRoom({
        serviceId: hotelServiceId,
        number: '993',
        floor: 9,
      })

      await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: checkInDate1,
        checkOutDate: checkOutDate1,
        roomId: testRoom.id,
      })

      const checkInDate2 = dateDaysFromNow(16)
      const checkOutDate2 = dateDaysFromNow(20)

      const response = await T.post<{ error?: { code?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate: checkInDate2,
          checkOutDate: checkOutDate2,
          roomId: testRoom.id,
        }),
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - non-overlapping dates on same room after check-out - returns 201', async () => {
      const checkInDate1 = dateDaysFromNow(10)
      const checkOutDate1 = dateDaysFromNow(15)
      const testRoom = await createTestRoom({
        serviceId: hotelServiceId,
        number: '992',
        floor: 9,
      })

      const firstBooking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: checkInDate1,
        checkOutDate: checkOutDate1,
        roomId: testRoom.id,
      })

      await checkInBooking(sut, firstBooking.id, owner.accessToken)
      await checkOutBooking(sut, firstBooking.id, owner.accessToken)

      const checkInDate2 = dateDaysFromNow(16)
      const checkOutDate2 = dateDaysFromNow(20)

      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate: checkInDate2,
          checkOutDate: checkOutDate2,
          roomId: testRoom.id,
        }),
      })

      const body = T.expectStatus(response, 201)
      expect(body.checkInDate).toBe(checkInDate2)
      expect(body.roomId).toBe(testRoom.id)
    })

    it.each([
      ['missing checkInDate', { checkOutDate: dateDaysFromNow(10) }, 'checkInDate', '991'],
      ['missing checkOutDate', { checkInDate: dateDaysFromNow(10) }, 'checkOutDate', '990'],
      ['checkInDate equals checkOutDate', { checkInDate: dateDaysFromNow(10), checkOutDate: dateDaysFromNow(10) }, 'checkOutDate must be after checkInDate', '989'],
      ['checkInDate after checkOutDate', { checkInDate: dateDaysFromNow(10), checkOutDate: dateDaysFromNow(8) }, 'checkOutDate must be after checkInDate', '988'],
    ])('create hotel booking - %s - returns 409 conflict', async (_, dateOverrides, expectedMessage, roomNumber) => {
      const testRoom = await createTestRoom({
        serviceId: hotelServiceId,
        number: roomNumber,
        floor: 9,
      })

      const response = await T.post<{ error?: { code?: string; message?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          roomId: testRoom.id,
          ...dateOverrides,
        }),
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain(expectedMessage)
    })
  })
})

