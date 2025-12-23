import { FastifyInstance } from 'fastify'
import { post, put, get, expectStatus } from './http.js'

export interface BookingData {
  serviceId: string
  availabilityId: string
  quantity?: number
  extras?: Array<{ extraItemId: string; quantity: number }>
}

export interface BookingResponse {
  id: string
  status: string
  totalPrice: number
  quantity: number
  serviceId: string
  availabilityId: string
  service?: unknown
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
