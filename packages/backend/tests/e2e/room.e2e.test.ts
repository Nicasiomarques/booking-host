import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import * as T from './helpers/test-client.js'
import type { ErrorResponse } from './helpers/http.js'
import { futureDate, futureCheckOutDate } from './helpers/factories.js'

interface Room {
  id: string
  serviceId: string
  number: string
  floor: number | null
  description: string | null
  status: string
  capacity?: number | null
  roomType?: string | null
  bedType?: string | null
  amenities?: string[] | null
  maxOccupancy?: number | null
  createdAt: string
  updatedAt: string
}

describe('Room E2E @critical', () => {
  let sut: FastifyInstance
  let owner: T.TestUser
  let establishmentId: string
  let hotelServiceId: string

  beforeAll(async () => {
    sut = await T.getTestApp()

    // Create owner
    owner = await T.createTestUser(sut, {
      email: T.uniqueEmail('room-owner'),
      password: 'Test1234!',
      name: 'Room Owner',
    })

    // Create establishment
    const establishment = await T.createTestEstablishment(sut, owner.accessToken, {
      name: 'Test Hotel',
      address: '123 Hotel St',
    })
    establishmentId = establishment.id

    // Login owner to get fresh token
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
  }, 30000)

  afterAll(async () => {
    await T.closeTestApp()
  })

  describe('POST /v1/services/:serviceId/rooms', () => {
    it('create room - valid data - returns 201 with room details', async () => {
      const roomData = {
        number: '201',
        floor: 2,
        description: 'Deluxe room with view',
      }

      const response = await T.post<Room>(sut, `/v1/services/${hotelServiceId}/rooms`, {
        token: owner.accessToken,
        payload: roomData,
      })

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        serviceId: hotelServiceId,
        number: '201',
        floor: 2,
        description: 'Deluxe room with view',
        status: 'AVAILABLE',
      })
    })

    it('create room - with optional fields - returns 201 with all fields', async () => {
      const roomData = {
        number: '301',
        floor: 3,
        description: 'Suite with balcony',
        capacity: 2,
        roomType: 'SUITE',
        bedType: 'QUEEN',
        amenities: ['wifi', 'minibar', 'balcony', 'tv'],
        maxOccupancy: 3,
      }

      const response = await T.post<Room>(sut, `/v1/services/${hotelServiceId}/rooms`, {
        token: owner.accessToken,
        payload: roomData,
      })

      const body = T.expectStatus(response, 201)
      expect(body).toMatchObject({
        id: expect.any(String),
        serviceId: hotelServiceId,
        number: '301',
        floor: 3,
        description: 'Suite with balcony',
        capacity: 2,
        roomType: 'SUITE',
        bedType: 'QUEEN',
        amenities: ['wifi', 'minibar', 'balcony', 'tv'],
        maxOccupancy: 3,
        status: 'AVAILABLE',
      })
    })

    it('create room - duplicate number - returns 409 conflict', async () => {
      await T.createTestRoom(sut, owner.accessToken, hotelServiceId, {
        number: '202',
      })

      const response = await T.post<ErrorResponse>(sut, `/v1/services/${hotelServiceId}/rooms`, {
        token: owner.accessToken,
        payload: { number: '202', floor: 2 },
      })

      T.expectError(response, 409, 'CONFLICT')
    })

    it('create room - non-owner - returns 403 forbidden', async () => {
      const customer = await T.createTestUser(sut, {
        email: T.uniqueEmail('customer'),
        password: 'Test1234!',
        name: 'Customer',
      })

      const response = await T.post(sut, `/v1/services/${hotelServiceId}/rooms`, {
        token: customer.accessToken,
        payload: { number: '203' },
      })

      T.expectStatus(response, 403)
    })
  })

  describe('GET /v1/services/:serviceId/rooms', () => {
    it('list rooms - returns 200 with array of rooms', async () => {
      await T.createTestRoom(sut, owner.accessToken, hotelServiceId, {
        number: '301',
        floor: 3,
      })

      const response = await T.get<Room[]>(sut, `/v1/services/${hotelServiceId}/rooms`)

      const body = T.expectStatus(response, 200)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
      body.forEach((room) => {
        expect(room).toHaveProperty('id')
        expect(room).toHaveProperty('number')
        expect(room).toHaveProperty('status')
      })
    })
  })

  describe('GET /v1/rooms/:id', () => {
    it('get room by id - returns 200 with room details', async () => {
      const room = await T.createTestRoom(sut, owner.accessToken, hotelServiceId, {
        number: '401',
        floor: 4,
        description: 'Suite room',
      })

      const response = await T.get<Room>(sut, `/v1/rooms/${room.id}`)

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: room.id,
        number: '401',
        floor: 4,
        description: 'Suite room',
        status: 'AVAILABLE',
      })
    })

    it('get room by id - non-existent - returns 404 not found', async () => {
      const response = await T.get(sut, '/v1/rooms/00000000-0000-0000-0000-000000000000')

      T.expectStatus(response, 404)
    })
  })

  describe('PUT /v1/rooms/:id', () => {
    it('update room - valid data - returns 200 with updated room', async () => {
      const room = await T.createTestRoom(sut, owner.accessToken, hotelServiceId, {
        number: '501',
      })

      const response = await T.put<Room>(sut, `/v1/rooms/${room.id}`, {
        token: owner.accessToken,
        payload: {
          floor: 5,
          description: 'Updated description',
          status: 'MAINTENANCE' as const,
        },
      })

      const body = T.expectStatus(response, 200)
      expect(body).toMatchObject({
        id: room.id,
        floor: 5,
        description: 'Updated description',
        status: 'MAINTENANCE',
      })
    })

    it('update room - set to AVAILABLE with active bookings - returns 409 conflict', async () => {
      const room = await T.createTestRoom(sut, owner.accessToken, hotelServiceId, {
        number: '601',
      })

      const customer = await T.createTestUser(sut, {
        email: T.uniqueEmail('customer'),
        password: 'Test1234!',
        name: 'Customer',
      })

      const checkInDate = futureDate(10)
      const availability = await T.createTestAvailability(sut, owner.accessToken, hotelServiceId, {
        date: checkInDate,
        startTime: '14:00',
        endTime: '15:00',
        capacity: 1,
      })
      
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availability.id,
        checkInDate,
        checkOutDate: futureCheckOutDate(checkInDate, 4),
        roomId: room.id,
      })

      const response = await T.put<ErrorResponse>(sut, `/v1/rooms/${room.id}`, {
        token: owner.accessToken,
        payload: { status: 'AVAILABLE' as const },
      })

      T.expectError(response, 409, 'CONFLICT')

      await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })
    })

    it('update room - non-owner - returns 403 forbidden', async () => {
      const room = await T.createTestRoom(sut, owner.accessToken, hotelServiceId, {
        number: '701',
      })

      const customer = await T.createTestUser(sut, {
        email: T.uniqueEmail('customer'),
        password: 'Test1234!',
        name: 'Customer',
      })

      const response = await T.put(sut, `/v1/rooms/${room.id}`, {
        token: customer.accessToken,
        payload: { description: 'Unauthorized update' },
      })

      T.expectStatus(response, 403)
    })
  })

  describe('DELETE /v1/rooms/:id', () => {
    it('delete room - valid room - returns 200', async () => {
      const room = await T.createTestRoom(sut, owner.accessToken, hotelServiceId, {
        number: '801',
      })

      const response = await T.del(sut, `/v1/rooms/${room.id}`, {
        token: owner.accessToken,
      })

      T.expectStatus(response, 200)

      const getResponse = await T.get(sut, `/v1/rooms/${room.id}`)
      T.expectStatus(getResponse, 404)
    })

    it('delete room - with active bookings - returns 409 conflict', async () => {
      const room = await T.createTestRoom(sut, owner.accessToken, hotelServiceId, {
        number: '901',
      })

      const customer = await T.createTestUser(sut, {
        email: T.uniqueEmail('delete-room-customer'),
        password: 'Test1234!',
        name: 'Customer',
      })

      const checkInDate = futureDate(50)
      const availability = await T.createTestAvailability(sut, owner.accessToken, hotelServiceId, {
        date: checkInDate,
        startTime: '14:00',
        endTime: '15:00',
        capacity: 1,
      })
      
      const booking = await T.createTestBooking(sut, customer.accessToken, {
        serviceId: hotelServiceId,
        availabilityId: availability.id,
        checkInDate,
        checkOutDate: futureCheckOutDate(checkInDate, 5),
        roomId: room.id,
      })

      const response = await T.del<ErrorResponse>(sut, `/v1/rooms/${room.id}`, {
        token: owner.accessToken,
      })

      T.expectError(response, 409, 'CONFLICT')

      await T.put(sut, `/v1/bookings/${booking.id}/cancel`, {
        token: customer.accessToken,
      })
    })
  })
})
