import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import {
  getTestApp,
  closeTestApp,
  createTestUser,
  loginTestUser,
  createTestEstablishment,
  createTestService,
  TestUser,
} from './helpers/test-client.js'

describe('ACL E2E', () => {
  let app: FastifyInstance
  let owner: TestUser
  let randomUser: TestUser
  let establishmentId: string
  let serviceId: string

  beforeAll(async () => {
    app = await getTestApp()

    // Create owner user
    owner = await createTestUser(app, {
      email: 'owner-acl@example.com',
      password: 'Test1234!',
      name: 'ACL Owner',
    })

    // Create establishment
    const establishment = await createTestEstablishment(app, owner.accessToken, {
      name: 'Test Spa ACL',
      address: '123 ACL St',
    })
    establishmentId = establishment.id

    // Re-login to get updated token with establishment roles
    const loginResult = await loginTestUser(app, {
      email: 'owner-acl@example.com',
      password: 'Test1234!',
    })
    owner.accessToken = loginResult.accessToken

    // Create service
    const service = await createTestService(app, owner.accessToken, establishmentId, {
      name: 'ACL Test Service',
      basePrice: 50,
      durationMinutes: 60,
    })
    serviceId = service.id

    // Create random user without any roles
    randomUser = await createTestUser(app, {
      email: 'random-acl@example.com',
      password: 'Test1234!',
      name: 'Random User',
    })
  })

  afterAll(async () => {
    await closeTestApp()
  })

  describe('Establishment Management', () => {
    it('should allow owner to update establishment', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/v1/establishments/${establishmentId}`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
        payload: {
          name: 'Updated Spa ACL',
        },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.name).toBe('Updated Spa ACL')
    })

    it('should deny random user from updating establishment', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/v1/establishments/${establishmentId}`,
        headers: { authorization: `Bearer ${randomUser.accessToken}` },
        payload: {
          name: 'Hacked Name',
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should allow anyone to view establishment', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/establishments/${establishmentId}`,
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('Service Management', () => {
    it('should allow owner to create service', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/establishments/${establishmentId}/services`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
        payload: {
          name: 'New ACL Service',
          basePrice: 30,
          durationMinutes: 30,
          capacity: 1,
        },
      })

      expect(response.statusCode).toBe(201)
    })

    it('should deny random user from creating service', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/establishments/${establishmentId}/services`,
        headers: { authorization: `Bearer ${randomUser.accessToken}` },
        payload: {
          name: 'Hacked Service',
          basePrice: 30,
          durationMinutes: 30,
          capacity: 1,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should allow owner to update service', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/v1/services/${serviceId}`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
        payload: {
          basePrice: 60,
        },
      })

      expect(response.statusCode).toBe(200)
    })

    it('should deny random user from updating service', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/v1/services/${serviceId}`,
        headers: { authorization: `Bearer ${randomUser.accessToken}` },
        payload: {
          basePrice: 1,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should allow anyone to view services', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/establishments/${establishmentId}/services`,
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('Availability Management', () => {
    it('should allow owner to create availability', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/services/${serviceId}/availabilities`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
        payload: {
          date: '2025-03-15',
          startTime: '09:00',
          endTime: '10:00',
          capacity: 5,
        },
      })

      expect(response.statusCode).toBe(201)
    })

    it('should deny random user from creating availability', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/services/${serviceId}/availabilities`,
        headers: { authorization: `Bearer ${randomUser.accessToken}` },
        payload: {
          date: '2025-03-16',
          startTime: '09:00',
          endTime: '10:00',
          capacity: 5,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should allow anyone to view availabilities', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/services/${serviceId}/availabilities`,
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('Extra Items Management', () => {
    it('should allow owner to create extra item', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/services/${serviceId}/extras`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
        payload: {
          name: 'ACL Extra',
          price: 10,
          maxQuantity: 1,
        },
      })

      expect(response.statusCode).toBe(201)
    })

    it('should deny random user from creating extra item', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/services/${serviceId}/extras`,
        headers: { authorization: `Bearer ${randomUser.accessToken}` },
        payload: {
          name: 'Hacked Extra',
          price: 10,
          maxQuantity: 1,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should allow anyone to view extras', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/services/${serviceId}/extras`,
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('Unauthenticated Access', () => {
    it('should deny creating establishment without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/establishments',
        payload: {
          name: 'Unauth Establishment',
          address: '123 Unauth St',
          timezone: 'UTC',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should deny creating service without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/establishments/${establishmentId}/services`,
        payload: {
          name: 'Unauth Service',
          basePrice: 50,
          durationMinutes: 60,
          capacity: 1,
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should deny creating booking without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        payload: {
          serviceId,
          availabilityId: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
        },
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
