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
      const userData = {
        email: T.uniqueEmail('register-success'),
        password: 'Test1234!',
        name: 'New User',
      }

      const response = await T.post<AuthResponse>(sut, '/v1/auth/register', {
        payload: userData,
      })

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
      const userData = {
        email: T.uniqueEmail('register-with-fields'),
        password: 'Test1234!',
        name: 'Complete User',
        phone: '+55 11 98765-4321',
        birthDate: '1990-01-15',
        address: 'Rua das Flores, 123',
      }

      const response = await T.post<AuthResponse>(sut, '/v1/auth/register', {
        payload: userData,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        accessToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: userData.email,
          name: userData.name,
        },
      })

      const { prisma } = await import('../../src/shared/adapters/outbound/prisma/prisma.client.js')
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

    it.each([
      ['invalid email format', { email: 'invalid-email', password: 'Test1234!', name: 'Test User' }],
      ['weak password', { email: T.uniqueEmail('weak-password'), password: '123', name: 'Test User' }],
    ])('register user - %s - returns 422 validation error', async (_, invalidData) => {
      const response = await T.post(sut, '/v1/auth/register', {
        payload: invalidData,
      })

      T.expectStatus(response, 422)
    })

    it('register user - duplicate email - returns 409 conflict', async () => {
      const email = T.uniqueEmail('duplicate')
      await T.post(sut, '/v1/auth/register', {
        payload: T.defaultUserData({ email, name: 'First User' }),
      })

      const response = await T.post(sut, '/v1/auth/register', {
        payload: T.defaultUserData({ email, name: 'Second User' }),
      })

      T.expectStatus(response, 409)
    })
  })

  describe('POST /v1/auth/login', () => {
    it('login - valid credentials - returns 200 with access token and sets refresh cookie', async () => {
      const credentials = {
        email: T.uniqueEmail('login-success'),
        password: 'Test1234!',
      }
      await T.post(sut, '/v1/auth/register', {
        payload: { ...credentials, name: 'Login User' },
      })

      const response = await T.post<AuthResponse>(sut, '/v1/auth/login', {
        payload: credentials,
      })

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

    it.each([
      ['wrong password', async () => {
        const email = T.uniqueEmail('login-wrong-password')
        await T.post(sut, '/v1/auth/register', {
          payload: { email, password: 'Test1234!', name: 'User' },
        })
        return { email, password: 'WrongPassword!' }
      }],
      ['non-existent email', async () => {
        return { email: 'nonexistent@example.com', password: 'Test1234!' }
      }],
    ])('login - %s - returns 401 unauthorized', async (_, getCredentials) => {
      const credentials = await getCredentials()
      const response = await T.post(sut, '/v1/auth/login', {
        payload: credentials,
      })

      T.expectStatus(response, 401)
    })
  })

  describe('POST /v1/auth/refresh', () => {
    it('refresh token - valid refresh cookie - returns 200 with new access token', async () => {
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

      const response = await T.post<{ accessToken: string }>(sut, '/v1/auth/refresh', {
        cookies: { refreshToken: refreshCookie!.value },
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        accessToken: expect.any(String),
      })
    })

    it('refresh token - no refresh cookie provided - returns 401 unauthorized', async () => {
      const response = await T.post(sut, '/v1/auth/refresh')
      T.expectStatus(response, 401)
    })
  })

  describe('POST /v1/auth/logout', () => {
    it('logout - valid session - returns 200 and clears refresh cookie', async () => {
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

      const response = await T.post<{ success: boolean }>(sut, '/v1/auth/logout', {
        cookies: { refreshToken: refreshCookie!.value },
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({ success: true })

      const clearedCookie = response.raw.cookies.find((c) => c.name === 'refreshToken')
      expect(clearedCookie?.value).toBe('')
    })
  })

  describe('GET /v1/auth/me', () => {
    it('get current user - with valid token - returns 200 with user details', async () => {
      const userData = {
        email: T.uniqueEmail('me-success'),
        password: 'Test1234!',
        name: 'Current User',
      }
      const registerResponse = await T.post<AuthResponse>(sut, '/v1/auth/register', {
        payload: userData,
      })
      const accessToken = registerResponse.body.accessToken

      const response = await T.get<{ id: string; email: string; name: string }>(
        sut,
        '/v1/auth/me',
        {
          token: accessToken,
        }
      )

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: expect.any(String),
        email: userData.email,
        name: userData.name,
      })
    })

    it('get current user - without authentication - returns 401 unauthorized', async () => {
      const response = await T.get(sut, '/v1/auth/me')
      T.expectStatus(response, 401)
    })
  })
})
