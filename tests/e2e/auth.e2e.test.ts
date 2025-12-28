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

describe('Auth E2E @smoke @critical', () => {
  let sut: FastifyInstance

  beforeAll(async () => {
    sut = await T.getTestApp()
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('POST /v1/auth/register', () => {
    it('register user - valid data provided - returns 200 with access token and user details', async () => {
      // Arrange
      const userData = {
        email: T.uniqueEmail('register-success'),
        password: 'Test1234!',
        name: 'New User',
      }

      // Act
      const response = await T.post<AuthResponse>(sut, '/v1/auth/register', {
        payload: userData,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        accessToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: userData.email,
          name: userData.name,
        },
      })
    })

    it('register user - with optional fields - returns 200 and saves optional fields', async () => {
      // Arrange
      const userData = {
        email: T.uniqueEmail('register-with-fields'),
        password: 'Test1234!',
        name: 'Complete User',
        phone: '+55 11 98765-4321',
        birthDate: '1990-01-15',
        address: 'Rua das Flores, 123',
      }

      // Act
      const response = await T.post<AuthResponse>(sut, '/v1/auth/register', {
        payload: userData,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        accessToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: userData.email,
          name: userData.name,
        },
      })

      // Verify optional fields were saved by checking database directly
      const { prisma } = await import('../../src/adapters/outbound/prisma/prisma.client.js')
      const savedUser = await prisma.user.findUnique({
        where: { id: body.user.id },
        select: { phone: true, birthDate: true, address: true },
      })
      expect(savedUser).toMatchObject({
        phone: '+55 11 98765-4321',
        birthDate: new Date('1990-01-15'),
        address: 'Rua das Flores, 123',
      })
    })

    it('register user - invalid email format - returns 422 validation error', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email',
        password: 'Test1234!',
        name: 'Test User',
      }

      // Act
      const response = await T.post(sut, '/v1/auth/register', {
        payload: invalidData,
      })

      // Assert
      T.expectStatus(response, 422)
    })

    it('register user - weak password - returns 422 validation error', async () => {
      // Arrange
      const weakPasswordData = {
        email: T.uniqueEmail('weak-password'),
        password: '123',
        name: 'Test User',
      }

      // Act
      const response = await T.post(sut, '/v1/auth/register', {
        payload: weakPasswordData,
      })

      // Assert
      T.expectStatus(response, 422)
    })

    it('register user - duplicate email - returns 409 conflict', async () => {
      // Arrange
      const email = T.uniqueEmail('duplicate')
      await T.post(sut, '/v1/auth/register', {
        payload: T.defaultUserData({ email, name: 'First User' }),
      })

      // Act
      const response = await T.post(sut, '/v1/auth/register', {
        payload: T.defaultUserData({ email, name: 'Second User' }),
      })

      // Assert
      T.expectStatus(response, 409)
    })
  })

  describe('POST /v1/auth/login', () => {
    it('login - valid credentials - returns 200 with access token and sets refresh cookie', async () => {
      // Arrange
      const credentials = {
        email: T.uniqueEmail('login-success'),
        password: 'Test1234!',
      }
      await T.post(sut, '/v1/auth/register', {
        payload: { ...credentials, name: 'Login User' },
      })

      // Act
      const response = await T.post<AuthResponse>(sut, '/v1/auth/login', {
        payload: credentials,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        accessToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: credentials.email,
        },
      })

      const refreshCookie = response.raw.cookies.find((c) => c.name === 'refreshToken')
      expect(refreshCookie).toBeDefined()
      expect(refreshCookie?.httpOnly).toBe(true)
    })

    it('login - wrong password - returns 401 unauthorized', async () => {
      // Arrange
      const email = T.uniqueEmail('login-wrong-password')
      await T.post(sut, '/v1/auth/register', {
        payload: { email, password: 'Test1234!', name: 'User' },
      })

      // Act
      const response = await T.post(sut, '/v1/auth/login', {
        payload: { email, password: 'WrongPassword!' },
      })

      // Assert
      T.expectStatus(response, 401)
    })

    it('login - non-existent email - returns 401 unauthorized', async () => {
      // Arrange
      const nonExistentCredentials = {
        email: 'nonexistent@example.com',
        password: 'Test1234!',
      }

      // Act
      const response = await T.post(sut, '/v1/auth/login', {
        payload: nonExistentCredentials,
      })

      // Assert
      T.expectStatus(response, 401)
    })
  })

  describe('POST /v1/auth/refresh', () => {
    it('refresh token - valid refresh cookie - returns 200 with new access token', async () => {
      // Arrange
      const credentials = {
        email: T.uniqueEmail('refresh-success'),
        password: 'Test1234!',
      }
      await T.post(sut, '/v1/auth/register', {
        payload: { ...credentials, name: 'Refresh User' },
      })
      const loginResponse = await T.post<AuthResponse>(sut, '/v1/auth/login', {
        payload: credentials,
      })
      const refreshCookie = loginResponse.raw.cookies.find((c) => c.name === 'refreshToken')

      // Act
      const response = await T.post<{ accessToken: string }>(sut, '/v1/auth/refresh', {
        cookies: { refreshToken: refreshCookie!.value },
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        accessToken: expect.any(String),
      })
    })

    it('refresh token - no refresh cookie provided - returns 401 unauthorized', async () => {
      // Arrange - no cookie

      // Act
      const response = await T.post(sut, '/v1/auth/refresh')

      // Assert
      T.expectStatus(response, 401)
    })
  })

  describe('POST /v1/auth/logout', () => {
    it('logout - valid session - returns 200 and clears refresh cookie', async () => {
      // Arrange
      const credentials = {
        email: T.uniqueEmail('logout-success'),
        password: 'Test1234!',
      }
      await T.post(sut, '/v1/auth/register', {
        payload: { ...credentials, name: 'Logout User' },
      })
      const loginResponse = await T.post<AuthResponse>(sut, '/v1/auth/login', {
        payload: credentials,
      })
      const refreshCookie = loginResponse.raw.cookies.find((c) => c.name === 'refreshToken')

      // Act
      const response = await T.post<{ success: boolean }>(sut, '/v1/auth/logout', {
        cookies: { refreshToken: refreshCookie!.value },
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({ success: true })

      const clearedCookie = response.raw.cookies.find((c) => c.name === 'refreshToken')
      expect(clearedCookie?.value).toBe('')
    })
  })
})
