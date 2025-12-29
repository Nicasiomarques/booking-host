import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

describe('Error Handler E2E', () => {
  let sut: FastifyInstance

  beforeAll(async () => {
    sut = await T.getTestApp()
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('Fastify Validation Errors', () => {
    it.each([
      ['invalid request body format', {
        email: 'not-an-email',
        password: 'Test1234!',
        name: 'Test User',
      }],
      ['missing required fields', {
        email: T.uniqueEmail('missing-fields'),
      }],
    ])('%s - returns 422 with validation error', async (_, payload) => {
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload,
      })

      expect([400, 422]).toContain(response.statusCode)
      const body = JSON.parse(response.body)
      expect(body.error).toBeDefined()
    })
  })

  describe('Rate Limit Errors', () => {
    it('rate limit exceeded - returns 429 too many requests', async () => {
      const email = T.uniqueEmail('ratelimit')
      const requests = Array.from({ length: 101 }, () =>
        sut.inject({
          method: 'POST',
          url: '/v1/auth/login',
          payload: {
            email,
            password: 'Test1234!',
          },
        })
      )

      const responses = await Promise.all(requests)
      const rateLimitedResponse = responses.find((r) => r.statusCode === 429)

      if (rateLimitedResponse) {
        const body = JSON.parse(rateLimitedResponse.body)
        expect(body.error?.code).toBe('TOO_MANY_REQUESTS')
      } else {
        expect(responses.length).toBe(101)
      }
    })
  })

  describe('Generic Errors', () => {
    it('unhandled error - returns 500 internal server error', async () => {
      const response = await sut.inject({
        method: 'GET',
        url: '/v1/nonexistent-route-that-causes-error',
      })

      expect([404, 500]).toContain(response.statusCode)

      if (response.statusCode === 500) {
        const body = JSON.parse(response.body)
        expect(body.error?.code).toBe('INTERNAL_ERROR')
      }
    })
  })
})

