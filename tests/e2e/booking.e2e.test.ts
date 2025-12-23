import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

interface Booking {
  id: string
  status: string
  totalPrice: number
  quantity: number
  service?: unknown
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

describe('Booking E2E', () => {
  let sut: FastifyInstance
  let setup: T.TestEstablishmentSetup
  let customer: T.TestUser

  beforeAll(async () => {
    sut = await T.getTestApp()
    setup = await T.setupTestEstablishment(sut, 'booking', { includeExtraItem: true })
    customer = await T.createTestUser(sut, {
      email: T.uniqueEmail('customer-booking'),
      password: 'Test1234!',
      name: 'Booking Customer',
    })
  })

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('POST /v1/bookings', () => {
    it('should create booking successfully', async () => {
      const response = await T.post<Booking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: {
          serviceId: setup.serviceId,
          availabilityId: setup.availabilityId,
          quantity: 1,
        },
      })

      const body = T.expectStatus(response, 201)
      expect(body.id).toBeDefined()
      expect(body.status).toBe('CONFIRMED')
      expect(body.totalPrice).toBe(50)
      expect(body.quantity).toBe(1)
    })

    it('should create booking with extras', async () => {
      const response = await T.post<Booking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: {
          serviceId: setup.serviceId,
          availabilityId: setup.availabilityId,
          quantity: 1,
          extras: [{ extraItemId: setup.extraItemId, quantity: 1 }],
        },
      })

      const body = T.expectStatus(response, 201)
      expect(body.totalPrice).toBe(65) // 50 + 15
    })

    it('should fail when capacity is exceeded', async () => {
      const response = await T.post<{ error?: { code?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: {
          serviceId: setup.serviceId,
          availabilityId: setup.availabilityId,
          quantity: 100, // More than available
        },
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('should fail without authentication', async () => {
      const response = await T.post(sut, '/v1/bookings', {
        payload: {
          serviceId: setup.serviceId,
          availabilityId: setup.availabilityId,
          quantity: 1,
        },
      })

      T.expectStatus(response, 401)
    })

    it('should fail with invalid serviceId', async () => {
      const response = await T.post(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: {
          serviceId: '00000000-0000-0000-0000-000000000000',
          availabilityId: setup.availabilityId,
          quantity: 1,
        },
      })

      T.expectStatus(response, 404)
    })
  })

  describe('GET /v1/bookings/:id', () => {
    let bookingId: string

    beforeAll(async () => {
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })
      bookingId = booking.id
    })

    it('should get booking by owner', async () => {
      const response = await T.get<Booking>(sut, `/v1/bookings/${bookingId}`, {
        token: customer.accessToken,
      })

      const body = T.expectStatus(response, 200)
      expect(body.id).toBe(bookingId)
      expect(body.service).toBeDefined()
    })

    it('should get booking by establishment owner', async () => {
      const response = await T.get(sut, `/v1/bookings/${bookingId}`, {
        token: setup.owner.accessToken,
      })

      T.expectStatus(response, 200)
    })

    it('should fail for unauthorized user', async () => {
      const otherUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('other'),
        password: 'Test1234!',
        name: 'Other User',
      })

      const response = await T.get(sut, `/v1/bookings/${bookingId}`, {
        token: otherUser.accessToken,
      })

      T.expectStatus(response, 403)
    })
  })

  describe('GET /v1/bookings/my', () => {
    it('should get user bookings with pagination', async () => {
      const response = await T.get<PaginatedResponse<Booking>>(sut, '/v1/bookings/my', {
        token: customer.accessToken,
        query: { page: 1, limit: 10 },
      })

      const body = T.expectStatus(response, 200)
      expect(body.data).toBeInstanceOf(Array)
      expect(body.total).toBeGreaterThan(0)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(10)
    })
  })

  describe('GET /v1/establishments/:id/bookings', () => {
    it('should get establishment bookings for owner', async () => {
      const response = await T.get<PaginatedResponse<Booking>>(sut, `/v1/establishments/${setup.establishmentId}/bookings`, {
        token: setup.owner.accessToken,
      })

      const body = T.expectStatus(response, 200)
      expect(body.data).toBeInstanceOf(Array)
    })

    it('should fail for non-staff user', async () => {
      const response = await T.get(sut, `/v1/establishments/${setup.establishmentId}/bookings`, {
        token: customer.accessToken,
      })

      T.expectStatus(response, 403)
    })
  })

  describe('PUT /v1/bookings/:id/cancel', () => {
    it('should cancel booking and restore capacity', async () => {
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })

      const beforeResponse = await T.get<{ capacity: number }[]>(sut, `/v1/services/${setup.serviceId}/availabilities`)
      const beforeAvailability = beforeResponse.body[0]

      const cancelResponse = await T.put<Booking>(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      const cancelledBooking = T.expectStatus(cancelResponse, 200)
      expect(cancelledBooking.status).toBe('CANCELLED')

      const afterResponse = await T.get<{ capacity: number }[]>(sut, `/v1/services/${setup.serviceId}/availabilities`)
      const afterAvailability = afterResponse.body[0]
      expect(afterAvailability.capacity).toBe(beforeAvailability.capacity + 1)
    })

    it('should fail to cancel already cancelled booking', async () => {
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })

      await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      const response = await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      T.expectStatus(response, 409)
    })
  })
})
