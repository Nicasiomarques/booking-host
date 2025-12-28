import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

interface ExtraItem {
  id: string
  serviceId: string
  name: string
  description?: string
  price: number
  maxQuantity: number
  active: boolean
  image?: string | null
}

describe('Extra Item E2E', () => {
  let sut: FastifyInstance

  beforeAll(async () => {
    sut = await T.getTestApp()
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('GET /v1/services/:serviceId/extras', () => {
    it('list extras - without filter - returns 200 with all extras', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'list-extras', {
        includeExtraItem: true,
      })

      // Act
      const response = await T.get<ExtraItem[]>(sut, `/v1/services/${setup.serviceId}/extras`)

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.length).toBeGreaterThanOrEqual(1)
    })

    it('list extras - with active filter - returns 200 with only active extras', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'list-active-extras', {
        includeExtraItem: true,
      })

      // Act
      const response = await T.get<ExtraItem[]>(
        sut,
        `/v1/services/${setup.serviceId}/extras`,
        { query: { active: 'true' } }
      )

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.every((e) => e.active === true)).toBe(true)
    })

    it('list extras - non-existent service - returns 200 with empty array', async () => {
      // Arrange
      const nonExistentServiceId = '00000000-0000-0000-0000-000000000000'

      // Act
      const response = await T.get<ExtraItem[]>(
        sut,
        `/v1/services/${nonExistentServiceId}/extras`
      )

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.length).toBe(0)
    })
  })

  describe('POST /v1/services/:serviceId/extras', () => {
    it('create extra - by owner with valid data - returns 201 with extra details', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'create-extra')
      const extraData = {
        name: 'Premium Extra',
        description: 'A premium extra item',
        price: 25,
        maxQuantity: 3,
        image: 'https://example.com/extra-image.jpg',
      }

      // Act
      const response = await T.post<ExtraItem>(sut, `/v1/services/${setup.serviceId}/extras`, {
        token: setup.owner.accessToken,
        payload: extraData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        serviceId: setup.serviceId,
        name: 'Premium Extra',
        image: 'https://example.com/extra-image.jpg',
        price: 25,
        maxQuantity: 3,
        active: true,
      })
    })

    it('create extra - with price 0 (free) - returns 201 with zero price', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'free-extra')
      const freeExtraData = {
        name: 'Free Extra',
        price: 0,
        maxQuantity: 1,
      }

      // Act
      const response = await T.post<ExtraItem>(sut, `/v1/services/${setup.serviceId}/extras`, {
        token: setup.owner.accessToken,
        payload: freeExtraData,
      })

      // Assert
      const body = T.expectStatus(response, 201)
      expect(body.price).toBe(0)
    })

    it('create extra - missing required fields - returns 422 validation error', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'missing-fields')
      const incompleteData = {
        name: 'Missing Price',
        // price is missing
      }

      // Act
      const response = await T.post(sut, `/v1/services/${setup.serviceId}/extras`, {
        token: setup.owner.accessToken,
        payload: incompleteData,
      })

      // Assert
      T.expectStatus(response, 422)
    })

    it('create extra - by random user - returns 403 forbidden', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'create-forbidden')
      const randomUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('random-extra'),
        password: 'Test1234!',
        name: 'Random User',
      })

      // Act
      const response = await T.post(sut, `/v1/services/${setup.serviceId}/extras`, {
        token: randomUser.accessToken,
        payload: { name: 'Hacked Extra', price: 10, maxQuantity: 1 },
      })

      // Assert
      T.expectStatus(response, 403)
    })
  })

  describe('PUT /v1/extras/:id', () => {
    it('update extra - by owner - returns 200 with updated data', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'update-extra')
      const extra = await T.createTestExtraItem(sut, setup.owner.accessToken, setup.serviceId, {
        name: 'Original Extra',
        price: 20,
        maxQuantity: 2,
      })
      const updateData = {
        name: 'Updated Extra Name',
        price: 35,
        maxQuantity: 5,
      }

      // Act
      const response = await T.put<ExtraItem>(sut, `/v1/extras/${extra.id}`, {
        token: setup.owner.accessToken,
        payload: updateData,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: extra.id,
        name: 'Updated Extra Name',
        price: 35,
        maxQuantity: 5,
      })
    })

    it('update extra - partial update - returns 200 with only specified fields changed', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'partial-update')
      const extra = await T.createTestExtraItem(sut, setup.owner.accessToken, setup.serviceId, {
        name: 'Partial Update Extra',
        price: 30,
        maxQuantity: 2,
      })

      // Act
      const response = await T.put<ExtraItem>(sut, `/v1/extras/${extra.id}`, {
        token: setup.owner.accessToken,
        payload: { price: 40 },
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body.price).toBe(40)
      expect(body.name).toBe('Partial Update Extra') // Unchanged
      expect(body.maxQuantity).toBe(2) // Unchanged
    })

    it('update extra - by random user - returns 403 forbidden', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'update-forbidden', {
        includeExtraItem: true,
      })
      const randomUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('random-update-extra'),
        password: 'Test1234!',
        name: 'Random User',
      })

      // Act
      const response = await T.put(sut, `/v1/extras/${setup.extraItemId}`, {
        token: randomUser.accessToken,
        payload: { name: 'Hacked Name' },
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('update extra - no authentication - returns 401 unauthorized', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'update-unauth', {
        includeExtraItem: true,
      })

      // Act
      const response = await T.put(sut, `/v1/extras/${setup.extraItemId}`, {
        payload: { name: 'No Auth' },
      })

      // Assert
      T.expectStatus(response, 401)
    })

    it('update extra - non-existent id - returns 404 not found', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'update-notfound')
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      // Act
      const response = await T.put(sut, `/v1/extras/${nonExistentId}`, {
        token: setup.owner.accessToken,
        payload: { name: 'Non Existent' },
      })

      // Assert
      T.expectStatus(response, 404)
    })
  })

  describe('DELETE /v1/extras/:id', () => {
    it('delete extra - by owner - returns 200 and sets extra as inactive', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'delete-extra')
      const extra = await T.createTestExtraItem(sut, setup.owner.accessToken, setup.serviceId, {
        name: 'Extra To Delete',
        price: 15,
      })

      // Act
      const response = await T.del<{ success: boolean }>(sut, `/v1/extras/${extra.id}`, {
        token: setup.owner.accessToken,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({ success: true })

      // Verify extra is now inactive (soft delete)
      const listResponse = await T.get<ExtraItem[]>(sut, `/v1/services/${setup.serviceId}/extras`)
      const extras = T.expectStatus(listResponse, 200)
      const deletedExtra = extras.find((e) => e.id === extra.id)
      expect(deletedExtra?.active).toBe(false)
    })

    it('delete extra - by random user - returns 403 forbidden', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'delete-forbidden')
      const randomUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('random-delete-extra'),
        password: 'Test1234!',
        name: 'Random User',
      })
      const extra = await T.createTestExtraItem(sut, setup.owner.accessToken, setup.serviceId, {
        name: 'Protected Extra',
        price: 10,
      })

      // Act
      const response = await T.del(sut, `/v1/extras/${extra.id}`, {
        token: randomUser.accessToken,
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('delete extra - no authentication - returns 401 unauthorized', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'delete-unauth', {
        includeExtraItem: true,
      })

      // Act
      const response = await T.del(sut, `/v1/extras/${setup.extraItemId}`)

      // Assert
      T.expectStatus(response, 401)
    })

    it('delete extra - non-existent id - returns 404 not found', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'delete-notfound')
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      // Act
      const response = await T.del(sut, `/v1/extras/${nonExistentId}`, {
        token: setup.owner.accessToken,
      })

      // Assert
      T.expectStatus(response, 404)
    })
  })
})
