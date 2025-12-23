import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

interface Establishment {
  id: string
  name: string
  address: string
  timezone: string
  active: boolean
  createdAt: string
  updatedAt: string
}

describe('Establishment E2E', () => {
  let sut: FastifyInstance

  beforeAll(async () => {
    sut = await T.getTestApp()
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('GET /v1/establishments/my', () => {
    it('get my establishments - user has establishments - returns 200 with list', async () => {
      // Arrange
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('my-establishments'),
        password: 'Test1234!',
        name: 'Establishment Owner',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'My Test Establishment',
        address: '123 Test St',
        timezone: 'America/Sao_Paulo',
      })

      // Act
      const response = await T.get<Establishment[]>(sut, '/v1/establishments/my', {
        token: owner.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.length).toBeGreaterThanOrEqual(1)

      const myEstablishment = body.find((e) => e.id === establishment.id)
      expect(myEstablishment).toMatchObject({
        id: establishment.id,
        name: 'My Test Establishment',
        address: '123 Test St',
        timezone: 'America/Sao_Paulo',
        active: true,
      })
    })

    it('get my establishments - user has no establishments - returns 200 with empty array', async () => {
      // Arrange
      const newUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('no-establishments'),
        password: 'Test1234!',
        name: 'No Establishments User',
      })

      // Act
      const response = await T.get<Establishment[]>(sut, '/v1/establishments/my', {
        token: newUser.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.length).toBe(0)
    })

    it('get my establishments - no authentication - returns 401 unauthorized', async () => {
      // Arrange - no token

      // Act
      const response = await T.get(sut, '/v1/establishments/my')

      // Assert
      T.expectStatus(response, 401)
    })
  })

  describe('GET /v1/establishments/:id', () => {
    it('get establishment by id - valid id - returns 200 with establishment details', async () => {
      // Arrange
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('get-by-id'),
        password: 'Test1234!',
        name: 'Owner',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'Get By ID Establishment',
        address: '456 Test Ave',
        timezone: 'UTC',
      })

      // Act
      const response = await T.get<Establishment>(sut, `/v1/establishments/${establishment.id}`)

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: establishment.id,
        name: 'Get By ID Establishment',
        address: '456 Test Ave',
        timezone: 'UTC',
        active: true,
      })
    })

    it('get establishment by id - non-existent id - returns 404 not found', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      // Act
      const response = await T.get(sut, `/v1/establishments/${nonExistentId}`)

      // Assert
      T.expectStatus(response, 404)
    })
  })

  describe('POST /v1/establishments', () => {
    it('create establishment - valid data - returns 201 with establishment details', async () => {
      // Arrange
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('create-establishment'),
        password: 'Test1234!',
        name: 'New Owner',
      })
      const establishmentData = {
        name: 'New Establishment',
        address: '456 New St',
        timezone: 'UTC',
      }

      // Act
      const response = await T.post<Establishment>(sut, '/v1/establishments', {
        token: owner.accessToken,
        payload: establishmentData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        name: 'New Establishment',
        address: '456 New St',
        timezone: 'UTC',
        active: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    })

    it('create establishment - missing required fields - returns 422 validation error', async () => {
      // Arrange
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('missing-fields'),
        password: 'Test1234!',
        name: 'Owner',
      })
      const incompleteData = {
        name: 'Missing Address',
        // address is missing
      }

      // Act
      const response = await T.post(sut, '/v1/establishments', {
        token: owner.accessToken,
        payload: incompleteData,
      })

      // Assert
      T.expectStatus(response, 422)
    })

    it('create establishment - no authentication - returns 401 unauthorized', async () => {
      // Arrange
      const establishmentData = {
        name: 'Unauth Establishment',
        address: '789 Unauth St',
        timezone: 'UTC',
      }

      // Act
      const response = await T.post(sut, '/v1/establishments', {
        payload: establishmentData,
      })

      // Assert
      T.expectStatus(response, 401)
    })
  })

  describe('PUT /v1/establishments/:establishmentId', () => {
    it('update establishment - by owner - returns 200 with updated data', async () => {
      // Arrange
      const email = T.uniqueEmail('update-establishment')
      const owner = await T.createTestUser(sut, {
        email,
        password: 'Test1234!',
        name: 'Update Owner',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'Original Name',
        address: '123 Original St',
      })
      const login = await T.loginTestUser(sut, { email, password: 'Test1234!' })
      const updateData = {
        name: 'Updated Name',
        address: '456 Updated St',
      }

      // Act
      const response = await T.put<Establishment>(sut, `/v1/establishments/${establishment.id}`, {
        token: login.accessToken,
        payload: updateData,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: establishment.id,
        name: 'Updated Name',
        address: '456 Updated St',
      })
    })

    it('update establishment - by non-owner - returns 403 forbidden', async () => {
      // Arrange
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('owner-update'),
        password: 'Test1234!',
        name: 'Owner',
      })
      const randomUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('random-update'),
        password: 'Test1234!',
        name: 'Random User',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'Protected Establishment',
        address: '123 Protected St',
      })

      // Act
      const response = await T.put(sut, `/v1/establishments/${establishment.id}`, {
        token: randomUser.accessToken,
        payload: { name: 'Hacked Name' },
      })

      // Assert
      T.expectStatus(response, 403)
    })
  })
})
