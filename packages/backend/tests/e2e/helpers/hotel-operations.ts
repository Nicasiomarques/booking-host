import { FastifyInstance } from 'fastify'
import { put, expectStatus } from './http.js'
import { createTestRoom } from './room.js'
import { createTestBooking, type BookingResponse } from './booking.js'
import { futureDate, futureCheckOutDate } from './factories.js'
import type { BookingData } from './booking.js'

export interface HotelBookingResponse extends BookingResponse {
  checkInDate?: string | null
  checkOutDate?: string | null
  roomId?: string | null
  numberOfNights?: number | null
  checkedInAt?: string | null
  checkedOutAt?: string | null
}

export interface CreateHotelBookingWithRoomOptions {
  app: FastifyInstance
  serviceId: string
  availabilityId: string
  customerToken: string
  checkInDate?: string
  checkOutDate?: string
  nights?: number
  roomId?: string
  guestName?: string
  guestEmail?: string
  guestDocument?: string
}

export interface HotelBookingWithRoom {
  booking: HotelBookingResponse
  room: Awaited<ReturnType<typeof createTestRoom>>
}

export async function createHotelBookingWithRoom(
  options: CreateHotelBookingWithRoomOptions
): Promise<HotelBookingWithRoom> {
  const {
    app,
    serviceId,
    availabilityId,
    customerToken,
    checkInDate,
    checkOutDate,
    nights = 4,
    roomId,
    guestName,
    guestEmail,
    guestDocument,
  } = options

  const finalCheckInDate = checkInDate || futureDate(10)
  const finalCheckOutDate = checkOutDate || futureCheckOutDate(finalCheckInDate, nights)

  let room
  if (roomId) {
    const { prisma } = await import('../../../src/shared/adapters/outbound/prisma/prisma.client.js')
    room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room) {
      throw new Error(`Room ${roomId} not found`)
    }
  } else {
    room = await createTestRoom({ serviceId })
  }

  const bookingData: BookingData = {
    serviceId,
    availabilityId,
    quantity: 1,
    checkInDate: finalCheckInDate,
    checkOutDate: finalCheckOutDate,
    roomId: room.id,
    guestName,
    guestEmail,
    guestDocument,
  }

  const booking = (await createTestBooking(app, customerToken, bookingData)) as HotelBookingResponse

  return { booking, room }
}

export async function checkInBooking(
  app: FastifyInstance,
  bookingId: string,
  staffToken: string
): Promise<HotelBookingResponse> {
  const response = await put<HotelBookingResponse>(app, `/v1/bookings/${bookingId}/check-in`, {
    token: staffToken,
  })
  expectStatus(response, 200)
  return response.body
}

export async function checkOutBooking(
  app: FastifyInstance,
  bookingId: string,
  staffToken: string
): Promise<HotelBookingResponse> {
  const response = await put<HotelBookingResponse>(app, `/v1/bookings/${bookingId}/check-out`, {
    token: staffToken,
  })
  expectStatus(response, 200)
  return response.body
}

export async function markNoShow(
  app: FastifyInstance,
  bookingId: string,
  staffToken: string
): Promise<HotelBookingResponse> {
  const response = await put<HotelBookingResponse>(app, `/v1/bookings/${bookingId}/no-show`, {
    token: staffToken,
  })
  expectStatus(response, 200)
  return response.body
}




