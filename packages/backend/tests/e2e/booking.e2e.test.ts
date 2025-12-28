import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

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
      // Arrange
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        quantity: 1,
      }

      // Act
      const response = await T.post<Booking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
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
      // Arrange
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        quantity: 1,
        extras: [{ extraItemId: setup.extraItemId, quantity: 1 }],
      }

      // Act
      const response = await T.post<Booking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      expect(body.totalPrice).toBe(65) // 50 (base) + 15 (extra)
      expect(body.status).toBe('CONFIRMED')
    })

    it('create booking - with optional fields - returns 201 with all fields', async () => {
      // Arrange
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        quantity: 1,
        notes: 'Customer prefers morning appointment',
        guestPhone: '+55 11 98765-4321',
        numberOfGuests: 2,
      }

      // Act
      const response = await T.post<Booking>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
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
      // Arrange
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        quantity: 100, // More than available capacity
      }

      // Act
      const response = await T.post<{ error?: { code?: string } }>(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
    })

    it('create booking - no authentication - returns 401 unauthorized', async () => {
      // Arrange
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
        quantity: 1,
      }

      // Act
      const response = await T.post(sut, '/v1/bookings', {
        payload: bookingData,
      })

      // Assert
      T.expectStatus(response, 401)
    })

    it('create booking - non-existent service - returns 404 not found', async () => {
      // Arrange
      const bookingData = {
        serviceId: '00000000-0000-0000-0000-000000000000',
        availabilityId: setup.availabilityId,
        quantity: 1,
      }

      // Act
      const response = await T.post(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: bookingData,
      })

      // Assert
      T.expectStatus(response, 404)
    })
  })

  describe('GET /v1/bookings/:id', () => {
    it('get booking - by booking owner - returns 200 with booking and service details', async () => {
      // Arrange
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })

      // Act
      const response = await T.get<Booking>(sut, `/v1/bookings/${booking.id}`, {
        token: customer.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: booking.id,
        userId: customer.id,
        serviceId: setup.serviceId,
      })
      expect(body.service).toBeDefined()
    })

    it('get booking - by establishment owner - returns 200 with booking details', async () => {
      // Arrange
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })

      // Act
      const response = await T.get<Booking>(sut, `/v1/bookings/${booking.id}`, {
        token: setup.owner.accessToken,
      })

      // Assert
      T.expectStatus(response, 200)
    })

    it('get booking - by unauthorized user - returns 403 forbidden', async () => {
      // Arrange
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })
      const otherUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('other-user'),
        password: 'Test1234!',
        name: 'Other User',
      })

      // Act
      const response = await T.get(sut, `/v1/bookings/${booking.id}`, {
        token: otherUser.accessToken,
      })

      // Assert
      T.expectStatus(response, 403)
    })
  })

  describe('GET /v1/bookings/my', () => {
    it('get my bookings - with pagination params - returns 200 with paginated list', async () => {
      // Arrange
      await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })

      // Act
      const response = await T.get<PaginatedResponse<Booking>>(sut, '/v1/bookings/my', {
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
      expect(body.data.length).toBeGreaterThan(0)
    })
  })

  describe('GET /v1/establishments/:id/bookings', () => {
    it('get establishment bookings - by owner - returns 200 with paginated list', async () => {
      // Arrange - booking already exists from previous tests

      // Act
      const response = await T.get<PaginatedResponse<Booking>>(
        sut,
        `/v1/establishments/${setup.establishmentId}/bookings`,
        { token: setup.owner.accessToken }
      )

      // Assert
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
      // Arrange - customer is not staff

      // Act
      const response = await T.get(sut, `/v1/establishments/${setup.establishmentId}/bookings`, {
        token: customer.accessToken,
      })

      // Assert
      T.expectStatus(response, 403)
    })
  })

  describe('PUT /v1/bookings/:id/cancel', () => {
    it('cancel booking - valid booking - returns 200 with CANCELLED status and restores capacity', async () => {
      // Arrange
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
      })
      const beforeResponse = await T.get<{ capacity: number }[]>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`
      )
      const capacityBefore = beforeResponse.body[0].capacity

      // Act
      const response = await T.put<Booking>(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: booking.id,
        status: 'CANCELLED',
      })
      expect(body.cancelledAt).toBeTruthy()
      expect(new Date(body.cancelledAt!).getTime()).toBeLessThanOrEqual(Date.now())

      // Verify capacity was restored
      const afterResponse = await T.get<{ capacity: number }[]>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`
      )
      expect(afterResponse.body[0].capacity).toBe(capacityBefore + 1)
    })

    it('cancel booking - already cancelled - returns 409 conflict', async () => {
      // Arrange
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: setup.serviceId,
        availabilityId: setup.availabilityId,
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
  })
})
