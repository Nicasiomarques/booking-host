import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'
import { futureDate, futureCheckOutDate } from './helpers/factories.js'
import { prisma } from '../../src/shared/adapters/outbound/prisma/prisma.client.js'

describe('Coverage Gaps E2E', () => {
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
    it('update availability - non-existent id - returns 404 not found', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      // Act
      const response = await T.put(sut, `/v1/availabilities/${nonExistentId}`, {
        token: owner.accessToken,
        payload: {
          capacity: 10,
        },
      })

      // Assert
      T.expectStatus(response, 404)
    })

    it('delete availability - non-existent id - returns 404 not found', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      // Act
      const response = await T.del(sut, `/v1/availabilities/${nonExistentId}`, {
        token: owner.accessToken,
      })

      // Assert
      T.expectStatus(response, 404)
    })
  })

  describe('2. Check-out with cancelled/no-show bookings', () => {
    it('check-out - cancelled booking - returns 409 conflict', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '3001',
          floor: 30,
          status: 'AVAILABLE',
        },
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

      // Cancel booking
      await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })

      // Act - try to check out cancelled booking
      const response = await T.put(sut, `/v1/bookings/${booking.id}/check-out`, {
        token: owner.accessToken,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
      const body = response.body as any
      expect(body.error?.message).toContain('cancelled')
    })

    it('check-out - no-show booking - returns 409 conflict', async () => {
      // Arrange
      const testRoom = await prisma.room.create({
        data: {
          serviceId: hotelServiceId,
          number: '3002',
          floor: 30,
          status: 'AVAILABLE',
        },
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

      // Mark as no-show
      await T.put(sut, `/v1/bookings/${booking.id}/no-show`, {
        token: owner.accessToken,
      })

      // Act - try to check out no-show booking
      const response = await T.put(sut, `/v1/bookings/${booking.id}/check-out`, {
        token: owner.accessToken,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
      const body = response.body as any
      expect(body.error?.message).toContain('no-show')
    })
  })

  describe('3. HOTEL type validation in checkOut and markNoShow', () => {
    it('check-out - non-hotel service - returns 409 conflict', async () => {
      // Arrange - create a regular service (not hotel)
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

      // Act - try to check out non-hotel booking
      const response = await T.put(sut, `/v1/bookings/${booking.id}/check-out`, {
        token: owner.accessToken,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
      const body = response.body as any
      expect(body.error?.message).toContain('hotel')
    })

    it('mark no-show - non-hotel service - returns 409 conflict', async () => {
      // Arrange - create a regular service (not hotel)
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

      // Act - try to mark no-show for non-hotel booking
      const response = await T.put(sut, `/v1/bookings/${booking.id}/no-show`, {
        token: owner.accessToken,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
      const body = response.body as any
      expect(body.error?.message).toContain('hotel')
    })
  })

  describe('4. Room service - findByService with non-existent service', () => {
    it('list rooms - non-existent service - returns 404 not found', async () => {
      // Arrange
      const nonExistentServiceId = '00000000-0000-0000-0000-000000000000'

      // Act
      const response = await T.get(sut, `/v1/services/${nonExistentServiceId}/rooms`)

      // Assert
      T.expectStatus(response, 404)
    })
  })

  describe('5. Service service - delete with active bookings', () => {
    it('delete service - with active bookings - returns 409 conflict', async () => {
      // Arrange - create service and booking
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

      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: testService.id,
        availabilityId: testAvailability.id,
      })

      // Act - try to delete service with active booking
      const response = await T.del(sut, `/v1/services/${testService.id}`, {
        token: owner.accessToken,
      })

      // Assert
      T.expectError(response, 409, 'CONFLICT')
      const body = response.body as any
      expect(body.error?.message).toContain('active bookings')
    })
  })
})

