import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from './helpers/test-client.js'

describe('Auth E2E', () => {
  let sut: FastifyInstance

  beforeAll(async () => {
    sut = await getTestApp()
  })

  afterAll(async () => {
    await closeTestApp()
  })

  describe('POST /v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const payload = {
        email: 'newuser@example.com',
        password: 'Test1234!',
        name: 'New User',
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.accessToken).toBeDefined()
      expect(body.user.email).toBe('newuser@example.com')
      expect(body.user.name).toBe('New User')
      expect(body.user.id).toBeDefined()
    })

    it('should fail with invalid email format', async () => {
      // Arrange
      const payload = {
        email: 'invalid-email',
        password: 'Test1234!',
        name: 'Test User',
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(422)
    })

    it('should fail with weak password', async () => {
      // Arrange
      const payload = {
        email: 'test2@example.com',
        password: '123',
        name: 'Test User',
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(422)
    })

    it('should fail with duplicate email', async () => {
      // Arrange
      const payload = {
        email: 'duplicate@example.com',
        password: 'Test1234!',
        name: 'First User',
      }

      await sut.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload,
      })

      const duplicatePayload = {
        email: 'duplicate@example.com',
        password: 'Test1234!',
        name: 'Second User',
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: duplicatePayload,
      })

      // Assert
      expect(response.statusCode).toBe(409)
    })
  })

  describe('POST /v1/auth/login', () => {
    beforeAll(async () => {
      // Arrange - create user for login tests
      await sut.inject({
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
      // Arrange
      const payload = {
        email: 'login@example.com',
        password: 'Test1234!',
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.accessToken).toBeDefined()
      expect(body.user.email).toBe('login@example.com')

      const cookies = response.cookies
      const refreshCookie = cookies.find((c) => c.name === 'refreshToken')
      expect(refreshCookie).toBeDefined()
      expect(refreshCookie?.httpOnly).toBe(true)
    })

    it('should fail with wrong password', async () => {
      // Arrange
      const payload = {
        email: 'login@example.com',
        password: 'WrongPassword!',
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(401)
    })

    it('should fail with non-existent email', async () => {
      // Arrange
      const payload = {
        email: 'nonexistent@example.com',
        password: 'Test1234!',
      }

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload,
      })

      // Assert
      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /v1/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const loginResponse = await sut.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'Test1234!',
        },
      })

      const cookies = loginResponse.cookies
      const refreshCookie = cookies.find((c) => c.name === 'refreshToken')

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        cookies: { refreshToken: refreshCookie!.value },
      })

      // Assert
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.accessToken).toBeDefined()
    })

    it('should fail without refresh token', async () => {
      // Arrange - no refresh token

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
      })

      // Assert
      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /v1/auth/logout', () => {
    it('should logout successfully', async () => {
      // Arrange
      const loginResponse = await sut.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'Test1234!',
        },
      })

      const cookies = loginResponse.cookies
      const refreshCookie = cookies.find((c) => c.name === 'refreshToken')

      // Act
      const response = await sut.inject({
        method: 'POST',
        url: '/v1/auth/logout',
        cookies: { refreshToken: refreshCookie!.value },
      })

      // Assert
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)

      const clearedCookie = response.cookies.find((c) => c.name === 'refreshToken')
      expect(clearedCookie?.value).toBe('')
    })
  })
})
