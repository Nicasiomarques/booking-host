import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

interface Establishment {
  id: string
  name: string
}

interface Service {
  id: string
  name: string
  basePrice: number
}

interface Availability {
  id: string
  date: string
}

interface ExtraItem {
  id: string
  name: string
  price: number
}

describe('ACL E2E @security', () => {
  let sut: FastifyInstance
  let setup: T.TestEstablishmentSetup
  let randomUser: T.TestUser

  beforeAll(async () => {
    sut = await T.getTestApp()
    setup = await T.setupTestEstablishment(sut, 'acl')
    randomUser = await T.createTestUser(sut, {
      email: T.uniqueEmail('random-acl'),
      password: 'Test1234!',
      name: 'Random User',
    })
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('Establishment Management - Authorization', () => {
    it.each([
      ['owner', () => setup.owner.accessToken, { name: 'Updated Spa ACL' }, 200, (body: Establishment) => {
        expect(body).toMatchObject({
          id: setup.establishmentId,
          name: 'Updated Spa ACL',
        })
      }],
      ['random user', () => randomUser.accessToken, { name: 'Hacked Name' }, 403, () => {}],
    ])('update establishment - by %s - returns %s', async (role, getToken, updateData, expectedStatus, assertFn) => {
      const token = getToken()
      const response = await T.put<Establishment>(sut, `/v1/establishments/${setup.establishmentId}`, {
        token,
        payload: updateData,
      })

      const body = T.expectStatus(response, expectedStatus)
      assertFn(body)
    })

    it('view establishment - without authentication - returns 200 (public endpoint)', async () => {
      const response = await T.get<Establishment>(sut, `/v1/establishments/${setup.establishmentId}`)
      const body = T.expectStatus(response, 200)
      expect(body.id).toBe(setup.establishmentId)
    })
  })

  describe('Service Management - Authorization', () => {
    it.each([
      ['owner', () => setup.owner.accessToken, T.defaultServiceData({
        name: 'New ACL Service',
        basePrice: 30,
        durationMinutes: 30,
      }), 201, (body: Service) => {
        expect(body).toMatchObject({
          id: expect.any(String),
          name: 'New ACL Service',
          basePrice: 30,
        })
      }],
      ['random user', () => randomUser.accessToken, T.defaultServiceData({ name: 'Hacked Service' }), 403, () => {}],
    ])('create service - by %s - returns %s', async (role, getToken, serviceData, expectedStatus, assertFn) => {
      const token = getToken()
      const response = await T.post<Service>(sut, `/v1/establishments/${setup.establishmentId}/services`, {
        token,
        payload: serviceData,
      })

      const body = T.expectStatus(response, expectedStatus)
      assertFn(body)
    })

    it.each([
      ['owner', () => setup.owner.accessToken, { basePrice: 60 }, 200, (body: Service) => {
        expect(body.basePrice).toBe(60)
      }],
      ['random user', () => randomUser.accessToken, { basePrice: 1 }, 403, () => {}],
    ])('update service - by %s - returns %s', async (role, getToken, updateData, expectedStatus, assertFn) => {
      const token = getToken()
      const response = await T.put<Service>(sut, `/v1/services/${setup.serviceId}`, {
        token,
        payload: updateData,
      })

      const body = T.expectStatus(response, expectedStatus)
      assertFn(body)
    })

    it('list services - without authentication - returns 200 (public endpoint)', async () => {
      const response = await T.get<Service[]>(sut, `/v1/establishments/${setup.establishmentId}/services`)
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
    })
  })

  describe('Availability Management - Authorization', () => {
    it.each([
      ['owner', () => setup.owner.accessToken, T.defaultAvailabilityData({ date: '2025-03-15' }), 201, (body: Availability) => {
        expect(body).toMatchObject({
          id: expect.any(String),
          date: '2025-03-15',
        })
      }],
      ['random user', () => randomUser.accessToken, T.defaultAvailabilityData({ date: '2025-03-16' }), 403, () => {}],
    ])('create availability - by %s - returns %s', async (role, getToken, availabilityData, expectedStatus, assertFn) => {
      const token = getToken()
      const response = await T.post<Availability>(sut, `/v1/services/${setup.serviceId}/availabilities`, {
        token,
        payload: availabilityData,
      })

      const body = T.expectStatus(response, expectedStatus)
      assertFn(body)
    })

    it('list availabilities - without authentication - returns 200 (public endpoint)', async () => {
      const response = await T.get<Availability[]>(sut, `/v1/services/${setup.serviceId}/availabilities`)
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
    })
  })

  describe('Extra Items Management - Authorization', () => {
    it.each([
      ['owner', () => setup.owner.accessToken, { name: 'ACL Extra', price: 10, maxQuantity: 1 }, 201, (body: ExtraItem) => {
        expect(body).toMatchObject({
          id: expect.any(String),
          name: 'ACL Extra',
          price: 10,
        })
      }],
      ['random user', () => randomUser.accessToken, { name: 'Hacked Extra', price: 10, maxQuantity: 1 }, 403, () => {}],
    ])('create extra item - by %s - returns %s', async (role, getToken, extraData, expectedStatus, assertFn) => {
      const token = getToken()
      const response = await T.post<ExtraItem>(sut, `/v1/services/${setup.serviceId}/extras`, {
        token,
        payload: extraData,
      })

      const body = T.expectStatus(response, expectedStatus)
      assertFn(body)
    })

    it('list extras - without authentication - returns 200 (public endpoint)', async () => {
      const response = await T.get<ExtraItem[]>(sut, `/v1/services/${setup.serviceId}/extras`)
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
    })
  })

  describe('Unauthenticated Access - Protected Endpoints', () => {
    it.each([
      ['establishment', '/v1/establishments', {
        name: 'Unauth Establishment',
        address: '123 Unauth St',
        timezone: 'UTC',
      }],
      ['service', () => `/v1/establishments/${setup.establishmentId}/services`, T.defaultServiceData({ name: 'Unauth Service' })],
      ['booking', '/v1/bookings', () => ({
        serviceId: setup.serviceId,
        availabilityId: '00000000-0000-0000-0000-000000000000',
        quantity: 1,
      })],
    ])('create %s - without authentication - returns 401 unauthorized', async (_, urlOrFn, payloadOrFn) => {
      const url = typeof urlOrFn === 'function' ? urlOrFn() : urlOrFn
      const payload = typeof payloadOrFn === 'function' ? payloadOrFn() : payloadOrFn
      const response = await T.post(sut, url, { payload })
      T.expectStatus(response, 401)
    })
  })
})
