import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'
import { futureDate, futureCheckOutDate } from './helpers/factories.js'

describe('Room Update Edge Cases E2E', () => {
  let sut: FastifyInstance
  let owner: T.TestUser
  let establishmentId: string
  let hotelServiceId: string
  let availabilityId: string

  beforeAll(async () => {
    sut = await T.getTestApp()

    // Create owner
    owner = await T.createTestUser(sut, {
      email: T.uniqueEmail('room-update-owner'),
      password: 'Test1234!',
      name: 'Room Update Owner',
    })

    // Create establishment
    const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
      name: 'Test Hotel',
      address: '123 Hotel St',
    })
    establishmentId = establishment.id

    // Login owner
    const loginResult = await T.loginTestUser(sut, {
      email: owner.email,
      password: 'Test1234!',
    })
    owner.accessToken = loginResult.accessToken

    // Create hotel service
    const service = await T.createTestService(sut, owner.accessToken, establishmentId, {
      name: 'Standard Room',
      basePrice: 100,
      durationMinutes: 1440,
      capacity: 1,
      type: 'HOTEL',
    })
    hotelServiceId = service.id

    // Create availability
    const availabilityDate = futureDate(10)
    const availability = await T.createTestAvailability(sut, owner.accessToken, hotelServiceId, {
      date: availabilityDate,
      startTime: '14:00',
      endTime: '15:00',
      capacity: 1,
    })
    availabilityId = availability.id
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('PUT /v1/rooms/:id - Update Edge Cases', () => {
    it('update room - duplicate number - returns 409 conflict', async () => {
      // Arrange - create two rooms
      const room1 = await T.createTestRoom(sut, owner.accessToken, hotelServiceId, {
        number: '2001',
      })

      const room2 = await T.createTestRoom(sut, owner.accessToken, hotelServiceId, {
        number: '2002',
      })

      // Act - try to update room2 with room1's number
      const response = await T.put(sut, `/v1/rooms/${room2.id}`, {
        token: owner.accessToken,
        payload: {
          number: '2001', // Duplicate
        },
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
      const body = response.body as any
      expect(body.error?.message).toContain('already exists')
    })

    it('update room - same number (no change) - returns 200', async () => {
      // Arrange
      const room = await T.createTestRoom(sut, owner.accessToken, hotelServiceId, {
        number: '2003',
      })

      // Act - update with same number (should be allowed)
      const response = await T.put(sut, `/v1/rooms/${room.id}`, {
        token: owner.accessToken,
        payload: {
          number: '2003', // Same number
          description: 'Updated description',
        },
      })

      // Assert
      const body = T.expectStatus(response, 200)
      expect(body.number).toBe('2003')
      expect(body.description).toBe('Updated description')
    })
  })
})

