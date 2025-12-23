import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import {
  getTestApp,
  closeTestApp,
  createTestUser,
  loginTestUser,
  createTestEstablishment,
  createTestService,
  createTestAvailability,
  createTestExtraItem,
  TestUser,
} from './helpers/test-client.js'

describe('Booking E2E', () => {
  let app: FastifyInstance
  let owner: TestUser
  let customer: TestUser
  let establishmentId: string
  let serviceId: string
  let availabilityId: string
  let extraItemId: string

  beforeAll(async () => {
    app = await getTestApp()

    // Create owner user
    owner = await createTestUser(app, {
      email: 'owner-booking@example.com',
      password: 'Test1234!',
      name: 'Booking Owner',
    })

    // Create establishment
    const establishment = await createTestEstablishment(app, owner.accessToken, {
      name: 'Test Spa Bookings',
      address: '123 Booking St',
    })
    establishmentId = establishment.id

    // Re-login to get updated token with establishment roles
    const loginResult = await loginTestUser(app, {
      email: 'owner-booking@example.com',
      password: 'Test1234!',
    })
    owner.accessToken = loginResult.accessToken

    // Create service
    const service = await createTestService(app, owner.accessToken, establishmentId, {
      name: 'Massage Therapy',
      basePrice: 50,
      durationMinutes: 60,
      capacity: 1,
    })
    serviceId = service.id

    // Create availability
    const availability = await createTestAvailability(app, owner.accessToken, serviceId, {
      date: '2025-02-15',
      startTime: '09:00',
      endTime: '10:00',
      capacity: 5,
    })
    availabilityId = availability.id

    // Create extra item
    const extraItem = await createTestExtraItem(app, owner.accessToken, serviceId, {
      name: 'Hot Stones',
      price: 15,
      maxQuantity: 2,
    })
    extraItemId = extraItem.id

    // Create customer user
    customer = await createTestUser(app, {
      email: 'customer-booking@example.com',
      password: 'Test1234!',
      name: 'Booking Customer',
    })
  })

  afterAll(async () => {
    await closeTestApp()
  })

  describe('POST /v1/bookings', () => {
    it('should create booking successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { authorization: `Bearer ${customer.accessToken}` },
        payload: {
          serviceId,
          availabilityId,
          quantity: 1,
        },
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.id).toBeDefined()
      expect(body.status).toBe('CONFIRMED')
      expect(body.totalPrice).toBe('50')
      expect(body.quantity).toBe(1)
    })

    it('should create booking with extras', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { authorization: `Bearer ${customer.accessToken}` },
        payload: {
          serviceId,
          availabilityId,
          quantity: 1,
          extras: [{ extraItemId, quantity: 1 }],
        },
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.totalPrice).toBe('65') // 50 + 15
    })

    it('should fail when capacity is exceeded', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { authorization: `Bearer ${customer.accessToken}` },
        payload: {
          serviceId,
          availabilityId,
          quantity: 10, // More than available
        },
      })

      expect(response.statusCode).toBe(409)

      const body = JSON.parse(response.body)
      expect(body.error.code).toBe('CONFLICT')
    })

    it('should fail without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        payload: {
          serviceId,
          availabilityId,
          quantity: 1,
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should fail with invalid serviceId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { authorization: `Bearer ${customer.accessToken}` },
        payload: {
          serviceId: '00000000-0000-0000-0000-000000000000',
          availabilityId,
          quantity: 1,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('GET /v1/bookings/:id', () => {
    let bookingId: string

    beforeAll(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { authorization: `Bearer ${customer.accessToken}` },
        payload: {
          serviceId,
          availabilityId,
          quantity: 1,
        },
      })
      bookingId = JSON.parse(response.body).id
    })

    it('should get booking by owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${bookingId}`,
        headers: { authorization: `Bearer ${customer.accessToken}` },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.id).toBe(bookingId)
      expect(body.service).toBeDefined()
      expect(body.availability).toBeDefined()
    })

    it('should get booking by establishment owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${bookingId}`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
      })

      expect(response.statusCode).toBe(200)
    })

    it('should fail for unauthorized user', async () => {
      const otherUser = await createTestUser(app, {
        email: 'other-booking@example.com',
        password: 'Test1234!',
        name: 'Other User',
      })

      const response = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${bookingId}`,
        headers: { authorization: `Bearer ${otherUser.accessToken}` },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('GET /v1/bookings/my', () => {
    it('should get user bookings with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/bookings/my?page=1&limit=10',
        headers: { authorization: `Bearer ${customer.accessToken}` },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data).toBeInstanceOf(Array)
      expect(body.total).toBeGreaterThan(0)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(10)
    })
  })

  describe('GET /v1/establishments/:id/bookings', () => {
    it('should get establishment bookings for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/establishments/${establishmentId}/bookings`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data).toBeInstanceOf(Array)
    })

    it('should fail for non-staff user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/establishments/${establishmentId}/bookings`,
        headers: { authorization: `Bearer ${customer.accessToken}` },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('PUT /v1/bookings/:id/cancel', () => {
    it('should cancel booking and restore capacity', async () => {
      // Create a booking first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { authorization: `Bearer ${customer.accessToken}` },
        payload: {
          serviceId,
          availabilityId,
          quantity: 1,
        },
      })
      const booking = JSON.parse(createResponse.body)

      // Get capacity before cancel
      const beforeResponse = await app.inject({
        method: 'GET',
        url: `/v1/services/${serviceId}/availabilities`,
      })
      const beforeAvailability = JSON.parse(beforeResponse.body)[0]

      // Cancel
      const cancelResponse = await app.inject({
        method: 'PUT',
        url: `/v1/bookings/${booking.id}/cancel`,
        headers: { authorization: `Bearer ${customer.accessToken}` },
      })

      expect(cancelResponse.statusCode).toBe(200)

      const cancelledBooking = JSON.parse(cancelResponse.body)
      expect(cancelledBooking.status).toBe('CANCELLED')

      // Check capacity restored
      const afterResponse = await app.inject({
        method: 'GET',
        url: `/v1/services/${serviceId}/availabilities`,
      })
      const afterAvailability = JSON.parse(afterResponse.body)[0]
      expect(afterAvailability.capacity).toBe(beforeAvailability.capacity + 1)
    })

    it('should fail to cancel already cancelled booking', async () => {
      // Create and cancel a booking
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { authorization: `Bearer ${customer.accessToken}` },
        payload: {
          serviceId,
          availabilityId,
          quantity: 1,
        },
      })
      const booking = JSON.parse(createResponse.body)

      await app.inject({
        method: 'PUT',
        url: `/v1/bookings/${booking.id}/cancel`,
        headers: { authorization: `Bearer ${customer.accessToken}` },
      })

      // Try to cancel again
      const response = await app.inject({
        method: 'PUT',
        url: `/v1/bookings/${booking.id}/cancel`,
        headers: { authorization: `Bearer ${customer.accessToken}` },
      })

      expect(response.statusCode).toBe(409)
    })
  })
})
