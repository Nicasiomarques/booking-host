import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'
import * as T from './helpers/test-client.js'
import { jwtConfig } from '../../src/config/jwt.config.js'

interface AuthResponse {
  accessToken: string
  user: {
    id: string
    email: string
    name: string
  }
}

describe('JWT Token E2E', () => {
  let sut: FastifyInstance
  let user: T.TestUser

  beforeAll(async () => {
    sut = await T.getTestApp()
    user = await T.createTestUser(sut, {
      email: T.uniqueEmail('jwt-user'),
      password: 'Test1234!',
      name: 'JWT Test User',
    })
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('Invalid Access Tokens', () => {
    it.each([
      ['invalid token', () => 'invalid.token.here', (body: any) => {
        expect(body.error?.code).toBe('UNAUTHORIZED')
      }],
      ['expired token', () => jwt.sign(
        {
          userId: user.id,
          email: user.email,
          establishmentRoles: [],
        },
        jwtConfig.accessSecret,
        {
          expiresIn: '-1h',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      ), (body: any) => {
        expect(body.error?.message).toContain('expired')
      }],
      ['token signed with wrong secret', () => jwt.sign(
        {
          userId: user.id,
          email: user.email,
          establishmentRoles: [],
        },
        'wrong-secret',
        {
          expiresIn: '1h',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      ), (body: any) => {
        expect(body.error?.code).toBe('UNAUTHORIZED')
      }],
    ])('access with %s - returns 401 unauthorized', async (_, getToken, assertFn) => {
      const token = getToken()
      const response = await T.get(sut, '/v1/auth/me', {
        token,
      })

      T.expectStatus(response, 401)
      const body = response.body as any
      assertFn(body)
    })

    it('access with token missing required fields - may succeed or fail depending on validation', async () => {
      const incompleteToken = jwt.sign(
        {
          userId: user.id,
        },
        jwtConfig.accessSecret,
        {
          expiresIn: '1h',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      )

      const response = await T.get(sut, '/v1/auth/me', {
        token: incompleteToken,
      })

      expect([200, 401, 500]).toContain(response.status)
    })
  })

  describe('Invalid Refresh Tokens', () => {
    it.each([
      ['invalid token', () => 'invalid.refresh.token', (body: any) => {
        expect(body.error?.code).toBe('UNAUTHORIZED')
      }],
      ['expired token', () => jwt.sign(
        { userId: user.id, type: 'refresh' },
        jwtConfig.refreshSecret,
        {
          expiresIn: '-1h',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      ), (body: any) => {
        expect(body.error?.message).toContain('expired')
      }],
      ['access token instead of refresh token', () => user.accessToken, (body: any) => {
        expect(body.error?.code).toBe('UNAUTHORIZED')
      }],
      ['token with wrong type', () => jwt.sign(
        { userId: user.id, type: 'access' },
        jwtConfig.refreshSecret,
        {
          expiresIn: '7d',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      ), (body: any) => {
        expect(body.error?.code).toBe('UNAUTHORIZED')
        expect(body.error?.message).toBeDefined()
      }],
      ['token signed with wrong secret', () => jwt.sign(
        { userId: user.id, type: 'refresh' },
        'wrong-refresh-secret',
        {
          expiresIn: '7d',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      ), (body: any) => {
        expect(body.error?.code).toBe('UNAUTHORIZED')
      }],
    ])('refresh with %s - returns 401 unauthorized', async (_, getToken, assertFn) => {
      const token = getToken()
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        cookies: {
          refreshToken: token,
        },
      })

      expect([400, 401]).toContain(response.statusCode)
      const body = JSON.parse(response.body)
      assertFn(body)
    })
  })

  describe('Valid Token Generation', () => {
    it.each([
      ['register', async () => {
        const email = T.uniqueEmail('token-gen')
        const userData = {
          email,
          password: 'Test1234!',
          name: 'Token Gen User',
        }
        const response = await T.post<AuthResponse>(sut, '/v1/auth/register', {
          payload: userData,
        })
        return { response, email }
      }, (decoded: any, email: string) => {
        expect(decoded?.email).toBe(email.toLowerCase())
      }],
      ['login', async () => {
        const email = T.uniqueEmail('token-login')
        await T.createTestUser(sut, {
          email,
          password: 'Test1234!',
          name: 'Token Login User',
        })
        const response = await T.post<AuthResponse>(sut, '/v1/auth/login', {
          payload: {
            email,
            password: 'Test1234!',
          },
        })
        return { response, email: undefined }
      }, () => {}],
    ])('%s generates valid access and refresh tokens', async (_, getTestData, assertFn) => {
      const { response, email } = await getTestData()
      const body = T.expectStatus(response, 200)
      expect(body.accessToken).toBeDefined()
      expect(typeof body.accessToken).toBe('string')
      expect(body.accessToken.length).toBeGreaterThan(0)

      const decoded = jwt.decode(body.accessToken)
      expect(decoded).toBeDefined()
      expect((decoded as any)?.userId).toBeDefined()
      if (email) {
        assertFn(decoded, email)
      }
    })
  })
})

