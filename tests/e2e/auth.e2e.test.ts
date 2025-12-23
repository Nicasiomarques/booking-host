import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

interface AuthResponse {
  accessToken: string
  user: {
    id: string
    email: string
    name: string
  }
}

describe('Auth E2E', () => {
  let sut: FastifyInstance

  beforeAll(async () => {
    sut = await T.getTestApp()
  })

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('POST /v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await T.post<AuthResponse>(sut, '/v1/auth/register', {
        payload: {
          email: 'newuser@example.com',
          password: 'Test1234!',
          name: 'New User',
        },
      })

      const body = T.expectStatus(response, 200)
      expect(body.accessToken).toBeDefined()
      expect(body.user.email).toBe('newuser@example.com')
      expect(body.user.name).toBe('New User')
      expect(body.user.id).toBeDefined()
    })

    it('should fail with invalid email format', async () => {
      const response = await T.post(sut, '/v1/auth/register', {
        payload: {
          email: 'invalid-email',
          password: 'Test1234!',
          name: 'Test User',
        },
      })

      T.expectStatus(response, 422)
    })

    it('should fail with weak password', async () => {
      const response = await T.post(sut, '/v1/auth/register', {
        payload: {
          email: T.uniqueEmail('weak'),
          password: '123',
          name: 'Test User',
        },
      })

      T.expectStatus(response, 422)
    })

    it('should fail with duplicate email', async () => {
      const email = 'duplicate@example.com'

      // Register first user
      await T.post(sut, '/v1/auth/register', {
        payload: T.defaultUserData({ email, name: 'First User' }),
      })

      // Try to register with same email
      const response = await T.post(sut, '/v1/auth/register', {
        payload: T.defaultUserData({ email, name: 'Second User' }),
      })

      T.expectStatus(response, 409)
    })
  })

  describe('POST /v1/auth/login', () => {
    const loginEmail = 'login@example.com'

    beforeAll(async () => {
      await T.post(sut, '/v1/auth/register', {
        payload: T.defaultUserData({ email: loginEmail, name: 'Login User' }),
      })
    })

    it('should login successfully with valid credentials', async () => {
      const response = await T.post<AuthResponse>(sut, '/v1/auth/login', {
        payload: { email: loginEmail, password: 'Test1234!' },
      })

      const body = T.expectStatus(response, 200)
      expect(body.accessToken).toBeDefined()
      expect(body.user.email).toBe(loginEmail)

      const refreshCookie = response.raw.cookies.find((c) => c.name === 'refreshToken')
      expect(refreshCookie).toBeDefined()
      expect(refreshCookie?.httpOnly).toBe(true)
    })

    it('should fail with wrong password', async () => {
      const response = await T.post(sut, '/v1/auth/login', {
        payload: { email: loginEmail, password: 'WrongPassword!' },
      })

      T.expectStatus(response, 401)
    })

    it('should fail with non-existent email', async () => {
      const response = await T.post(sut, '/v1/auth/login', {
        payload: { email: 'nonexistent@example.com', password: 'Test1234!' },
      })

      T.expectStatus(response, 401)
    })
  })

  describe('POST /v1/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      // Login to get refresh token
      const loginResponse = await T.post<AuthResponse>(sut, '/v1/auth/login', {
        payload: { email: 'login@example.com', password: 'Test1234!' },
      })

      const refreshCookie = loginResponse.raw.cookies.find((c) => c.name === 'refreshToken')

      const response = await T.post<{ accessToken: string }>(sut, '/v1/auth/refresh', {
        cookies: { refreshToken: refreshCookie!.value },
      })

      const body = T.expectStatus(response, 200)
      expect(body.accessToken).toBeDefined()
    })

    it('should fail without refresh token', async () => {
      const response = await T.post(sut, '/v1/auth/refresh')

      T.expectStatus(response, 401)
    })
  })

  describe('POST /v1/auth/logout', () => {
    it('should logout successfully', async () => {
      // Login first
      const loginResponse = await T.post<AuthResponse>(sut, '/v1/auth/login', {
        payload: { email: 'login@example.com', password: 'Test1234!' },
      })

      const refreshCookie = loginResponse.raw.cookies.find((c) => c.name === 'refreshToken')

      const response = await T.post<{ success: boolean }>(sut, '/v1/auth/logout', {
        cookies: { refreshToken: refreshCookie!.value },
      })

      const body = T.expectStatus(response, 200)
      expect(body.success).toBe(true)

      const clearedCookie = response.raw.cookies.find((c) => c.name === 'refreshToken')
      expect(clearedCookie?.value).toBe('')
    })
  })
})
