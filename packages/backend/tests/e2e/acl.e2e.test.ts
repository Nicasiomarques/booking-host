import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

interface Establishment {
  id: string
  name: string
}

interface Service {
  id: string
  name: string
  basePrice: number
}

interface Availability {
  id: string
  date: string
}

interface ExtraItem {
  id: string
  name: string
  price: number
}

describe('ACL E2E @security', () => {
  let sut: FastifyInstance
  let setup: T.TestEstablishmentSetup
  let randomUser: T.TestUser

  beforeAll(async () => {
    sut = await T.getTestApp()
    setup = await T.setupTestEstablishment(sut, 'acl')
    randomUser = await T.createTestUser(sut, {
      email: T.uniqueEmail('random-acl'),
      password: 'Test1234!',
      name: 'Random User',
    })
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('Establishment Management - Authorization', () => {
    it('update establishment - by owner - returns 200 with updated data', async () => {
      // Arrange
      const updateData = { name: 'Updated Spa ACL' }

      // Act
      const response = await T.put<Establishment>(sut, `/v1/establishments/${setup.establishmentId}`, {
        token: setup.owner.accessToken,
        payload: updateData,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: setup.establishmentId,
        name: 'Updated Spa ACL',
      })
    })

    it('update establishment - by random user - returns 403 forbidden', async () => {
      // Arrange
      const updateData = { name: 'Hacked Name' }

      // Act
      const response = await T.put(sut, `/v1/establishments/${setup.establishmentId}`, {
        token: randomUser.accessToken,
        payload: updateData,
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('view establishment - without authentication - returns 200 (public endpoint)', async () => {
      // Arrange - no authentication needed

      // Act
      const response = await T.get<Establishment>(sut, `/v1/establishments/${setup.establishmentId}`)

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body.id).toBe(setup.establishmentId)
    })
  })

  describe('Service Management - Authorization', () => {
    it('create service - by owner - returns 201 with service data', async () => {
      // Arrange
      const serviceData = T.defaultServiceData({
        name: 'New ACL Service',
        basePrice: 30,
        durationMinutes: 30,
      })

      // Act
      const response = await T.post<Service>(sut, `/v1/establishments/${setup.establishmentId}/services`, {
        token: setup.owner.accessToken,
        payload: serviceData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        name: 'New ACL Service',
        basePrice: 30,
      })
    })

    it('create service - by random user - returns 403 forbidden', async () => {
      // Arrange
      const serviceData = T.defaultServiceData({ name: 'Hacked Service' })

      // Act
      const response = await T.post(sut, `/v1/establishments/${setup.establishmentId}/services`, {
        token: randomUser.accessToken,
        payload: serviceData,
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('update service - by owner - returns 200 with updated data', async () => {
      // Arrange
      const updateData = { basePrice: 60 }

      // Act
      const response = await T.put<Service>(sut, `/v1/services/${setup.serviceId}`, {
        token: setup.owner.accessToken,
        payload: updateData,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body.basePrice).toBe(60)
    })

    it('update service - by random user - returns 403 forbidden', async () => {
      // Arrange
      const updateData = { basePrice: 1 }

      // Act
      const response = await T.put(sut, `/v1/services/${setup.serviceId}`, {
        token: randomUser.accessToken,
        payload: updateData,
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('list services - without authentication - returns 200 (public endpoint)', async () => {
      // Arrange - no authentication needed

      // Act
      const response = await T.get<Service[]>(sut, `/v1/establishments/${setup.establishmentId}/services`)

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
    })
  })

  describe('Availability Management - Authorization', () => {
    it('create availability - by owner - returns 201 with availability data', async () => {
      // Arrange
      const availabilityData = T.defaultAvailabilityData({ date: '2025-03-15' })

      // Act
      const response = await T.post<Availability>(sut, `/v1/services/${setup.serviceId}/availabilities`, {
        token: setup.owner.accessToken,
        payload: availabilityData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        date: '2025-03-15',
      })
    })

    it('create availability - by random user - returns 403 forbidden', async () => {
      // Arrange
      const availabilityData = T.defaultAvailabilityData({ date: '2025-03-16' })

      // Act
      const response = await T.post(sut, `/v1/services/${setup.serviceId}/availabilities`, {
        token: randomUser.accessToken,
        payload: availabilityData,
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('list availabilities - without authentication - returns 200 (public endpoint)', async () => {
      // Arrange - no authentication needed

      // Act
      const response = await T.get<Availability[]>(sut, `/v1/services/${setup.serviceId}/availabilities`)

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
    })
  })

  describe('Extra Items Management - Authorization', () => {
    it('create extra item - by owner - returns 201 with extra item data', async () => {
      // Arrange
      const extraData = { name: 'ACL Extra', price: 10, maxQuantity: 1 }

      // Act
      const response = await T.post<ExtraItem>(sut, `/v1/services/${setup.serviceId}/extras`, {
        token: setup.owner.accessToken,
        payload: extraData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        name: 'ACL Extra',
        price: 10,
      })
    })

    it('create extra item - by random user - returns 403 forbidden', async () => {
      // Arrange
      const extraData = { name: 'Hacked Extra', price: 10, maxQuantity: 1 }

      // Act
      const response = await T.post(sut, `/v1/services/${setup.serviceId}/extras`, {
        token: randomUser.accessToken,
        payload: extraData,
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('list extras - without authentication - returns 200 (public endpoint)', async () => {
      // Arrange - no authentication needed

      // Act
      const response = await T.get<ExtraItem[]>(sut, `/v1/services/${setup.serviceId}/extras`)

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
    })
  })

  describe('Unauthenticated Access - Protected Endpoints', () => {
    it('create establishment - without authentication - returns 401 unauthorized', async () => {
      // Arrange
      const establishmentData = {
        name: 'Unauth Establishment',
        address: '123 Unauth St',
        timezone: 'UTC',
      }

      // Act
      const response = await T.post(sut, '/v1/establishments', {
        payload: establishmentData,
      })

      // Assert
      T.expectStatus(response, 401)
    })

    it('create service - without authentication - returns 401 unauthorized', async () => {
      // Arrange
      const serviceData = T.defaultServiceData({ name: 'Unauth Service' })

      // Act
      const response = await T.post(sut, `/v1/establishments/${setup.establishmentId}/services`, {
        payload: serviceData,
      })

      // Assert
      T.expectStatus(response, 401)
    })

    it('create booking - without authentication - returns 401 unauthorized', async () => {
      // Arrange
      const bookingData = {
        serviceId: setup.serviceId,
        availabilityId: '00000000-0000-0000-0000-000000000000',
        quantity: 1,
      }

      // Act
      const response = await T.post(sut, '/v1/bookings', {
        payload: bookingData,
      })

      // Assert
      T.expectStatus(response, 401)
    })
  })
})
