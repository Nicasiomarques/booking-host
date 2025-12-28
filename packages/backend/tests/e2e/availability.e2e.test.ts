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
    it('list availabilities - with date range filter - returns 200 with filtered results', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'list-avail')

      // Act
      const response = await T.get<Availability[]>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`,
        { query: { startDate: '2025-02-01', endDate: '2025-02-28' } }
      )

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.length).toBeGreaterThanOrEqual(1)
    })

    it('list availabilities - date range with no results - returns 200 with empty array', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'list-empty')

      // Act
      const response = await T.get<Availability[]>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`,
        { query: { startDate: '2030-01-01', endDate: '2030-01-31' } }
      )

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toBeInstanceOf(Array)
      expect(body.length).toBe(0)
    })
  })

  describe('POST /v1/services/:serviceId/availabilities', () => {
    it('create availability - by owner with valid data - returns 201 with availability details', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'create-avail')
      const availabilityData = {
        date: '2025-08-15',
        startTime: '14:00',
        endTime: '15:00',
        capacity: 5,
      }

      // Act
      const response = await T.post<Availability>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`,
        {
          token: setup.owner.accessToken,
          payload: availabilityData,
        }
      )

      // Assert
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
      // Arrange
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

      // Act
      const response = await T.post<Availability>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`,
        {
          token: setup.owner.accessToken,
          payload: availabilityData,
        }
      )

      // Assert
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
      // Arrange
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

      // Act
      const response = await T.post(sut, `/v1/services/${setup.serviceId}/availabilities`, {
        token: setup.owner.accessToken,
        payload: overlappingData,
      })

      // Assert
      T.expectStatus(response, 409)
    })

    it('create availability - non-overlapping on same date - returns 201', async () => {
      // Arrange
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

      // Act
      const response = await T.post<Availability>(
        sut,
        `/v1/services/${setup.serviceId}/availabilities`,
        {
          token: setup.owner.accessToken,
          payload: nonOverlappingData,
        }
      )

      // Assert
      T.expectStatus(response, 201)
    })

    it('create availability - by random user - returns 403 forbidden', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'create-forbidden')
      const randomUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('random-avail'),
        password: 'Test1234!',
        name: 'Random User',
      })

      // Act
      const response = await T.post(sut, `/v1/services/${setup.serviceId}/availabilities`, {
        token: randomUser.accessToken,
        payload: T.defaultAvailabilityData({ date: '2025-09-01' }),
      })

      // Assert
      T.expectStatus(response, 403)
    })
  })

  describe('PUT /v1/availabilities/:id', () => {
    it('update availability - by owner - returns 200 with updated data', async () => {
      // Arrange
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

      // Act
      const response = await T.put<Availability>(sut, `/v1/availabilities/${availability.id}`, {
        token: setup.owner.accessToken,
        payload: updateData,
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: availability.id,
        capacity: 10,
        startTime: '14:30',
        endTime: '15:30',
      })
    })

    it('update availability - by random user - returns 403 forbidden', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'update-forbidden')
      const randomUser = await T.createTestUser(sut, {
        email: T.uniqueEmail('random-update-avail'),
        password: 'Test1234!',
        name: 'Random User',
      })

      // Act
      const response = await T.put(sut, `/v1/availabilities/${setup.availabilityId}`, {
        token: randomUser.accessToken,
        payload: { capacity: 100 },
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('update availability - no authentication - returns 401 unauthorized', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'update-unauth')

      // Act
      const response = await T.put(sut, `/v1/availabilities/${setup.availabilityId}`, {
        payload: { capacity: 50 },
      })

      // Assert
      T.expectStatus(response, 401)
    })

    it('update availability - non-existent id - returns 404 not found', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'update-notfound')
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      // Act
      const response = await T.put(sut, `/v1/availabilities/${nonExistentId}`, {
        token: setup.owner.accessToken,
        payload: { capacity: 5 },
      })

      // Assert
      T.expectStatus(response, 404)
    })
  })

  describe('DELETE /v1/availabilities/:id', () => {
    it('delete availability - by owner without bookings - returns 200 and removes availability', async () => {
      // Arrange
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

      // Act
      const response = await T.del<{ success: boolean }>(
        sut,
        `/v1/availabilities/${availability.id}`,
        { token: setup.owner.accessToken }
      )

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({ success: true })

      // Verify availability is deleted
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
      // Arrange
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

      // Act
      const response = await T.del(sut, `/v1/availabilities/${availability.id}`, {
        token: setup.owner.accessToken,
      })

      // Assert
      T.expectStatus(response, 409)
    })

    it('delete availability - by random user - returns 403 forbidden', async () => {
      // Arrange
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

      // Act
      const response = await T.del(sut, `/v1/availabilities/${availability.id}`, {
        token: randomUser.accessToken,
      })

      // Assert
      T.expectStatus(response, 403)
    })

    it('delete availability - no authentication - returns 401 unauthorized', async () => {
      // Arrange
      const setup = await T.setupTestEstablishment(sut, 'delete-unauth')

      // Act
      const response = await T.del(sut, `/v1/availabilities/${setup.availabilityId}`)

      // Assert
      T.expectStatus(response, 401)
    })
  })
})
