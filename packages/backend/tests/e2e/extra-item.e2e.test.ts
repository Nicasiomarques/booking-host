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
    it.each([
      ['without filter', undefined, (body: ExtraItem[]) => {
        expect(body.length).toBeGreaterThanOrEqual(1)
      }],
      ['with active filter', { active: 'true' }, (body: ExtraItem[]) => {
        expect(body.every((e) => e.active === true)).toBe(true)
      }],
    ])('list extras - %s - returns 200', async (_, query, assertFn) => {
      const setup = await T.setupTestEstablishment(sut, `list-extras-${query ? 'active' : 'all'}`, {
        includeExtraItem: true,
      })

      const response = await T.get<ExtraItem[]>(
        sut,
        `/v1/services/${setup.serviceId}/extras`,
        query ? { query } : undefined
      )

      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      assertFn(body)
    })

    it('list extras - non-existent service - returns 200 with empty array', async () => {
      const nonExistentServiceId = '00000000-0000-0000-0000-000000000000'
      const response = await T.get<ExtraItem[]>(
        sut,
        `/v1/services/${nonExistentServiceId}/extras`
      )

      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.length).toBe(0)
    })
  })

  describe('POST /v1/services/:serviceId/extras', () => {
    it.each([
      ['by owner with valid data', async () => {
        const setup = await T.setupTestEstablishment(sut, 'create-extra')
        return {
          setup,
          token: setup.owner.accessToken,
          payload: {
            name: 'Premium Extra',
            description: 'A premium extra item',
            price: 25,
            maxQuantity: 3,
            image: 'https://example.com/extra-image.jpg',
          },
          expectedStatus: 201,
          assertFn: (body: ExtraItem, setup: T.TestEstablishmentSetup) => {
            expect(body).toMatchObject({
              id: expect.any(String),
              serviceId: setup.serviceId,
              name: 'Premium Extra',
              image: 'https://example.com/extra-image.jpg',
              price: 25,
              maxQuantity: 3,
              active: true,
            })
          },
        }
      }],
      ['with price 0 (free)', async () => {
        const setup = await T.setupTestEstablishment(sut, 'free-extra')
        return {
          setup,
          token: setup.owner.accessToken,
          payload: {
            name: 'Free Extra',
            price: 0,
            maxQuantity: 1,
          },
          expectedStatus: 201,
          assertFn: (body: ExtraItem) => {
            expect(body.price).toBe(0)
          },
        }
      }],
    ])('create extra - %s - returns 201', async (_, getTestData) => {
      const testData = await getTestData()
      const response = await T.post<ExtraItem>(sut, `/v1/services/${testData.setup.serviceId}/extras`, {
        token: testData.token,
        payload: testData.payload,
      })

      const body = T.expectStatus(response, testData.expectedStatus)
      testData.assertFn(body, testData.setup)
    })

    it('create extra - missing required fields - returns 422 validation error', async () => {
      const setup = await T.setupTestEstablishment(sut, 'missing-fields')
      const incompleteData = {
        name: 'Missing Price',
      }

      const response = await T.post(sut, `/v1/services/${setup.serviceId}/extras`, {
        token: setup.owner.accessToken,
        payload: incompleteData,
      })

      T.expectStatus(response, 422)
    })

    it('create extra - by random user - returns 403 forbidden', async () => {
      const setup = await T.setupTestEstablishment(sut, 'create-forbidden')
      const randomUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('random-extra'),
        password: 'Test1234!',
        name: 'Random User',
      })

      const response = await T.post(sut, `/v1/services/${setup.serviceId}/extras`, {
        token: randomUser.accessToken,
        payload: { name: 'Hacked Extra', price: 10, maxQuantity: 1 },
      })

      T.expectStatus(response, 403)
    })
  })

  describe('PUT /v1/extras/:id', () => {
    it.each([
      ['by owner', async () => {
        const setup = await T.setupTestEstablishment(sut, 'update-extra')
        const extra = await T.createTestExtraItem(sut, setup.owner.accessToken, setup.serviceId, {
          name: 'Original Extra',
          price: 20,
          maxQuantity: 2,
        })
        return {
          setup,
          extraId: extra.id,
          token: setup.owner.accessToken,
          payload: {
            name: 'Updated Extra Name',
            price: 35,
            maxQuantity: 5,
          },
          expectedStatus: 200,
          assertFn: (body: ExtraItem, extraId: string) => {
            expect(body).toMatchObject({
              id: extraId,
              name: 'Updated Extra Name',
              price: 35,
              maxQuantity: 5,
            })
          },
        }
      }],
      ['partial update', async () => {
        const setup = await T.setupTestEstablishment(sut, 'partial-update')
        const extra = await T.createTestExtraItem(sut, setup.owner.accessToken, setup.serviceId, {
          name: 'Partial Update Extra',
          price: 30,
          maxQuantity: 2,
        })
        return {
          setup,
          extraId: extra.id,
          token: setup.owner.accessToken,
          payload: { price: 40 },
          expectedStatus: 200,
          assertFn: (body: ExtraItem) => {
            expect(body.price).toBe(40)
            expect(body.name).toBe('Partial Update Extra')
            expect(body.maxQuantity).toBe(2)
          },
        }
      }],
    ])('update extra - %s - returns 200', async (_, getTestData) => {
      const testData = await getTestData()
      const response = await T.put<ExtraItem>(sut, `/v1/extras/${testData.extraId}`, {
        token: testData.token,
        payload: testData.payload,
      })

      const body = T.expectStatus(response, testData.expectedStatus)
      testData.assertFn(body, testData.extraId)
    })

    it.each([
      ['by random user', async () => {
        const setup = await T.setupTestEstablishment(sut, 'update-forbidden', {
          includeExtraItem: true,
        })
        const randomUser = await T.createTestUser(sut, {
          email: T.uniqueEmail('random-update-extra'),
          password: 'Test1234!',
          name: 'Random User',
        })
        return {
          extraId: setup.extraItemId!,
          token: randomUser.accessToken,
          payload: { name: 'Hacked Name' },
          expectedStatus: 403,
        }
      }],
      ['no authentication', async () => {
        const setup = await T.setupTestEstablishment(sut, 'update-unauth', {
          includeExtraItem: true,
        })
        return {
          extraId: setup.extraItemId!,
          token: undefined,
          payload: { name: 'No Auth' },
          expectedStatus: 401,
        }
      }],
    ])('update extra - %s - returns %s', async (_, getTestData) => {
      const testData = await getTestData()
      const response = await T.put(sut, `/v1/extras/${testData.extraId}`, {
        token: testData.token,
        payload: testData.payload,
      })

      T.expectStatus(response, testData.expectedStatus)
    })

    it('update extra - non-existent id - returns 404 not found', async () => {
      const setup = await T.setupTestEstablishment(sut, 'update-notfound')
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await T.put(sut, `/v1/extras/${nonExistentId}`, {
        token: setup.owner.accessToken,
        payload: { name: 'Non Existent' },
      })

      T.expectStatus(response, 404)
    })
  })

  describe('DELETE /v1/extras/:id', () => {
    it('delete extra - by owner - returns 200 and sets extra as inactive', async () => {
      const setup = await T.setupTestEstablishment(sut, 'delete-extra')
      const extra = await T.createTestExtraItem(sut, setup.owner.accessToken, setup.serviceId, {
        name: 'Extra To Delete',
        price: 15,
      })

      const response = await T.del<{ success: boolean }>(sut, `/v1/extras/${extra.id}`, {
        token: setup.owner.accessToken,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({ success: true })

      const listResponse = await T.get<ExtraItem[]>(sut, `/v1/services/${setup.serviceId}/extras`)
      const extras = T.expectStatus(listResponse, 200)
      const deletedExtra = extras.find((e) => e.id === extra.id)
      expect(deletedExtra?.active).toBe(false)
    })

    it.each([
      ['by random user', async () => {
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
        return {
          extraId: extra.id,
          token: randomUser.accessToken,
          expectedStatus: 403,
        }
      }],
      ['no authentication', async () => {
        const setup = await T.setupTestEstablishment(sut, 'delete-unauth', {
          includeExtraItem: true,
        })
        return {
          extraId: setup.extraItemId!,
          token: undefined,
          expectedStatus: 401,
        }
      }],
    ])('delete extra - %s - returns %s', async (_, getTestData) => {
      const testData = await getTestData()
      const response = await T.del(sut, `/v1/extras/${testData.extraId}`, {
        token: testData.token,
      })

      T.expectStatus(response, testData.expectedStatus)
    })

    it('delete extra - non-existent id - returns 404 not found', async () => {
      const setup = await T.setupTestEstablishment(sut, 'delete-notfound')
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await T.del(sut, `/v1/extras/${nonExistentId}`, {
        token: setup.owner.accessToken,
      })

      T.expectStatus(response, 404)
    })
  })
})
