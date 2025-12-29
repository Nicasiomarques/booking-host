import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'
import type { ErrorResponse } from './helpers/http.js'

describe('Validation E2E', () => {
  let sut: FastifyInstance
  let user: T.TestUser

  beforeAll(async () => {
    sut = await T.getTestApp()
    user = await T.createTestUser(sut, {
      email: T.uniqueEmail('validation-user'),
      password: 'Test1234!',
      name: 'Validation User',
    })
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('Query Parameter Validation', () => {
    it.each([
      ['invalid page (negative)', { page: -1, limit: 10 }],
      ['invalid limit (too large)', { page: 1, limit: 1000 }],
      ['invalid status value', { page: 1, limit: 10, status: 'INVALID_STATUS' }],
    ])('get bookings - %s - returns 422 validation error', async (_, query) => {
      const response = await T.get<ErrorResponse>(sut, '/v1/bookings/my', {
        token: user.accessToken,
        query,
      })

      T.expectStatus(response, 422)
      expect(response.body.error?.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Path Parameter Validation', () => {
    it('get booking - invalid UUID format - returns error', async () => {
      const response = await T.get(sut, '/v1/bookings/invalid-uuid', {
        token: user.accessToken,
      })

      expect([400, 404, 422]).toContain(response.status)
    })

    it('get room - invalid UUID format - returns error', async () => {
      const response = await T.get(sut, '/v1/rooms/invalid-uuid')

      expect([400, 404, 422]).toContain(response.status)
    })
  })
})

