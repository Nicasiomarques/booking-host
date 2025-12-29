import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

interface Service {
  id: string
  name: string
  basePrice: number
  durationMinutes: number
  capacity: number
  type: 'SERVICE' | 'HOTEL'
  active: boolean
  establishmentId: string
}

describe('Service Hotel E2E', () => {
  let sut: FastifyInstance
  let owner: T.TestUser
  let establishmentId: string

  beforeAll(async () => {
    sut = await T.getTestApp()

    // Create owner
    owner = await T.createTestUser(sut, {
      email: T.uniqueEmail('service-hotel-owner'),
      password: 'Test1234!',
      name: 'Service Hotel Owner',
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
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('POST /v1/establishments/:establishmentId/services - Create Hotel Service', () => {
    it('create service with type HOTEL - returns 201 with HOTEL type', async () => {
      const serviceData = {
        name: 'Deluxe Suite',
        description: 'Luxury suite with ocean view',
        basePrice: 200,
        durationMinutes: 1440,
        capacity: 2,
        type: 'HOTEL' as const,
      }

      const response = await T.post<Service>(
        sut,
        `/v1/establishments/${establishmentId}/services`,
        {
          token: owner.accessToken,
          payload: serviceData,
        }
      )

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        name: 'Deluxe Suite',
        basePrice: 200,
        durationMinutes: 1440,
        capacity: 2,
        type: 'HOTEL',
        active: true,
        establishmentId,
      })
    })

    it('create service without type - defaults to SERVICE', async () => {
      const serviceData = {
        name: 'Regular Service',
        basePrice: 50,
        durationMinutes: 60,
        capacity: 1,
      }

      const response = await T.post<Service>(
        sut,
        `/v1/establishments/${establishmentId}/services`,
        {
          token: owner.accessToken,
          payload: serviceData,
        }
      )

      const body = T.expectStatus(response, 201)
      expect(body.type).toBe('SERVICE')
    })
  })

  describe('GET /v1/services/:id - Get Service with Type', () => {
    it('get service by id - returns service with type field', async () => {
      const hotelService = await T.createTestService(sut, owner.accessToken, establishmentId, {
        name: 'Hotel Room',
        basePrice: 100,
        durationMinutes: 1440,
        type: 'HOTEL',
      })

      const response = await T.get<Service>(sut, `/v1/services/${hotelService.id}`)

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: hotelService.id,
        type: 'HOTEL',
      })
    })
  })

  describe('GET /v1/establishments/:establishmentId/services - List Services', () => {
    it('list services - includes type field in response', async () => {
      await T.createTestService(sut, owner.accessToken, establishmentId, {
        name: 'Hotel Service',
        basePrice: 100,
        durationMinutes: 1440,
        type: 'HOTEL',
      })
      await T.createTestService(sut, owner.accessToken, establishmentId, {
        name: 'Regular Service',
        basePrice: 50,
        durationMinutes: 60,
        type: 'SERVICE',
      })

      const response = await T.get<Service[]>(
        sut,
        `/v1/establishments/${establishmentId}/services`
      )

      const body = T.expectStatus(response, 200)
      expect(body.length).toBeGreaterThanOrEqual(2)
      body.forEach((service) => {
        expect(service).toHaveProperty('type')
        expect(['SERVICE', 'HOTEL']).toContain(service.type)
      })
    })
  })

  describe('PUT /v1/services/:id - Update Service Type', () => {
    it('update service type - returns 200 with updated type', async () => {
      const service = await T.createTestService(sut, owner.accessToken, establishmentId, {
        name: 'Original Service',
        basePrice: 50,
        durationMinutes: 60,
        type: 'SERVICE',
      })

      const response = await T.put<Service>(sut, `/v1/services/${service.id}`, {
        token: owner.accessToken,
        payload: {
          type: 'HOTEL',
        },
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: service.id,
        type: 'HOTEL',
      })
    })
  })
})

