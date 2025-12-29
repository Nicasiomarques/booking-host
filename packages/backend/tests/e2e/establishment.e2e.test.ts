import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

interface Establishment {
  id: string
  name: string
  address: string
  timezone: string
  active: boolean
  phone?: string | null
  email?: string | null
  city?: string | null
  state?: string | null
  website?: string | null
  taxId?: string | null
  createdAt: string
  updatedAt: string
}

describe('Establishment E2E', () => {
  let sut: FastifyInstance

  beforeAll(async () => {
    sut = await T.getTestApp()
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('GET /v1/establishments/my', () => {
    it('get my establishments - user has establishments - returns 200 with list', async () => {
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('my-establishments'),
        password: 'Test1234!',
        name: 'Establishment Owner',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'My Test Establishment',
        address: '123 Test St',
        timezone: 'America/Sao_Paulo',
      })

      const response = await T.get<Establishment[]>(sut, '/v1/establishments/my', {
        token: owner.accessToken,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.length).toBeGreaterThanOrEqual(1)

      const myEstablishment = body.find((e) => e.id === establishment.id)
      expect(myEstablishment).toMatchObject({
        id: establishment.id,
        name: 'My Test Establishment',
        address: '123 Test St',
        timezone: 'America/Sao_Paulo',
        active: true,
      })
    })

    it('get my establishments - user has no establishments - returns 200 with empty array', async () => {
      const newUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('no-establishments'),
        password: 'Test1234!',
        name: 'No Establishments User',
      })

      const response = await T.get<Establishment[]>(sut, '/v1/establishments/my', {
        token: newUser.accessToken,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.length).toBe(0)
    })

    it('get my establishments - no authentication - returns 401 unauthorized', async () => {
      const response = await T.get(sut, '/v1/establishments/my')
      T.expectStatus(response, 401)
    })
  })

  describe('GET /v1/establishments/:id', () => {
    it('get establishment by id - valid id - returns 200 with establishment details', async () => {
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('get-by-id'),
        password: 'Test1234!',
        name: 'Owner',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'Get By ID Establishment',
        address: '456 Test Ave',
        timezone: 'UTC',
      })

      const response = await T.get<Establishment>(sut, `/v1/establishments/${establishment.id}`)

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: establishment.id,
        name: 'Get By ID Establishment',
        address: '456 Test Ave',
        timezone: 'UTC',
        active: true,
      })
    })

    it('get establishment by id - non-existent id - returns 404 not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      const response = await T.get(sut, `/v1/establishments/${nonExistentId}`)
      T.expectStatus(response, 404)
    })
  })

  describe('POST /v1/establishments', () => {
    it('create establishment - valid data - returns 201 with establishment details', async () => {
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('create-establishment'),
        password: 'Test1234!',
        name: 'New Owner',
      })
      const establishmentData = {
        name: 'New Establishment',
        address: '456 New St',
        timezone: 'UTC',
      }

      const response = await T.post<Establishment>(sut, '/v1/establishments', {
        token: owner.accessToken,
        payload: establishmentData,
      })

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        name: 'New Establishment',
        address: '456 New St',
        timezone: 'UTC',
        active: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    })

    it('create establishment - with optional fields - returns 201 with all fields', async () => {
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('create-with-fields'),
        password: 'Test1234!',
        name: 'Owner',
      })
      const establishmentData = {
        name: 'Complete Establishment',
        address: '789 Complete St',
        timezone: 'America/Sao_Paulo',
        phone: '+55 11 98765-4321',
        email: 'contact@establishment.com',
        city: 'São Paulo',
        state: 'SP',
        website: 'https://establishment.com',
        taxId: '12.345.678/0001-90',
      }

      const response = await T.post<Establishment>(sut, '/v1/establishments', {
        token: owner.accessToken,
        payload: establishmentData,
      })

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        name: 'Complete Establishment',
        address: '789 Complete St',
        timezone: 'America/Sao_Paulo',
        phone: '+55 11 98765-4321',
        email: 'contact@establishment.com',
        city: 'São Paulo',
        state: 'SP',
        website: 'https://establishment.com',
        taxId: '12.345.678/0001-90',
        active: true,
      })
    })

    it('create establishment - missing required fields - returns 422 validation error', async () => {
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('missing-fields'),
        password: 'Test1234!',
        name: 'Owner',
      })
      const incompleteData = {
        name: 'Missing Address',
      }

      const response = await T.post(sut, '/v1/establishments', {
        token: owner.accessToken,
        payload: incompleteData,
      })

      T.expectStatus(response, 422)
    })

    it('create establishment - no authentication - returns 401 unauthorized', async () => {
      const establishmentData = {
        name: 'Unauth Establishment',
        address: '789 Unauth St',
        timezone: 'UTC',
      }

      const response = await T.post(sut, '/v1/establishments', {
        payload: establishmentData,
      })

      T.expectStatus(response, 401)
    })
  })

  describe('PUT /v1/establishments/:establishmentId', () => {
    it('update establishment - by owner - returns 200 with updated data', async () => {
      const email = T.uniqueEmail('update-establishment')
      const owner = await T.createTestUser(sut, {
        email,
        password: 'Test1234!',
        name: 'Update Owner',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'Original Name',
        address: '123 Original St',
      })
      const login = await T.loginTestUser(sut, { email, password: 'Test1234!' })
      const updateData = {
        name: 'Updated Name',
        address: '456 Updated St',
      }

      const response = await T.put<Establishment>(sut, `/v1/establishments/${establishment.id}`, {
        token: login.accessToken,
        payload: updateData,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: establishment.id,
        name: 'Updated Name',
        address: '456 Updated St',
      })
    })

    it('update establishment - with optional fields - returns 200 with updated optional fields', async () => {
      const email = T.uniqueEmail('update-optional-fields')
      const owner = await T.createTestUser(sut, {
        email,
        password: 'Test1234!',
        name: 'Owner',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'Test Establishment',
        address: '123 Test St',
      })
      const login = await T.loginTestUser(sut, { email, password: 'Test1234!' })
      const updateData = {
        phone: '+55 11 98765-4321',
        email: 'newemail@establishment.com',
        city: 'Rio de Janeiro',
        state: 'RJ',
        website: 'https://newwebsite.com',
        taxId: '98.765.432/0001-10',
      }

      const response = await T.put<Establishment>(sut, `/v1/establishments/${establishment.id}`, {
        token: login.accessToken,
        payload: updateData,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: establishment.id,
        phone: '+55 11 98765-4321',
        email: 'newemail@establishment.com',
        city: 'Rio de Janeiro',
        state: 'RJ',
        website: 'https://newwebsite.com',
        taxId: '98.765.432/0001-10',
      })
    })

    it('update establishment - by non-owner - returns 403 forbidden', async () => {
      const owner = await T.createTestUser(sut, {
        email: T.uniqueEmail('owner-update'),
        password: 'Test1234!',
        name: 'Owner',
      })
      const randomUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('random-update'),
        password: 'Test1234!',
        name: 'Random User',
      })
      const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
        name: 'Protected Establishment',
        address: '123 Protected St',
      })

      const response = await T.put(sut, `/v1/establishments/${establishment.id}`, {
        token: randomUser.accessToken,
        payload: { name: 'Hacked Name' },
      })

      T.expectStatus(response, 403)
    })
  })
})
