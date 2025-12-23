import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

describe('ACL E2E', () => {
  let sut: FastifyInstance
  let setup: T.TestEstablishmentSetup
  let randomUser: T.TestUser

  beforeAll(async () => {
    sut = await T.getTestApp()
    // Setup completo: owner, establishment, service, availability
    setup = await T.setupTestEstablishment(sut, 'acl')
    // Create random user without any roles
    randomUser = await T.createTestUser(sut, {
      email: 'random-acl@example.com',
      password: 'Test1234!',
      name: 'Random User',
    })
  })

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('Establishment Management', () => {
    it('should allow owner to update establishment', async () => {
      const response = await T.put<{ name: string }>(sut, `/v1/establishments/${setup.establishmentId}`, {
        token: setup.owner.accessToken,
        payload: { name: 'Updated Spa ACL' },
      })

      const body = T.expectStatus(response, 200)
      expect(body.name).toBe('Updated Spa ACL')
    })

    it('should deny random user from updating establishment', async () => {
      const response = await T.put(sut, `/v1/establishments/${setup.establishmentId}`, {
        token: randomUser.accessToken,
        payload: { name: 'Hacked Name' },
      })

      T.expectStatus(response, 403)
    })

    it('should allow anyone to view establishment', async () => {
      const response = await T.get(sut, `/v1/establishments/${setup.establishmentId}`)

      T.expectStatus(response, 200)
    })
  })

  describe('Service Management', () => {
    it('should allow owner to create service', async () => {
      const response = await T.post(sut, `/v1/establishments/${setup.establishmentId}/services`, {
        token: setup.owner.accessToken,
        payload: T.defaultServiceData({ name: 'New ACL Service', basePrice: 30, durationMinutes: 30 }),
      })

      T.expectStatus(response, 201)
    })

    it('should deny random user from creating service', async () => {
      const response = await T.post(sut, `/v1/establishments/${setup.establishmentId}/services`, {
        token: randomUser.accessToken,
        payload: T.defaultServiceData({ name: 'Hacked Service' }),
      })

      T.expectStatus(response, 403)
    })

    it('should allow owner to update service', async () => {
      const response = await T.put(sut, `/v1/services/${setup.serviceId}`, {
        token: setup.owner.accessToken,
        payload: { basePrice: 60 },
      })

      T.expectStatus(response, 200)
    })

    it('should deny random user from updating service', async () => {
      const response = await T.put(sut, `/v1/services/${setup.serviceId}`, {
        token: randomUser.accessToken,
        payload: { basePrice: 1 },
      })

      T.expectStatus(response, 403)
    })

    it('should allow anyone to view services', async () => {
      const response = await T.get(sut, `/v1/establishments/${setup.establishmentId}/services`)

      T.expectStatus(response, 200)
    })
  })

  describe('Availability Management', () => {
    it('should allow owner to create availability', async () => {
      const response = await T.post(sut, `/v1/services/${setup.serviceId}/availabilities`, {
        token: setup.owner.accessToken,
        payload: T.defaultAvailabilityData({ date: '2025-03-15' }),
      })

      T.expectStatus(response, 201)
    })

    it('should deny random user from creating availability', async () => {
      const response = await T.post(sut, `/v1/services/${setup.serviceId}/availabilities`, {
        token: randomUser.accessToken,
        payload: T.defaultAvailabilityData({ date: '2025-03-16' }),
      })

      T.expectStatus(response, 403)
    })

    it('should allow anyone to view availabilities', async () => {
      const response = await T.get(sut, `/v1/services/${setup.serviceId}/availabilities`)

      T.expectStatus(response, 200)
    })
  })

  describe('Extra Items Management', () => {
    it('should allow owner to create extra item', async () => {
      const response = await T.post(sut, `/v1/services/${setup.serviceId}/extras`, {
        token: setup.owner.accessToken,
        payload: { name: 'ACL Extra', price: 10, maxQuantity: 1 },
      })

      T.expectStatus(response, 201)
    })

    it('should deny random user from creating extra item', async () => {
      const response = await T.post(sut, `/v1/services/${setup.serviceId}/extras`, {
        token: randomUser.accessToken,
        payload: { name: 'Hacked Extra', price: 10, maxQuantity: 1 },
      })

      T.expectStatus(response, 403)
    })

    it('should allow anyone to view extras', async () => {
      const response = await T.get(sut, `/v1/services/${setup.serviceId}/extras`)

      T.expectStatus(response, 200)
    })
  })

  describe('Unauthenticated Access', () => {
    it('should deny creating establishment without auth', async () => {
      const response = await T.post(sut, '/v1/establishments', {
        payload: { name: 'Unauth Establishment', address: '123 Unauth St', timezone: 'UTC' },
      })

      T.expectStatus(response, 401)
    })

    it('should deny creating service without auth', async () => {
      const response = await T.post(sut, `/v1/establishments/${setup.establishmentId}/services`, {
        payload: T.defaultServiceData({ name: 'Unauth Service' }),
      })

      T.expectStatus(response, 401)
    })

    it('should deny creating booking without auth', async () => {
      const response = await T.post(sut, '/v1/bookings', {
        payload: {
          serviceId: setup.serviceId,
          availabilityId: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
        },
      })

      T.expectStatus(response, 401)
    })
  })
})
