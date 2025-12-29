import { FastifyInstance } from 'fastify'
import { post, put, get, expectStatus } from './http.js'

export interface BookingData {
  serviceId: string
  availabilityId: string
  quantity?: number
  extras?: Array<{ extraItemId: string; quantity: number }>
  // Hotel-specific fields
  checkInDate?: string
  checkOutDate?: string
  roomId?: string
  guestName?: string
  guestEmail?: string
  guestDocument?: string
}

export interface BookingResponse {
  id: string
  userId: string
  establishmentId: string
  serviceId: string
  availabilityId: string
  quantity: number
  totalPrice: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW'
  // Hotel-specific fields
  checkInDate?: string | null
  checkOutDate?: string | null
  roomId?: string | null
  numberOfNights?: number | null
  numberOfGuests?: number | null
  guestName?: string | null
  guestEmail?: string | null
  guestPhone?: string | null
  guestDocument?: string | null
  notes?: string | null
  confirmedAt?: string | null
  cancelledAt?: string | null
  cancellationReason?: string | null
  checkedInAt?: string | null
  checkedOutAt?: string | null
  createdAt: string
  updatedAt: string
  service?: {
    name: string
    durationMinutes: number
  }
  availability?: {
    date: string
    startTime: string
    endTime: string
  }
  establishment?: {
    name: string
  }
  user?: {
    name: string
    email: string
  }
  extras?: Array<{
    id: string
    extraItemId: string
    quantity: number
    priceAtBooking: number
    extraItem: {
      name: string
    }
  }>
}

export async function createTestBooking(
  app: FastifyInstance,
  token: string,
  data: BookingData
): Promise<BookingResponse> {
  const response = await post<BookingResponse>(app, '/v1/bookings', {
    payload: { quantity: 1, ...data },
    token,
  })
  expectStatus(response, 201)
  return response.body
}

export async function cancelTestBooking(
  app: FastifyInstance,
  token: string,
  bookingId: string
): Promise<BookingResponse> {
  const response = await put<BookingResponse>(app, `/v1/bookings/${bookingId}/cancel`, { token })
  expectStatus(response, 200)
  return response.body
}

export async function getTestBooking(
  app: FastifyInstance,
  token: string,
  bookingId: string
): Promise<BookingResponse> {
  const response = await get<BookingResponse>(app, `/v1/bookings/${bookingId}`, { token })
  expectStatus(response, 200)
  return response.body
}
