import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'
import type { ErrorResponse } from './helpers/http.js'

interface Booking {
  id: string
  userId: string
  serviceId: string
  availabilityId: string
  status: string
  totalPrice: number
  quantity: number
  notes?: string | null
  guestPhone?: string | null
  numberOfGuests?: number | null
  confirmedAt?: string | null
  cancelledAt?: string | null
  cancellationReason?: string | null
  checkedInAt?: string | null
  checkedOutAt?: string | null
  service?: {
    id: string
    name: string
    basePrice: number
  }
}

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

describe('Booking E2E @critical', () => {
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
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('POST /v1/bookings', () => {
    it('create booking - valid data without extras - returns 201 with CONFIRMED status and correct price', async () => {
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        quantity: 1,
      }

      const response = await T.post<Booking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        userId: customer.id,
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        status: 'CONFIRMED',
        totalPrice: 50,
        quantity: 1,
      })
    })

    it('create booking - with extra items - returns 201 with total price including extras', async () => {
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        quantity: 1,
        extras: [{ extraItemId: setup.extraItemId, quantity: 1 }],
      }

      const response = await T.post<Booking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      const body = T.expectStatus(response, 201)
      expect(body.totalPrice).toBe(65)
      expect(body.status).toBe('CONFIRMED')
    })

    it('create booking - with optional fields - returns 201 with all fields', async () => {
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        quantity: 1,
        notes: 'Customer prefers morning appointment',
        guestPhone: '+55 11 98765-4321',
        numberOfGuests: 2,
      }

      const response = await T.post<Booking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        userId: customer.id,
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        status: 'CONFIRMED',
        totalPrice: 50,
        quantity: 1,
        notes: 'Customer prefers morning appointment',
        guestPhone: '+55 11 98765-4321',
        numberOfGuests: 2,
      })
      expect(body.confirmedAt).toBeTruthy()
      expect(new Date(body.confirmedAt!).getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('create booking - quantity exceeds capacity - returns 409 conflict', async () => {
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        quantity: 100,
      }

      const response = await T.post<ErrorResponse>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('create booking - no authentication - returns 401 unauthorized', async () => {
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        quantity: 1,
      }

      const response = await T.post(sut, '/v1/bookings', {
        payload: bookingData,
      })

      T.expectStatus(response, 401)
    })

    it('create booking - non-existent service - returns 404 not found', async () => {
      const bookingData = {
        serviceId: '00000000-0000-0000-0000-000000000000',
        availabilityId: setup.availabilityId,
        quantity: 1,
      }

      const response = await T.post(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      T.expectStatus(response, 404)
    })

    it('create booking - non-existent availability - returns 404 not found', async () => {
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: '00000000-0000-0000-0000-000000000000',
        quantity: 1,
      }

      const response = await T.post(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      T.expectStatus(response, 404)
    })

    it('create booking - availability does not belong to service - returns 409 conflict', async () => {
      const otherSetup = await T.setupTestEstablishment(sut, 'other-service')
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: otherSetup.availabilityId,
        quantity: 1,
      }

      const response = await T.post<ErrorResponse>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('Availability does not belong')
    })

    it('create booking - inactive service - returns 409 conflict', async () => {
      const inactiveService = await T.createTestService(sut, setup.owner.accessToken, setup.establishmentId, {
        name: 'Inactive Service',
        basePrice: 50,
        durationMinutes: 60,
      })
      await T.del(sut, `/v1/services/${inactiveService.id}`, {
        token: setup.owner.accessToken,
      })
      const availability = await T.createTestAvailability(sut, setup.owner.accessToken, inactiveService.id, {
        date: '2025-12-01',
        startTime: '09:00',
        endTime: '10:00',
        capacity: 1,
      })

      const bookingData = {
        serviceId: inactiveService.id,
        availabilityId: availability.id,
        quantity: 1,
      }

      const response = await T.post<ErrorResponse>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('not active')
    })

    it('create booking - extra item quantity exceeds maxQuantity - returns 409 conflict', async () => {
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        quantity: 1,
        extras: [{ extraItemId: setup.extraItemId, quantity: 100 }],
      }

      const response = await T.post<ErrorResponse>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('exceeds maximum')
    })
  })

  describe('GET /v1/bookings/:id', () => {
    it('get booking - by booking owner - returns 200 with booking and service details', async () => {
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })

      const response = await T.get<Booking>(sut, `/v1/bookings/${booking.id}`, {
        token: customer.accessToken,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: booking.id,
        userId: customer.id,
        serviceId: setup.serviceId,
      })
      expect(body.service).toBeDefined()
    })

    it('get booking - by establishment owner - returns 200 with booking details', async () => {
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })

      const response = await T.get<Booking>(sut, `/v1/bookings/${booking.id}`, {
        token: setup.owner.accessToken,
      })

      T.expectStatus(response, 200)
    })

    it('get booking - by unauthorized user - returns 403 forbidden', async () => {
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })
      const otherUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('other-user'),
        password: 'Test1234!',
        name: 'Other User',
      })

      const response = await T.get(sut, `/v1/bookings/${booking.id}`, {
        token: otherUser.accessToken,
      })

      T.expectStatus(response, 403)
    })
  })

  describe('GET /v1/bookings/my', () => {
    it('get my bookings - with pagination params - returns 200 with paginated list', async () => {
      await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })

      const response = await T.get<PaginatedResponse<Booking>>(sut, '/v1/bookings/my', {
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
      expect(body.data.length).toBeGreaterThan(0)
    })
  })

  describe('GET /v1/establishments/:id/bookings', () => {
    it('get establishment bookings - by owner - returns 200 with paginated list', async () => {
      const response = await T.get<PaginatedResponse<Booking>>(
        sut,
        `/v1/establishments/${setup.establishmentId}/bookings`,
        { token: setup.owner.accessToken }
      )

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        data: expect.any(Array),
        meta: {
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          totalPages: expect.any(Number),
        },
      })
    })

    it('get establishment bookings - by non-staff user - returns 403 forbidden', async () => {
      const response = await T.get(sut, `/v1/establishments/${setup.establishmentId}/bookings`, {
        token: customer.accessToken,
      })

      T.expectStatus(response, 403)
    })
  })

  describe('PUT /v1/bookings/:id/cancel', () => {
    it('cancel booking - valid booking - returns 200 with CANCELLED status and restores capacity', async () => {
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })
      const beforeResponse = await T.get<{ capacity: number }[]>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`
      )
      const capacityBefore = beforeResponse.body[0].capacity

      const response = await T.put<Booking>(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: booking.id,
        status: 'CANCELLED',
      })
      expect(body.cancelledAt).toBeTruthy()
      expect(new Date(body.cancelledAt!).getTime()).toBeLessThanOrEqual(Date.now())

      const afterResponse = await T.get<{ capacity: number }[]>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`
      )
      expect(afterResponse.body[0].capacity).toBe(capacityBefore + 1)
    })

    it('cancel booking - already cancelled - returns 409 conflict', async () => {
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
