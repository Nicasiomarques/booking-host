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
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'get-service')

      // Act
      const response = await T.get<Service>(sut, `/v1/services/${setup.serviceId}`)

      // Assert
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
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      // Act
      const response = await T.get(sut, `/v1/services/${nonExistentId}`)

      // Assert
      T.expectStatus(response, 404)
    })
  })

  describe('GET /v1/establishments/:establishmentId/services', () => {
    it('list services - with active filter - returns 200 with only active services', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'list-active')

      // Act
      const response = await T.get<Service[]>(
        sut,
        `/v1/establishments/${setup.establishmentId}/services`,
        { query: { active: 'true' } }
      )

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.every((s) => s.active === true)).toBe(true)
    })

    it('list services - without filter - returns 200 with all services', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'list-all')

      // Act
      const response = await T.get<Service[]>(
        sut,
        `/v1/establishments/${setup.establishmentId}/services`
      )

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('POST /v1/establishments/:establishmentId/services', () => {
    it('create service - by owner with valid data - returns 201 with service details', async () => {
      // Arrange
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

      // Act
      const response = await T.post<Service>(
        sut,
        `/v1/establishments/${establishment.id}/services`,
        {
          token: login.accessToken,
          payload: serviceData,
        }
      )

      // Assert
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
      // Arrange
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

      // Act
      const response = await T.post<Service>(
        sut,
        `/v1/establishments/${establishment.id}/services`,
        {
          token: login.accessToken,
          payload: serviceData,
        }
      )

      // Assert
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
      // Arrange
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

      // Act
      const response = await T.post(sut, `/v1/establishments/${establishment.id}/services`, {
        token: randomUser.accessToken,
        payload: T.defaultServiceData({ name: 'Hacked Service' }),
      })

      // Assert
      T.expectStatus(response, 403)
    })
  })

  describe('PUT /v1/services/:id', () => {
    it('update service - by owner - returns 200 with updated data', async () => {
      // Arrange
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

      // Act
      const response = await T.put<Service>(sut, `/v1/services/${serviceToUpdate.id}`, {
        token: setup.owner.accessToken,
        payload: updateData,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: serviceToUpdate.id,
        name: 'Updated Service Name',
        basePrice: 150,
      })
    })

    it('update service - with optional fields - returns 200 with updated optional fields', async () => {
      // Arrange
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

      // Act
      const response = await T.put<Service>(sut, `/v1/services/${serviceToUpdate.id}`, {
        token: setup.owner.accessToken,
        payload: updateData,
      })

      // Assert
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

    it('update service - by random user - returns 403 forbidden', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'update-forbidden')
      const randomUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('random-update-service'),
        password: 'Test1234!',
        name: 'Random User',
      })

      // Act
      const response = await T.put(sut, `/v1/services/${setup.serviceId}`, {
        token: randomUser.accessToken,
        payload: { name: 'Hacked Name' },
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('update service - no authentication - returns 401 unauthorized', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'update-unauth')

      // Act
      const response = await T.put(sut, `/v1/services/${setup.serviceId}`, {
        payload: { name: 'No Auth' },
      })

      // Assert
      T.expectStatus(response, 401)
    })
  })

  describe('DELETE /v1/services/:id', () => {
    it('delete service - by owner - returns 200 and sets service as inactive', async () => {
      // Arrange
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

      // Act
      const response = await T.del<{ success: boolean }>(sut, `/v1/services/${serviceToDelete.id}`, {
        token: setup.owner.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({ success: true })

      // Verify service is now inactive (soft delete)
      const getResponse = await T.get<Service>(sut, `/v1/services/${serviceToDelete.id}`)
      const service = T.expectStatus(getResponse, 200)
      expect(service.active).toBe(false)
    })

    it('delete service - by random user - returns 403 forbidden', async () => {
      // Arrange
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

      // Act
      const response = await T.del(sut, `/v1/services/${serviceToProtect.id}`, {
        token: randomUser.accessToken,
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('delete service - no authentication - returns 401 unauthorized', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'delete-unauth')

      // Act
      const response = await T.del(sut, `/v1/services/${setup.serviceId}`)

      // Assert
      T.expectStatus(response, 401)
    })

    it('delete service - non-existent id - returns 404 not found', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'delete-notfound')
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      // Act
      const response = await T.del(sut, `/v1/services/${nonExistentId}`, {
        token: setup.owner.accessToken,
      })

      // Assert
      T.expectStatus(response, 404)
    })
  })
})
