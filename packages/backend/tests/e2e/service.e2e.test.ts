import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

interface Service {
  id: string
  name: string
  description?: string
  basePrice: number
  durationMinutes: number
  capacity: number
  active: boolean
  establishmentId: string
  images?: string[] | null
  cancellationPolicy?: string | null
  minimumAdvanceBooking?: number | null
  maximumAdvanceBooking?: number | null
  requiresConfirmation?: boolean | null
  createdAt: string
  updatedAt: string
}

describe('Service E2E', () => {
  let sut: FastifyInstance

  beforeAll(async () => {
    sut = await T.getTestApp()
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('GET /v1/services/:id', () => {
    it('get service by id - valid id - returns 200 with service details', async () => {
      const setup = await T.setupTestEstablishment(sut, 'get-service')
      const response = await T.get<Service>(sut, `/v1/services/${setup.serviceId}`)

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: setup.serviceId,
        name: expect.any(String),
        basePrice: 50,
        durationMinutes: 60,
        capacity: 1,
        active: true,
        establishmentId: setup.establishmentId,
      })
    })

    it('get service by id - non-existent id - returns 404 not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      const response = await T.get(sut, `/v1/services/${nonExistentId}`)
      T.expectStatus(response, 404)
    })
  })

  describe('GET /v1/establishments/:establishmentId/services', () => {
    it.each([
      ['with active filter', { active: 'true' }, (body: Service[]) => {
        expect(body.every((s) => s.active === true)).toBe(true)
      }],
      ['without filter', undefined, (body: Service[]) => {
        expect(body.length).toBeGreaterThanOrEqual(1)
      }],
    ])('list services - %s - returns 200', async (_, query, assertFn) => {
      const setup = await T.setupTestEstablishment(sut, `list-${query ? 'active' : 'all'}`)
      const response = await T.get<Service[]>(
        sut,
        `/v1/establishments/${setup.establishmentId}/services`,
        query ? { query } : undefined
      )

      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      assertFn(body)
    })
  })

  describe('POST /v1/establishments/:establishmentId/services', () => {
    it('create service - by owner with valid data - returns 201 with service details', async () => {
      const email = T.uniqueEmail('create-service-owner')
      const owner = await T.createTestUser(sut, {
        email,
        password: 'Test1234!',
        name: 'Service Owner',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'Service Test Establishment',
        address: '123 Test St',
      })
      const login = await T.loginTestUser(sut, { email, password: 'Test1234!' })
      const serviceData = {
        name: 'Premium Service',
        description: 'A premium service',
        basePrice: 100,
        durationMinutes: 90,
        capacity: 2,
      }

      const response = await T.post<Service>(
        sut,
        `/v1/establishments/${establishment.id}/services`,
        {
          token: login.accessToken,
          payload: serviceData,
        }
      )

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        name: 'Premium Service',
        description: 'A premium service',
        basePrice: 100,
        durationMinutes: 90,
        capacity: 2,
        active: true,
        establishmentId: establishment.id,
      })
    })

    it('create service - with optional fields - returns 201 with all fields', async () => {
      const email = T.uniqueEmail('create-service-optional')
      const owner = await T.createTestUser(sut, {
        email,
        password: 'Test1234!',
        name: 'Service Owner',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'Test Establishment',
        address: '123 Test St',
      })
      const login = await T.loginTestUser(sut, { email, password: 'Test1234!' })
      const serviceData = {
        name: 'Complete Service',
        description: 'Service with all optional fields',
        basePrice: 150,
        durationMinutes: 120,
        capacity: 3,
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        cancellationPolicy: 'Free cancellation up to 24h before',
        minimumAdvanceBooking: 2,
        maximumAdvanceBooking: 90,
        requiresConfirmation: true,
      }

      const response = await T.post<Service>(
        sut,
        `/v1/establishments/${establishment.id}/services`,
        {
          token: login.accessToken,
          payload: serviceData,
        }
      )

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        name: 'Complete Service',
        description: 'Service with all optional fields',
        basePrice: 150,
        durationMinutes: 120,
        capacity: 3,
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        cancellationPolicy: 'Free cancellation up to 24h before',
        minimumAdvanceBooking: 2,
        maximumAdvanceBooking: 90,
        requiresConfirmation: true,
        active: true,
        establishmentId: establishment.id,
      })
    })

    it('create service - by non-owner - returns 403 forbidden', async () => {
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('service-owner'),
        password: 'Test1234!',
        name: 'Owner',
      })
      const randomUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('service-random'),
        password: 'Test1234!',
        name: 'Random',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'Protected Establishment',
        address: '123 Test St',
      })

      const response = await T.post(sut, `/v1/establishments/${establishment.id}/services`, {
        token: randomUser.accessToken,
        payload: T.defaultServiceData({ name: 'Hacked Service' }),
      })

      T.expectStatus(response, 403)
    })
  })

  describe('PUT /v1/services/:id', () => {
    it('update service - by owner - returns 200 with updated data', async () => {
      const setup = await T.setupTestEstablishment(sut, 'update-service')
      const serviceToUpdate = await T.createTestService(
        sut,
        setup.owner.accessToken,
        setup.establishmentId,
        {
          name: 'Original Service',
          basePrice: 100,
          durationMinutes: 30,
        }
      )
      const updateData = {
        name: 'Updated Service Name',
        basePrice: 150,
      }

      const response = await T.put<Service>(sut, `/v1/services/${serviceToUpdate.id}`, {
        token: setup.owner.accessToken,
        payload: updateData,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: serviceToUpdate.id,
        name: 'Updated Service Name',
        basePrice: 150,
      })
    })

    it('update service - with optional fields - returns 200 with updated optional fields', async () => {
      const setup = await T.setupTestEstablishment(sut, 'update-service-optional')
      const serviceToUpdate = await T.createTestService(
        sut,
        setup.owner.accessToken,
        setup.establishmentId,
        {
          name: 'Original Service',
          basePrice: 100,
          durationMinutes: 30,
        }
      )
      const updateData = {
        images: ['https://example.com/new-image.jpg'],
        cancellationPolicy: 'No cancellation allowed',
        minimumAdvanceBooking: 1,
        maximumAdvanceBooking: 60,
        requiresConfirmation: false,
      }

      const response = await T.put<Service>(sut, `/v1/services/${serviceToUpdate.id}`, {
        token: setup.owner.accessToken,
        payload: updateData,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: serviceToUpdate.id,
        images: ['https://example.com/new-image.jpg'],
        cancellationPolicy: 'No cancellation allowed',
        minimumAdvanceBooking: 1,
        maximumAdvanceBooking: 60,
        requiresConfirmation: false,
      })
    })

    it.each([
      ['by random user', async () => {
        const setup = await T.setupTestEstablishment(sut, 'update-forbidden')
        const randomUser = await T.createTestUser(sut, {
          email: T.uniqueEmail('random-update-service'),
          password: 'Test1234!',
          name: 'Random User',
        })
        return {
          serviceId: setup.serviceId,
          token: randomUser.accessToken,
          payload: { name: 'Hacked Name' },
          expectedStatus: 403,
        }
      }],
      ['no authentication', async () => {
        const setup = await T.setupTestEstablishment(sut, 'update-unauth')
        return {
          serviceId: setup.serviceId,
          token: undefined,
          payload: { name: 'No Auth' },
          expectedStatus: 401,
        }
      }],
    ])('update service - %s - returns %s', async (_, getTestData) => {
      const testData = await getTestData()
      const response = await T.put(sut, `/v1/services/${testData.serviceId}`, {
        token: testData.token,
        payload: testData.payload,
      })

      T.expectStatus(response, testData.expectedStatus)
    })
  })

  describe('DELETE /v1/services/:id', () => {
    it('delete service - by owner - returns 200 and sets service as inactive', async () => {
      const setup = await T.setupTestEstablishment(sut, 'delete-service')
      const serviceToDelete = await T.createTestService(
        sut,
        setup.owner.accessToken,
        setup.establishmentId,
        {
          name: 'Service To Delete',
          basePrice: 75,
          durationMinutes: 45,
        }
      )

      const response = await T.del<{ success: boolean }>(sut, `/v1/services/${serviceToDelete.id}`, {
        token: setup.owner.accessToken,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({ success: true })

      const getResponse = await T.get<Service>(sut, `/v1/services/${serviceToDelete.id}`)
      const service = T.expectStatus(getResponse, 200)
      expect(service.active).toBe(false)
    })

    it.each([
      ['by random user', async () => {
        const setup = await T.setupTestEstablishment(sut, 'delete-forbidden')
        const randomUser = await T.createTestUser(sut, {
          email: T.uniqueEmail('random-delete'),
          password: 'Test1234!',
          name: 'Random User',
        })
        const serviceToProtect = await T.createTestService(
          sut,
          setup.owner.accessToken,
          setup.establishmentId,
          {
            name: 'Protected Service',
            basePrice: 50,
            durationMinutes: 30,
          }
        )
        return {
          serviceId: serviceToProtect.id,
          token: randomUser.accessToken,
          expectedStatus: 403,
        }
      }],
      ['no authentication', async () => {
        const setup = await T.setupTestEstablishment(sut, 'delete-unauth')
        return {
          serviceId: setup.serviceId,
          token: undefined,
          expectedStatus: 401,
        }
      }],
    ])('delete service - %s - returns %s', async (_, getTestData) => {
      const testData = await getTestData()
      const response = await T.del(sut, `/v1/services/${testData.serviceId}`, {
        token: testData.token,
      })

      T.expectStatus(response, testData.expectedStatus)
    })

    it('delete service - non-existent id - returns 404 not found', async () => {
      const setup = await T.setupTestEstablishment(sut, 'delete-notfound')
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await T.del(sut, `/v1/services/${nonExistentId}`, {
        token: setup.owner.accessToken,
      })

      T.expectStatus(response, 404)
    })
  })
})
