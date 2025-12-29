import { FastifyInstance } from 'fastify'
import { post } from './http.js'
import type { ErrorResponse } from './http.js'
import { createTestRoom } from './room.js'
import { futureDate, futureCheckOutDate } from './factories.js'
import type { BookingData } from './booking.js'

/**
 * Helper to create a booking payload with common defaults
 */
export function createBookingPayload(overrides: Partial<BookingData>): BookingData {
  return {
    serviceId: overrides.serviceId!,
    availabilityId: overrides.availabilityId!,
    quantity: 1,
    ...overrides,
  }
}

/**
 * Helper to test booking creation with room - returns the response for assertions
 */
export async function attemptBookingCreation(
  app: FastifyInstance,
  token: string,
  options: {
    serviceId: string
    availabilityId: string
    checkInDate?: string
    checkOutDate?: string
    roomId?: string
    roomServiceId?: string
    roomNumber?: string
    roomFloor?: number
  }
) {
  let roomId = options.roomId
  if (!roomId && options.roomServiceId) {
    const room = await createTestRoom({
      serviceId: options.roomServiceId,
      number: options.roomNumber,
      floor: options.roomFloor,
    })
    roomId = room.id
  }

  const checkInDate = options.checkInDate || futureDate(10)
  const checkOutDate = options.checkOutDate || futureCheckOutDate(checkInDate, 4)

  const bookingData = createBookingPayload({
    serviceId: options.serviceId,
    availabilityId: options.availabilityId,
    checkInDate,
    checkOutDate,
    roomId,
  })

  return await post<ErrorResponse | any>(app, '/v1/bookings', {
    token,
    payload: bookingData,
  })
}



