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
  let sut: FastifyInstance
  let owner: TestUser
  let randomUser: TestUser
  let establishmentId: string
  let serviceId: string

  beforeAll(async () => {
    sut = await getTestApp()

    // Create owner user
    owner = await createTestUser(sut, {
      email: 'owner-acl@example.com',
      password: 'Test1234!',
      name: 'ACL Owner',
    })

    // Create establishment
    const establishment = await createTestEstablishment(sut, owner.accessToken, {
      name: 'Test Spa ACL',
      address: '123 ACL St',
    })
    establishmentId = establishment.id

    // Re-login to get updated token with establishment roles
    const loginResult = await loginTestUser(sut, {
      email: 'owner-acl@example.com',
      password: 'Test1234!',
    })
    owner.accessToken = loginResult.accessToken

    // Create service
    const service = await createTestService(sut, owner.accessToken, establishmentId, {
      name: 'ACL Test Service',
      basePrice: 50,
      durationMinutes: 60,
    })
    serviceId = service.id

    // Create random user without any roles
    randomUser = await createTestUser(sut, {
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
      // Arrange
      const payload = { name: 'Updated Spa ACL' }

      // Act
      const response = await sut.inject({
        method: 'PUT',
        url: `/v1/establishments/${establishmentId}`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Updated Spa ACL')
    })

    it('should deny random user from updating establishment', async () => {
      // Arrange
      const payload = { name: 'Hacked Name' }

      // Act
      const response = await sut.inject({
        method: 'PUT',
        url: `/v1/establishments/${establishmentId}`,
        headers: { authorization: `Bearer ${randomUser.accessToken}` },
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(403)
    })

    it('should allow anyone to view establishment', async () => {
      // Arrange - no setup needed

      // Act
      const response = await sut.inject({
        method: 'GET',
        url: `/v1/establishments/${establishmentId}`,
      })

      // Assert
      expect(response.statusCode).toBe(200)
    })
  })

  describe('Service Management', () => {
    it('should allow owner to create service', async () => {
      // Arrange
      const payload = {
        name: 'New ACL Service',
        basePrice: 30,
        durationMinutes: 30,
        capacity: 1,
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: `/v1/establishments/${establishmentId}/services`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(201)
    })

    it('should deny random user from creating service', async () => {
      // Arrange
      const payload = {
        name: 'Hacked Service',
        basePrice: 30,
        durationMinutes: 30,
        capacity: 1,
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: `/v1/establishments/${establishmentId}/services`,
        headers: { authorization: `Bearer ${randomUser.accessToken}` },
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(403)
    })

    it('should allow owner to update service', async () => {
      // Arrange
      const payload = { basePrice: 60 }

      // Act
      const response = await sut.inject({
        method: 'PUT',
        url: `/v1/services/${serviceId}`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(200)
    })

    it('should deny random user from updating service', async () => {
      // Arrange
      const payload = { basePrice: 1 }

      // Act
      const response = await sut.inject({
        method: 'PUT',
        url: `/v1/services/${serviceId}`,
        headers: { authorization: `Bearer ${randomUser.accessToken}` },
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(403)
    })

    it('should allow anyone to view services', async () => {
      // Arrange - no setup needed

      // Act
      const response = await sut.inject({
        method: 'GET',
        url: `/v1/establishments/${establishmentId}/services`,
      })

      // Assert
      expect(response.statusCode).toBe(200)
    })
  })

  describe('Availability Management', () => {
    it('should allow owner to create availability', async () => {
      // Arrange
      const payload = {
        date: '2025-03-15',
        startTime: '09:00',
        endTime: '10:00',
        capacity: 5,
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: `/v1/services/${serviceId}/availabilities`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(201)
    })

    it('should deny random user from creating availability', async () => {
      // Arrange
      const payload = {
        date: '2025-03-16',
        startTime: '09:00',
        endTime: '10:00',
        capacity: 5,
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: `/v1/services/${serviceId}/availabilities`,
        headers: { authorization: `Bearer ${randomUser.accessToken}` },
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(403)
    })

    it('should allow anyone to view availabilities', async () => {
      // Arrange - no setup needed

      // Act
      const response = await sut.inject({
        method: 'GET',
        url: `/v1/services/${serviceId}/availabilities`,
      })

      // Assert
      expect(response.statusCode).toBe(200)
    })
  })

  describe('Extra Items Management', () => {
    it('should allow owner to create extra item', async () => {
      // Arrange
      const payload = {
        name: 'ACL Extra',
        price: 10,
        maxQuantity: 1,
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: `/v1/services/${serviceId}/extras`,
        headers: { authorization: `Bearer ${owner.accessToken}` },
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(201)
    })

    it('should deny random user from creating extra item', async () => {
      // Arrange
      const payload = {
        name: 'Hacked Extra',
        price: 10,
        maxQuantity: 1,
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: `/v1/services/${serviceId}/extras`,
        headers: { authorization: `Bearer ${randomUser.accessToken}` },
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(403)
    })

    it('should allow anyone to view extras', async () => {
      // Arrange - no setup needed

      // Act
      const response = await sut.inject({
        method: 'GET',
        url: `/v1/services/${serviceId}/extras`,
      })

      // Assert
      expect(response.statusCode).toBe(200)
    })
  })

  describe('Unauthenticated Access', () => {
    it('should deny creating establishment without auth', async () => {
      // Arrange
      const payload = {
        name: 'Unauth Establishment',
        address: '123 Unauth St',
        timezone: 'UTC',
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/establishments',
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(401)
    })

    it('should deny creating service without auth', async () => {
      // Arrange
      const payload = {
        name: 'Unauth Service',
        basePrice: 50,
        durationMinutes: 60,
        capacity: 1,
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: `/v1/establishments/${establishmentId}/services`,
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(401)
    })

    it('should deny creating booking without auth', async () => {
      // Arrange
      const payload = {
        serviceId,
        availabilityId: '00000000-0000-0000-0000-000000000000',
        quantity: 1,
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/bookings',
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(401)
    })
  })
})
