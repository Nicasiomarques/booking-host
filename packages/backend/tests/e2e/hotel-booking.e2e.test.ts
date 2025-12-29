import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'
import type { ErrorResponse } from './helpers/http.js'
import { futureDate, futureCheckOutDate } from './helpers/factories.js'
import { createTestRoom, createTestRoomWithStatus, getRoomStatus } from './helpers/room.js'
import { checkInBooking, checkOutBooking, markNoShow, createHotelBookingWithRoom } from './helpers/hotel-operations.js'
import { createBookingPayload } from './helpers/booking-helpers.js'

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

    const room1 = await createTestRoom({
      serviceId: hotelServiceId,
      number: '101',
      floor: 1,
      description: 'Standard room',
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
      const checkInDate = futureDate(10)
      const checkOutDate = futureCheckOutDate(checkInDate, 4)

      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate,
          checkOutDate,
          guestName: 'John Doe',
          guestEmail: 'john@example.com',
          guestDocument: '12345678900',
        }),
      })

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
      expect(body.totalPrice).toBe(400)
      expect(body.roomId).toBeTruthy()
    })

    it('create hotel booking - missing check-in/check-out - returns 409 conflict', async () => {
      const response = await T.post<ErrorResponse>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
        }),
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - invalid date range - returns 409 conflict', async () => {
      const response = await T.post<ErrorResponse>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate: futureDate(10),
          checkOutDate: futureDate(5),
        }),
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - no rooms available - returns 409 conflict', async () => {
      const testRoom = await createTestRoom({
        serviceId: hotelServiceId,
        number: '201',
        floor: 2,
      })

      const firstCheckIn = futureDate(10)
      const firstCheckOut = futureCheckOutDate(firstCheckIn, 5)
      await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: firstCheckIn,
        checkOutDate: firstCheckOut,
        roomId: testRoom.id,
      })

      const overlapCheckIn = futureDate(12)
      const overlapCheckOut = futureCheckOutDate(overlapCheckIn, 6)

      const response = await T.post<ErrorResponse>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate: overlapCheckIn,
          checkOutDate: overlapCheckOut,
          roomId: testRoom.id,
        }),
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - with specific roomId - returns 201 with assigned room', async () => {
      const testRoom = await createTestRoom({
        serviceId: hotelServiceId,
        number: '202',
        floor: 2,
      })
      
      const checkInDate = futureDate(15)
      const checkOutDate = futureCheckOutDate(checkInDate, 2)

      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate,
          checkOutDate,
          roomId: testRoom.id,
          guestName: 'Jane Doe',
        }),
      })

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        status: 'CONFIRMED',
        checkInDate,
        checkOutDate,
        numberOfNights: 2,
        roomId: testRoom.id,
        guestName: 'Jane Doe',
      })
      expect(body.totalPrice).toBe(200)
    })
  })

  describe('GET /v1/bookings/:id - Hotel Booking Details', () => {
    it('get hotel booking - by booking owner - returns 200 with hotel-specific fields', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
        guestName: 'Test Guest',
      })

      const response = await T.get<HotelBooking>(sut, `/v1/bookings/${booking.id}`, {
        token: customer.accessToken,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: booking.id,
        serviceId: hotelServiceId,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        numberOfNights: 4,
        guestName: 'Test Guest',
        roomId: expect.any(String),
      })
    })
  })

  describe('GET /v1/bookings/my - Hotel Bookings List', () => {
    it('get my hotel bookings - returns 200 with paginated list including hotel fields', async () => {
      await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 2,
      })

      const response = await T.get<PaginatedResponse<HotelBooking>>(sut, '/v1/bookings/my', {
        token: customer.accessToken,
        query: { page: 1, limit: 10 },
      })

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
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      expect(await getRoomStatus(booking.roomId!)).toBe('OCCUPIED')

      const response = await T.put<HotelBooking>(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: booking.id,
        status: 'CANCELLED',
      })

      expect(await getRoomStatus(booking.roomId!)).toBe('AVAILABLE')
    })

    it('cancel hotel booking - already cancelled - returns 409 conflict', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      const response = await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      T.expectStatus(response, 409)
    })

    it('cancel hotel booking - frees room and allows new booking', async () => {
      const { booking, room } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
        checkInDate: futureDate(50),
      })
      
      expect(await getRoomStatus(room.id)).toBe('OCCUPIED')
      
      await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      expect(await getRoomStatus(room.id)).toBe('AVAILABLE')

      const secondCheckIn = futureDate(60)
      const secondBooking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        checkInDate: secondCheckIn,
        checkOutDate: futureCheckOutDate(secondCheckIn, 4),
        roomId: room.id,
      })

      expect(secondBooking.roomId).toBe(room.id)
      expect(secondBooking.status).toBe('CONFIRMED')
    })
  })

  describe('POST /v1/bookings - Hotel Booking Edge Cases', () => {
    it.each([
      ['MAINTENANCE', '999', 9, 50],
      ['BLOCKED', '888', 8, 70],
      ['CLEANING', '777', 7, 80],
    ])('create hotel booking - with room %s - returns 409 conflict', async (status, number, floor, daysOffset) => {
      const room = await createTestRoomWithStatus(hotelServiceId, status as any, { number, floor })

      const response = await T.post<ErrorResponse>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate: futureDate(daysOffset),
          checkOutDate: futureCheckOutDate(futureDate(daysOffset), 4),
          roomId: room.id,
        }),
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('create hotel booking - 1 night stay - returns 201 with correct price', async () => {
      const checkInDate = futureDate(90)
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        checkInDate,
        checkOutDate: futureCheckOutDate(checkInDate, 1),
      })

      expect(booking.numberOfNights).toBe(1)
      expect(booking.totalPrice).toBe(100)
    })

    it('create hotel booking - with extras - returns 201 with total price including extras', async () => {
      const testRoom = await createTestRoom({
        serviceId: hotelServiceId,
        number: '901',
        floor: 9,
      })
      
      const extraItem = await T.createTestExtraItem(sut, owner.accessToken, hotelServiceId, {
        name: 'Breakfast',
        price: 25,
        maxQuantity: 2,
      })

      const checkInDate = futureDate(100)
      const checkOutDate = futureCheckOutDate(checkInDate, 2)

      const response = await T.post<HotelBooking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: createBookingPayload({
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate,
          checkOutDate,
          roomId: testRoom.id,
          extras: [{ extraItemId: extraItem.id, quantity: 1 }],
        }),
      })

      const body = T.expectStatus(response, 201)
      expect(body.totalPrice).toBe(225)
      expect(body.numberOfNights).toBe(2)
    })
  })

  describe('PUT /v1/bookings/:id/check-in - Hotel Check-in', () => {
    it('check-in hotel booking - returns 200 with CHECKED_IN status', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      expect(booking.status).toBe('CONFIRMED')

      const body = await checkInBooking(sut, booking.id, owner.accessToken)

      expect(body).toMatchObject({
        id: booking.id,
        status: 'CHECKED_IN',
      })
      expect(body.checkedInAt).toBeTruthy()
      expect(new Date(body.checkedInAt!).getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('check-in hotel booking - already checked in - returns 409 conflict', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      await checkInBooking(sut, booking.id, owner.accessToken)

      const response = await T.put<ErrorResponse>(sut, `/v1/bookings/${booking.id}/check-in`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('check-in hotel booking - non-staff user - returns 403 forbidden', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      const response = await T.put(sut, `/v1/bookings/${booking.id}/check-in`, {
        token: customer.accessToken,
      })

      T.expectStatus(response, 403)
    })

    it('check-in non-hotel booking - returns 409 conflict', async () => {
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

      const response = await T.put<ErrorResponse>(
        sut,
        `/v1/bookings/${regularBooking.id}/check-in`,
        {
          token: owner.accessToken,
        }
      )

      T.expectError(response, 409, 'CONFLICT')
    })

    it('check-in hotel booking - cancelled booking - returns 409 conflict', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      await T.put(sut, `/v1/bookings/${booking.id}/cancel`, { token: customer.accessToken })

      const response = await T.put<ErrorResponse>(sut, `/v1/bookings/${booking.id}/check-in`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('cancelled')
    })

    it('check-in hotel booking - no-show booking - returns 409 conflict', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      await markNoShow(sut, booking.id, owner.accessToken)

      const response = await T.put<ErrorResponse>(sut, `/v1/bookings/${booking.id}/check-in`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('no-show')
    })

    it('check-in hotel booking - already checked out - returns 409 conflict', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      await checkInBooking(sut, booking.id, owner.accessToken)
      await checkOutBooking(sut, booking.id, owner.accessToken)

      const response = await T.put<ErrorResponse>(sut, `/v1/bookings/${booking.id}/check-in`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('checked out')
    })
  })

  describe('PUT /v1/bookings/:id/check-out - Hotel Check-out', () => {
    it('check-out hotel booking - returns 200 with CHECKED_OUT status and frees room', async () => {
      const { booking, room } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      await checkInBooking(sut, booking.id, owner.accessToken)

      expect(await getRoomStatus(room.id)).toBe('OCCUPIED')

      const body = await checkOutBooking(sut, booking.id, owner.accessToken)

      expect(body).toMatchObject({
        id: booking.id,
        status: 'CHECKED_OUT',
      })
      expect(body.checkedOutAt).toBeTruthy()
      expect(new Date(body.checkedOutAt!).getTime()).toBeLessThanOrEqual(Date.now())

      expect(await getRoomStatus(room.id)).toBe('AVAILABLE')
    })

    it('check-out hotel booking - without check-in - returns 409 conflict', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      const response = await T.put<ErrorResponse>(sut, `/v1/bookings/${booking.id}/check-out`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('must be checked in')
    })

    it('check-out hotel booking - already checked out - returns 409 conflict', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      await checkInBooking(sut, booking.id, owner.accessToken)
      await checkOutBooking(sut, booking.id, owner.accessToken)

      const response = await T.put<ErrorResponse>(sut, `/v1/bookings/${booking.id}/check-out`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('check-out hotel booking - non-staff user - returns 403 forbidden', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      const response = await T.put(sut, `/v1/bookings/${booking.id}/check-out`, {
        token: customer.accessToken,
      })

      T.expectStatus(response, 403)
    })
  })

  describe('PUT /v1/bookings/:id/no-show - Hotel No-Show', () => {
    it('mark hotel booking as no-show - returns 200 with NO_SHOW status and frees room', async () => {
      const { booking, room } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      expect(await getRoomStatus(room.id)).toBe('OCCUPIED')

      const body = await markNoShow(sut, booking.id, owner.accessToken)

      expect(body).toMatchObject({
        id: booking.id,
        status: 'NO_SHOW',
      })

      expect(await getRoomStatus(room.id)).toBe('AVAILABLE')
    })

    it('mark hotel booking as no-show - already checked in - returns 409 conflict', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      await checkInBooking(sut, booking.id, owner.accessToken)

      const response = await T.put<ErrorResponse>(sut, `/v1/bookings/${booking.id}/no-show`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('mark hotel booking as no-show - non-staff user - returns 403 forbidden', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        nights: 4,
      })

      const response = await T.put(sut, `/v1/bookings/${booking.id}/no-show`, {
        token: customer.accessToken,
      })

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

