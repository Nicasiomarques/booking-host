import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'
import type { ErrorResponse } from './helpers/http.js'
import { futureDate } from './helpers/factories.js'
import { createHotelBookingWithRoom, checkInBooking, checkOutBooking, markNoShow } from './helpers/hotel-operations.js'

describe('Booking No-Show Edge Cases E2E', () => {
  let sut: FastifyInstance
  let owner: T.TestUser
  let customer: T.TestUser
  let establishmentId: string
  let hotelServiceId: string
  let availabilityId: string

  beforeAll(async () => {
    sut = await T.getTestApp()

    // Create owner
    owner = await T.createTestUser(sut, {
      email: T.uniqueEmail('no-show-owner'),
      password: 'Test1234!',
      name: 'No-Show Owner',
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

    // Create availability
    const availabilityDate = futureDate(10)
    const availability = await T.createTestAvailability(sut, owner.accessToken, hotelServiceId, {
      date: availabilityDate,
      startTime: '14:00',
      endTime: '15:00',
      capacity: 1,
    })
    availabilityId = availability.id

    // Create customer
    customer = await T.createTestUser(sut, {
      email: T.uniqueEmail('no-show-customer'),
      password: 'Test1234!',
      name: 'No-Show Customer',
    })
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('PUT /v1/bookings/:id/no-show - Edge Cases', () => {
    it('mark no-show - already checked out - returns 409 conflict', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        checkInDate: futureDate(20),
        nights: 4,
      })

      await checkInBooking(sut, booking.id, owner.accessToken)
      await checkOutBooking(sut, booking.id, owner.accessToken)

      const response = await T.put<ErrorResponse>(sut, `/v1/bookings/${booking.id}/no-show`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('checked-out')
    })

    it('mark no-show - already marked as no-show - returns 409 conflict', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        checkInDate: futureDate(25),
        nights: 4,
      })

      await markNoShow(sut, booking.id, owner.accessToken)

      const response = await T.put<ErrorResponse>(sut, `/v1/bookings/${booking.id}/no-show`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('already marked as no-show')
    })

    it('mark no-show - cancelled booking - returns 409 conflict', async () => {
      const { booking } = await createHotelBookingWithRoom({
        app: sut,
        serviceId: hotelServiceId,
        availabilityId: availabilityId,
        customerToken: customer.accessToken,
        checkInDate: futureDate(30),
        nights: 4,
      })

      await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      const response = await T.put<ErrorResponse>(sut, `/v1/bookings/${booking.id}/no-show`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('cancelled')
    })
  })
})


