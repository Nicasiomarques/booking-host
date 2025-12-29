import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'
import type { ErrorResponse } from './helpers/http.js'
import { futureDate, futureCheckOutDate } from './helpers/factories.js'
import { createTestRoom } from './helpers/room.js'

describe('Business Rules Validation E2E', () => {
  let sut: FastifyInstance
  let owner: T.TestUser
  let customer: T.TestUser
  let establishmentId: string
  let hotelServiceId: string
  let availabilityId: string

  beforeAll(async () => {
    sut = await T.getTestApp()

    // Create owner
    owner = await T.createTestUser(sut, {
      email: T.uniqueEmail('coverage-owner'),
      password: 'Test1234!',
      name: 'Coverage Owner',
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

    // Create customer
    customer = await T.createTestUser(sut, {
      email: T.uniqueEmail('coverage-customer'),
      password: 'Test1234!',
      name: 'Coverage Customer',
    })
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('1. Availability not found', () => {
    it.each([
      ['update', async () => {
        return await T.put(sut, `/v1/availabilities/00000000-0000-0000-0000-000000000000`, {
          token: owner.accessToken,
          payload: { capacity: 10 },
        })
      }],
      ['delete', async () => {
        return await T.del(sut, `/v1/availabilities/00000000-0000-0000-0000-000000000000`, {
          token: owner.accessToken,
        })
      }],
    ])('%s availability - non-existent id - returns 404 not found', async (_, getResponse) => {
      const response = await getResponse()
      T.expectStatus(response, 404)
    })
  })

  describe('2. Check-out with cancelled/no-show bookings', () => {
    it.each([
      ['cancelled', async () => {
        const testRoom = await createTestRoom({
          serviceId: hotelServiceId,
          number: '3001',
          floor: 30,
        })

        const checkInDate = futureDate(40)
        const checkOutDate = futureCheckOutDate(checkInDate, 4)
        const booking = await T.createTestBooking(sut, customer.accessToken, {
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate,
          checkOutDate,
          roomId: testRoom.id,
        })

        await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
          token: customer.accessToken,
        })

        return {
          bookingId: booking.id,
          expectedMessage: 'cancelled',
        }
      }],
      ['no-show', async () => {
        const testRoom = await createTestRoom({
          serviceId: hotelServiceId,
          number: '3002',
          floor: 30,
        })

        const checkInDate = futureDate(45)
        const checkOutDate = futureCheckOutDate(checkInDate, 4)
        const booking = await T.createTestBooking(sut, customer.accessToken, {
          serviceId: hotelServiceId,
          availabilityId: availabilityId,
          checkInDate,
          checkOutDate,
          roomId: testRoom.id,
        })

        await T.put(sut, `/v1/bookings/${booking.id}/no-show`, {
          token: owner.accessToken,
        })

        return {
          bookingId: booking.id,
          expectedMessage: 'no-show',
        }
      }],
    ])('check-out - %s booking - returns 409 conflict', async (_, getTestData) => {
      const { bookingId, expectedMessage } = await getTestData()
      const response = await T.put<ErrorResponse>(sut, `/v1/bookings/${bookingId}/check-out`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain(expectedMessage)
    })
  })

  describe('3. HOTEL type validation in checkOut and markNoShow', () => {
    it.each([
      ['check-out', async () => {
        const regularService = await T.createTestService(sut, owner.accessToken, establishmentId, {
          name: 'Regular Service',
          basePrice: 50,
          durationMinutes: 60,
          capacity: 1,
          type: 'SERVICE',
        })

        const regularAvailability = await T.createTestAvailability(sut, owner.accessToken, regularService.id, {
          date: futureDate(50),
          startTime: '09:00',
          endTime: '10:00',
          capacity: 1,
        })

        const booking = await T.createTestBooking(sut, customer.accessToken, {
          serviceId: regularService.id,
          availabilityId: regularAvailability.id,
        })

        return {
          bookingId: booking.id,
          endpoint: `/v1/bookings/${booking.id}/check-out`,
        }
      }],
      ['mark no-show', async () => {
        const regularService = await T.createTestService(sut, owner.accessToken, establishmentId, {
          name: 'Regular Service 2',
          basePrice: 50,
          durationMinutes: 60,
          capacity: 1,
          type: 'SERVICE',
        })

        const regularAvailability = await T.createTestAvailability(sut, owner.accessToken, regularService.id, {
          date: futureDate(55),
          startTime: '09:00',
          endTime: '10:00',
          capacity: 1,
        })

        const booking = await T.createTestBooking(sut, customer.accessToken, {
          serviceId: regularService.id,
          availabilityId: regularAvailability.id,
        })

        return {
          bookingId: booking.id,
          endpoint: `/v1/bookings/${booking.id}/no-show`,
        }
      }],
    ])('%s - non-hotel service - returns 409 conflict', async (_, getTestData) => {
      const { endpoint } = await getTestData()
      const response = await T.put<ErrorResponse>(sut, endpoint, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('hotel')
    })
  })

  describe('4. Room service - findByService with non-existent service', () => {
    it('list rooms - non-existent service - returns 404 not found', async () => {
      const nonExistentServiceId = '00000000-0000-0000-0000-000000000000'
      const response = await T.get(sut, `/v1/services/${nonExistentServiceId}/rooms`)
      T.expectStatus(response, 404)
    })
  })

  describe('5. Service service - delete with active bookings', () => {
    it('delete service - with active bookings - returns 409 conflict', async () => {
      const testService = await T.createTestService(sut, owner.accessToken, establishmentId, {
        name: 'Test Service for Delete',
        basePrice: 50,
        durationMinutes: 60,
        capacity: 1,
      })

      const testAvailability = await T.createTestAvailability(sut, owner.accessToken, testService.id, {
        date: futureDate(60),
        startTime: '09:00',
        endTime: '10:00',
        capacity: 1,
      })

      await T.createTestBooking(sut, customer.accessToken, {
        serviceId: testService.id,
        availabilityId: testAvailability.id,
      })

      const response = await T.del<ErrorResponse>(sut, `/v1/services/${testService.id}`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')
      expect(response.body.error?.message).toContain('active bookings')
    })
  })
})

