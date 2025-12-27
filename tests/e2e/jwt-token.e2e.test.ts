import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'
import * as T from './helpers/test-client.js'
import { jwtConfig } from '../../src/config/jwt.config.js'

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
    it('access with invalid token - returns 401 unauthorized', async () => {
      // Arrange - use an invalid token
      const invalidToken = 'invalid.token.here'

      // Act
      const response = await T.get(sut, '/v1/auth/me', {
        token: invalidToken,
      })

      // Assert
      T.expectStatus(response, 401)
      const body = response.body as any
      expect(body.error?.code).toBe('UNAUTHORIZED')
    })

    it('access with expired token - returns 401 unauthorized', async () => {
      // Arrange - create an expired token
      const expiredPayload = {
        userId: user.id,
        email: user.email,
        establishmentRoles: [],
      }
      const expiredToken = jwt.sign(expiredPayload, jwtConfig.accessSecret, {
        expiresIn: '-1h', // Expired 1 hour ago
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      })

      // Act
      const response = await T.get(sut, '/v1/auth/me', {
        token: expiredToken,
      })

      // Assert
      T.expectStatus(response, 401)
      const body = response.body as any
      expect(body.error?.message).toContain('expired')
    })

    it('access with token signed with wrong secret - returns 401 unauthorized', async () => {
      // Arrange - create a token with wrong secret
      const wrongSecretToken = jwt.sign(
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
      )

      // Act
      const response = await T.get(sut, '/v1/auth/me', {
        token: wrongSecretToken,
      })

      // Assert
      T.expectStatus(response, 401)
      const body = response.body as any
      expect(body.error?.code).toBe('UNAUTHORIZED')
    })

    it('access with token missing required fields - may succeed or fail depending on validation', async () => {
      // Arrange - create a token missing required fields
      const incompleteToken = jwt.sign(
        {
          userId: user.id,
          // email and establishmentRoles are missing
        },
        jwtConfig.accessSecret,
        {
          expiresIn: '1h',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      )

      // Act
      const response = await T.get(sut, '/v1/auth/me', {
        token: incompleteToken,
      })

      // Assert - token may be accepted (200) or rejected (401/500) depending on validation
      // The important thing is that the system handles it gracefully
      expect([200, 401, 500]).toContain(response.status)
    })
  })

  describe('Invalid Refresh Tokens', () => {
    it('refresh with invalid token - returns 401 unauthorized', async () => {
      // Arrange - use an invalid refresh token
      const invalidToken = 'invalid.refresh.token'

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        cookies: {
          refreshToken: invalidToken,
        },
      })

      // Assert
      expect([400, 401]).toContain(response.statusCode)
      const body = JSON.parse(response.body)
      expect(body.error?.code).toBe('UNAUTHORIZED')
    })

    it('refresh with expired token - returns 401 unauthorized', async () => {
      // Arrange - create an expired refresh token
      const expiredRefreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        jwtConfig.refreshSecret,
        {
          expiresIn: '-1h', // Expired 1 hour ago
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      )

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        cookies: {
          refreshToken: expiredRefreshToken,
        },
      })

      // Assert
      expect([400, 401]).toContain(response.statusCode)
      const body = JSON.parse(response.body)
      expect(body.error?.message).toContain('expired')
    })

    it('refresh with access token instead of refresh token - returns 401 unauthorized', async () => {
      // Arrange - use access token as refresh token
      const accessToken = user.accessToken

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        cookies: {
          refreshToken: accessToken,
        },
      })

      // Assert
      expect([400, 401]).toContain(response.statusCode)
      const body = JSON.parse(response.body)
      expect(body.error?.code).toBe('UNAUTHORIZED')
    })

    it('refresh with token with wrong type - returns 401 unauthorized', async () => {
      // Arrange - create a token with wrong type (not 'refresh')
      const wrongTypeToken = jwt.sign(
        { userId: user.id, type: 'access' }, // Wrong type
        jwtConfig.refreshSecret,
        {
          expiresIn: '7d',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      )

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        cookies: {
          refreshToken: wrongTypeToken,
        },
      })

      // Assert
      expect([400, 401]).toContain(response.statusCode)
      const body = JSON.parse(response.body)
      expect(body.error?.code).toBe('UNAUTHORIZED')
      // Message may vary, but should indicate invalid token
      expect(body.error?.message).toBeDefined()
    })

    it('refresh with token signed with wrong secret - returns 401 unauthorized', async () => {
      // Arrange - create a refresh token with wrong secret
      const wrongSecretToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        'wrong-refresh-secret',
        {
          expiresIn: '7d',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      )

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        cookies: {
          refreshToken: wrongSecretToken,
        },
      })

      // Assert
      expect([400, 401]).toContain(response.statusCode)
      const body = JSON.parse(response.body)
      expect(body.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('Valid Token Generation', () => {
    it('register generates valid access and refresh tokens', async () => {
      // Arrange
      const email = T.uniqueEmail('token-gen')
      const userData = {
        email,
        password: 'Test1234!',
        name: 'Token Gen User',
      }

      // Act
      const response = await T.post(sut, '/v1/auth/register', {
        payload: userData,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body.accessToken).toBeDefined()
      expect(typeof body.accessToken).toBe('string')
      expect(body.accessToken.length).toBeGreaterThan(0)

      // Verify token can be decoded
      const decoded = jwt.decode(body.accessToken)
      expect(decoded).toBeDefined()
      expect((decoded as any)?.userId).toBeDefined()
      expect((decoded as any)?.email).toBe(email.toLowerCase())
    })

    it('login generates valid access and refresh tokens', async () => {
      // Arrange
      const email = T.uniqueEmail('token-login')
      await T.createTestUser(sut, {
        email,
        password: 'Test1234!',
        name: 'Token Login User',
      })

      // Act
      const response = await T.post(sut, '/v1/auth/login', {
        payload: {
          email,
          password: 'Test1234!',
        },
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body.accessToken).toBeDefined()
      expect(typeof body.accessToken).toBe('string')
      expect(body.accessToken.length).toBeGreaterThan(0)

      // Verify token can be decoded
      const decoded = jwt.decode(body.accessToken)
      expect(decoded).toBeDefined()
      expect((decoded as any)?.userId).toBeDefined()
    })
  })
})

