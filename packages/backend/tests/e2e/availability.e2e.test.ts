import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'

interface Availability {
  id: string
  serviceId: string
  date: string
  startTime: string
  endTime: string
  capacity: number
  price?: number | null
  notes?: string | null
  isRecurring?: boolean | null
}

describe('Availability E2E', () => {
  let sut: FastifyInstance

  beforeAll(async () => {
    sut = await T.getTestApp()
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('GET /v1/services/:serviceId/availabilities', () => {
    it.each([
      ['with date range filter', { startDate: '2025-02-01', endDate: '2025-02-28' }, (body: Availability[]) => {
        expect(body.length).toBeGreaterThanOrEqual(1)
      }],
      ['date range with no results', { startDate: '2030-01-01', endDate: '2030-01-31' }, (body: Availability[]) => {
        expect(body.length).toBe(0)
      }],
    ])('list availabilities - %s - returns 200', async (_, query, assertFn) => {
      const setup = await T.setupTestEstablishment(sut, `list-${query.startDate === '2030-01-01' ? 'empty' : 'avail'}`)
      const response = await T.get<Availability[]>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`,
        { query }
      )

      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      assertFn(body)
    })
  })

  describe('POST /v1/services/:serviceId/availabilities', () => {
    it('create availability - by owner with valid data - returns 201 with availability details', async () => {
      const setup = await T.setupTestEstablishment(sut, 'create-avail')
      const availabilityData = {
        date: '2025-08-15',
        startTime: '14:00',
        endTime: '15:00',
        capacity: 5,
      }

      const response = await T.post<Availability>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`,
        {
          token: setup.owner.accessToken,
          payload: availabilityData,
        }
      )

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        serviceId: setup.serviceId,
        date: '2025-08-15',
        startTime: '14:00',
        endTime: '15:00',
        capacity: 5,
      })
    })

    it('create availability - with optional fields - returns 201 with all fields', async () => {
      const setup = await T.setupTestEstablishment(sut, 'create-avail-optional')
      const availabilityData = {
        date: '2025-09-15',
        startTime: '16:00',
        endTime: '17:00',
        capacity: 10,
        price: 75.50,
        notes: 'Special availability with discount',
        isRecurring: true,
      }

      const response = await T.post<Availability>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`,
        {
          token: setup.owner.accessToken,
          payload: availabilityData,
        }
      )

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        serviceId: setup.serviceId,
        date: '2025-09-15',
        startTime: '16:00',
        endTime: '17:00',
        capacity: 10,
        price: 75.50,
        notes: 'Special availability with discount',
        isRecurring: true,
      })
    })

    it('create availability - overlapping time slot - returns 409 conflict', async () => {
      const setup = await T.setupTestEstablishment(sut, 'overlap-avail')
      await T.createTestAvailability(sut, setup.owner.accessToken, setup.serviceId, {
        date: '2025-06-15',
        startTime: '10:00',
        endTime: '12:00',
        capacity: 5,
      })
      const overlappingData = {
        date: '2025-06-15',
        startTime: '11:00',
        endTime: '13:00',
        capacity: 3,
      }

      const response = await T.post(sut, `/v1/services/${setup.serviceId}/availabilities`, {
        token: setup.owner.accessToken,
        payload: overlappingData,
      })

      T.expectStatus(response, 409)
    })

    it('create availability - non-overlapping on same date - returns 201', async () => {
      const setup = await T.setupTestEstablishment(sut, 'non-overlap')
      await T.createTestAvailability(sut, setup.owner.accessToken, setup.serviceId, {
        date: '2025-07-15',
        startTime: '08:00',
        endTime: '09:00',
        capacity: 5,
      })
      const nonOverlappingData = {
        date: '2025-07-15',
        startTime: '10:00',
        endTime: '11:00',
        capacity: 3,
      }

      const response = await T.post<Availability>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`,
        {
          token: setup.owner.accessToken,
          payload: nonOverlappingData,
        }
      )

      T.expectStatus(response, 201)
    })

    it('create availability - by random user - returns 403 forbidden', async () => {
      const setup = await T.setupTestEstablishment(sut, 'create-forbidden')
      const randomUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('random-avail'),
        password: 'Test1234!',
        name: 'Random User',
      })

      const response = await T.post(sut, `/v1/services/${setup.serviceId}/availabilities`, {
        token: randomUser.accessToken,
        payload: T.defaultAvailabilityData({ date: '2025-09-01' }),
      })

      T.expectStatus(response, 403)
    })
  })

  describe('PUT /v1/availabilities/:id', () => {
    it('update availability - by owner - returns 200 with updated data', async () => {
      const setup = await T.setupTestEstablishment(sut, 'update-avail')
      const availability = await T.createTestAvailability(
        sut,
        setup.owner.accessToken,
        setup.serviceId,
        {
          date: '2025-03-10',
          startTime: '14:00',
          endTime: '15:00',
          capacity: 5,
        }
      )
      const updateData = {
        capacity: 10,
        startTime: '14:30',
        endTime: '15:30',
      }

      const response = await T.put<Availability>(sut, `/v1/availabilities/${availability.id}`, {
        token: setup.owner.accessToken,
        payload: updateData,
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: availability.id,
        capacity: 10,
        startTime: '14:30',
        endTime: '15:30',
      })
    })

    it.each([
      ['by random user', async () => {
        const setup = await T.setupTestEstablishment(sut, 'update-forbidden')
        const randomUser = await T.createTestUser(sut, {
          email: T.uniqueEmail('random-update-avail'),
          password: 'Test1234!',
          name: 'Random User',
        })
        return {
          availabilityId: setup.availabilityId,
          token: randomUser.accessToken,
          payload: { capacity: 100 },
          expectedStatus: 403,
        }
      }],
      ['no authentication', async () => {
        const setup = await T.setupTestEstablishment(sut, 'update-unauth')
        return {
          availabilityId: setup.availabilityId,
          token: undefined,
          payload: { capacity: 50 },
          expectedStatus: 401,
        }
      }],
    ])('update availability - %s - returns %s', async (_, getTestData) => {
      const testData = await getTestData()
      const response = await T.put(sut, `/v1/availabilities/${testData.availabilityId}`, {
        token: testData.token,
        payload: testData.payload,
      })

      T.expectStatus(response, testData.expectedStatus)
    })

    it('update availability - non-existent id - returns 404 not found', async () => {
      const setup = await T.setupTestEstablishment(sut, 'update-notfound')
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await T.put(sut, `/v1/availabilities/${nonExistentId}`, {
        token: setup.owner.accessToken,
        payload: { capacity: 5 },
      })

      T.expectStatus(response, 404)
    })
  })

  describe('DELETE /v1/availabilities/:id', () => {
    it('delete availability - by owner without bookings - returns 200 and removes availability', async () => {
      const setup = await T.setupTestEstablishment(sut, 'delete-avail')
      const availability = await T.createTestAvailability(
        sut,
        setup.owner.accessToken,
        setup.serviceId,
        {
          date: '2025-04-01',
          startTime: '10:00',
          endTime: '11:00',
          capacity: 3,
        }
      )

      const response = await T.del<{ success: boolean }>(
        sut,
        `/v1/availabilities/${availability.id}`,
        { token: setup.owner.accessToken }
      )

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({ success: true })

      const listResponse = await T.get<Availability[]>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`,
        { query: { startDate: '2025-04-01', endDate: '2025-04-01' } }
      )
      const availabilities = T.expectStatus(listResponse, 200)
      const found = availabilities.find((a) => a.id === availability.id)
      expect(found).toBeUndefined()
    })

    it('delete availability - with existing bookings - returns 409 conflict', async () => {
      const setup = await T.setupTestEstablishment(sut, 'delete-conflict')
      const availability = await T.createTestAvailability(
        sut,
        setup.owner.accessToken,
        setup.serviceId,
        {
          date: '2025-05-01',
          startTime: '09:00',
          endTime: '10:00',
          capacity: 5,
        }
      )
      const customer = await T.createTestUser(sut, {
        email: T.uniqueEmail('booking-customer'),
        password: 'Test1234!',
        name: 'Booking Customer',
      })
      await T.post(sut, '/v1/bookings', {
        token: customer.accessToken,
        payload: {
          serviceId: setup.serviceId,
          availabilityId: availability.id,
          quantity: 1,
        },
      })

      const response = await T.del(sut, `/v1/availabilities/${availability.id}`, {
        token: setup.owner.accessToken,
      })

      T.expectStatus(response, 409)
    })

    it.each([
      ['by random user', async () => {
        const setup = await T.setupTestEstablishment(sut, 'delete-forbidden')
        const randomUser = await T.createTestUser(sut, {
          email: T.uniqueEmail('random-delete-avail'),
          password: 'Test1234!',
          name: 'Random User',
        })
        const availability = await T.createTestAvailability(
          sut,
          setup.owner.accessToken,
          setup.serviceId,
          {
            date: '2025-04-02',
            startTime: '10:00',
            endTime: '11:00',
            capacity: 3,
          }
        )
        return {
          availabilityId: availability.id,
          token: randomUser.accessToken,
          expectedStatus: 403,
        }
      }],
      ['no authentication', async () => {
        const setup = await T.setupTestEstablishment(sut, 'delete-unauth')
        return {
          availabilityId: setup.availabilityId,
          token: undefined,
          expectedStatus: 401,
        }
      }],
    ])('delete availability - %s - returns %s', async (_, getTestData) => {
      const testData = await getTestData()
      const response = await T.del(sut, `/v1/availabilities/${testData.availabilityId}`, {
        token: testData.token,
      })

      T.expectStatus(response, testData.expectedStatus)
    })
  })
})
