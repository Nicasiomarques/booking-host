import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

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
    it('get bookings - invalid query params - returns 422 validation error', async () => {
      // Arrange - invalid page (negative)
      const response = await T.get(sut, '/v1/bookings/my', {
        token: user.accessToken,
        query: { page: -1, limit: 10 },
      })

      // Assert
      T.expectStatus(response, 422)
      const body = response.body as any
      expect(body.error?.code).toBe('VALIDATION_ERROR')
    })

    it('get bookings - invalid limit - returns 422 validation error', async () => {
      // Arrange - invalid limit (too large)
      const response = await T.get(sut, '/v1/bookings/my', {
        token: user.accessToken,
        query: { page: 1, limit: 1000 },
      })

      // Assert
      T.expectStatus(response, 422)
      const body = response.body as any
      expect(body.error?.code).toBe('VALIDATION_ERROR')
    })

    it('get bookings - invalid status - returns 422 validation error', async () => {
      // Arrange - invalid status value
      const response = await T.get(sut, '/v1/bookings/my', {
        token: user.accessToken,
        query: { page: 1, limit: 10, status: 'INVALID_STATUS' },
      })

      // Assert
      T.expectStatus(response, 422)
      const body = response.body as any
      expect(body.error?.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Path Parameter Validation', () => {
    it('get booking - invalid UUID format - returns error', async () => {
      // Arrange - invalid UUID format (Fastify may return 400/422 or 404)
      const response = await T.get(sut, '/v1/bookings/invalid-uuid', {
        token: user.accessToken,
      })

      // Assert - Fastify may return 400/422 for validation or 404 for not found
      expect([400, 404, 422]).toContain(response.status)
    })

    it('get room - invalid UUID format - returns error', async () => {
      // Arrange - invalid UUID format
      const response = await T.get(sut, '/v1/rooms/invalid-uuid')

      // Assert - Fastify may return 400/422 for validation or 404 for not found
      expect([400, 404, 422]).toContain(response.status)
    })
  })
})

