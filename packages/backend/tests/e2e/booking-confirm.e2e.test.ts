import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

describe('Booking Confirm E2E', () => {
  let sut: FastifyInstance
  let owner: T.TestUser
  let customer: T.TestUser
  let establishmentId: string
  let serviceId: string

  beforeAll(async () => {
    sut = await T.getTestApp()

    // Create owner
    owner = await T.createTestUser(sut, {
      email: T.uniqueEmail('confirm-owner'),
      password: 'Test1234!',
      name: 'Confirm Owner',
    })

    // Create establishment
    const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
      name: 'Test Establishment',
      address: '123 Test St',
    })
    establishmentId = establishment.id

    // Login owner
    const loginResult = await T.loginTestUser(sut, {
      email: owner.email,
      password: 'Test1234!',
    })
    owner.accessToken = loginResult.accessToken

    // Create service
    const service = await T.createTestService(sut, owner.accessToken, establishmentId, {
      name: 'Test Service',
      basePrice: 50,
      durationMinutes: 60,
      capacity: 1,
    })
    serviceId = service.id

    // Create customer
    customer = await T.createTestUser(sut, {
      email: T.uniqueEmail('confirm-customer'),
      password: 'Test1234!',
      name: 'Confirm Customer',
    })
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('PUT /v1/bookings/:id/confirm', () => {
    it('confirm booking - already confirmed - returns 409 conflict', async () => {
      const availability = await T.createTestAvailability(sut, owner.accessToken, serviceId, {
        date: '2025-12-20',
        startTime: '09:00',
        endTime: '10:00',
        capacity: 1,
      })

      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId,
        availabilityId: availability.id,
      })

      expect(booking.status).toBe('CONFIRMED')

      const getResponse = await T.get<{ confirmedAt: string | null }>(sut, `/v1/bookings/${booking.id}`, {
        token: owner.accessToken,
      })
      const bookingDetails = T.expectStatus(getResponse, 200)
      expect(bookingDetails.confirmedAt).toBeTruthy()

      const response = await T.put<{ error?: { code?: string } }>(sut, `/v1/bookings/${booking.id}/confirm`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('confirm booking - cancelled booking - returns 409 conflict', async () => {
      const availability = await T.createTestAvailability(sut, owner.accessToken, serviceId, {
        date: '2025-12-21',
        startTime: '09:00',
        endTime: '10:00',
        capacity: 1,
      })

      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId,
        availabilityId: availability.id,
      })

      await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      const response = await T.put<{ error?: { code?: string } }>(sut, `/v1/bookings/${booking.id}/confirm`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('confirm booking - by customer - returns 403 forbidden', async () => {
      const availability = await T.createTestAvailability(sut, owner.accessToken, serviceId, {
        date: '2025-12-22',
        startTime: '09:00',
        endTime: '10:00',
        capacity: 1,
      })

      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId,
        availabilityId: availability.id,
      })

      const response = await T.put(sut, `/v1/bookings/${booking.id}/confirm`, {
        token: customer.accessToken,
      })

      T.expectStatus(response, 403)
    })

    it('confirm booking - non-existent - returns 404 not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      const response = await T.put(sut, `/v1/bookings/${nonExistentId}/confirm`, {
        token: owner.accessToken,
      })
      T.expectStatus(response, 404)
    })
  })
})

