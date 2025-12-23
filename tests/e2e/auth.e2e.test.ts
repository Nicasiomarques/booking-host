import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from './helpers/test-client.js'

describe('Auth E2E', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await getTestApp()
  })

  afterAll(async () => {
    await closeTestApp()
  })

  describe('POST /v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: 'Test1234!',
          name: 'New User',
        },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.accessToken).toBeDefined()
      expect(body.user.email).toBe('newuser@example.com')
      expect(body.user.name).toBe('New User')
      expect(body.user.id).toBeDefined()
    })

    it('should fail with invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'Test1234!',
          name: 'Test User',
        },
      })

      expect(response.statusCode).toBe(422) // Validation error
    })

    it('should fail with weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: 'test2@example.com',
          password: '123',
          name: 'Test User',
        },
      })

      expect(response.statusCode).toBe(422) // Validation error
    })

    it('should fail with duplicate email', async () => {
      // First registration
      await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'Test1234!',
          name: 'First User',
        },
      })

      // Duplicate registration
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'Test1234!',
          name: 'Second User',
        },
      })

      expect(response.statusCode).toBe(409)
    })
  })

  describe('POST /v1/auth/login', () => {
    beforeAll(async () => {
      await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: 'login@example.com',
          password: 'Test1234!',
          name: 'Login User',
        },
      })
    })

    it('should login successfully with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'Test1234!',
        },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.accessToken).toBeDefined()
      expect(body.user.email).toBe('login@example.com')

      // Check refresh token cookie
      const cookies = response.cookies
      const refreshCookie = cookies.find((c) => c.name === 'refreshToken')
      expect(refreshCookie).toBeDefined()
      expect(refreshCookie?.httpOnly).toBe(true)
    })

    it('should fail with wrong password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'WrongPassword!',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should fail with non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'Test1234!',
        },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /v1/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      // Login first
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'Test1234!',
        },
      })

      const cookies = loginResponse.cookies
      const refreshCookie = cookies.find((c) => c.name === 'refreshToken')

      // Refresh
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        cookies: { refreshToken: refreshCookie!.value },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.accessToken).toBeDefined()
    })

    it('should fail without refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /v1/auth/logout', () => {
    it('should logout successfully', async () => {
      // Login first
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'Test1234!',
        },
      })

      const cookies = loginResponse.cookies
      const refreshCookie = cookies.find((c) => c.name === 'refreshToken')

      // Logout
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/logout',
        cookies: { refreshToken: refreshCookie!.value },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)

      // Verify refresh token cookie is cleared
      const clearedCookie = response.cookies.find((c) => c.name === 'refreshToken')
      expect(clearedCookie?.value).toBe('')
    })
  })
})
