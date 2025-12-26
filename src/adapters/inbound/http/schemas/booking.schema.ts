import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { uuidSchema, paginationSchema } from './common.schema.js'

extendZodWithOpenApi(z)

export const bookingExtraSchema = z.object({
  extraItemId: uuidSchema,
  quantity: z.number().int().positive().max(100).openapi({
    description: 'Quantity of this extra',
    example: 1,
  }),
}).openapi('BookingExtra', {
  example: {
    extraItemId: '550e8400-e29b-41d4-a716-446655440005',
    quantity: 1,
  },
})

export const createBookingSchema = z.object({
  serviceId: uuidSchema,
  availabilityId: uuidSchema,
  quantity: z.number().int().positive().max(100).openapi({
    description: 'Number of bookings',
    example: 1,
  }),
  extras: z.array(bookingExtraSchema).optional().openapi({
    description: 'Optional extra items to add',
  }),
}).openapi('CreateBookingInput', {
  example: {
    serviceId: '550e8400-e29b-41d4-a716-446655440003',
    availabilityId: '550e8400-e29b-41d4-a716-446655440004',
    quantity: 1,
    extras: [
      {
        extraItemId: '550e8400-e29b-41d4-a716-446655440005',
        quantity: 1,
      },
    ],
  },
})

export const listBookingsQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional().openapi({
    description: 'Filter by booking status',
    example: 'CONFIRMED',
  }),
}).openapi('ListBookingsQuery')

export const bookingExtraResponseSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  extraItemId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440001' }),
  quantity: z.number().int().openapi({ example: 1 }),
  priceAtBooking: z.number().openapi({ example: 25.00 }),
  extraItem: z.object({
    name: z.string().openapi({ example: 'Hot Stones' }),
  }),
}).openapi('BookingExtraResponse', {
  example: {
    id: '550e8400-e29b-41d4-a716-446655440006',
    extraItemId: '550e8400-e29b-41d4-a716-446655440005',
    quantity: 1,
    priceAtBooking: 25.00,
    extraItem: {
      name: 'Hot Stones',
    },
  },
})

export const bookingResponseSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  userId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440001' }),
  establishmentId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440002' }),
  serviceId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440003' }),
  availabilityId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440004' }),
  quantity: z.number().int().openapi({ example: 1 }),
  totalPrice: z.number().openapi({ example: 175.00 }),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).openapi({ example: 'CONFIRMED' }),
  createdAt: z.string().datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
  service: z.object({
    name: z.string().openapi({ example: 'Deep Tissue Massage' }),
    durationMinutes: z.number().int().openapi({ example: 60 }),
  }),
  availability: z.object({
    date: z.string().openapi({ example: '2025-01-20' }),
    startTime: z.string().openapi({ example: '09:00' }),
    endTime: z.string().openapi({ example: '10:00' }),
  }),
  establishment: z.object({
    name: z.string().openapi({ example: 'Wellness Spa Center' }),
  }),
  user: z.object({
    name: z.string().openapi({ example: 'John Doe' }),
    email: z.string().email().openapi({ example: 'john.doe@example.com' }),
  }).optional(),
  extras: z.array(bookingExtraResponseSchema),
}).openapi('BookingResponse', {
  example: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    establishmentId: '550e8400-e29b-41d4-a716-446655440002',
    serviceId: '550e8400-e29b-41d4-a716-446655440003',
    availabilityId: '550e8400-e29b-41d4-a716-446655440004',
    quantity: 1,
    totalPrice: 175.00,
    status: 'CONFIRMED',
    createdAt: '2025-01-15T10:30:00.000Z',
    updatedAt: '2025-01-15T10:30:00.000Z',
    service: {
      name: 'Deep Tissue Massage',
      durationMinutes: 60,
    },
    availability: {
      date: '2025-01-20',
      startTime: '09:00',
      endTime: '10:00',
    },
    establishment: {
      name: 'Wellness Spa Center',
    },
    extras: [
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        extraItemId: '550e8400-e29b-41d4-a716-446655440005',
        quantity: 1,
        priceAtBooking: 25.00,
        extraItem: {
          name: 'Hot Stones',
        },
      },
    ],
  },
})

export const bookingIdParamSchema = z.object({
  bookingId: z.string().uuid().openapi({
    description: 'Booking UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  }),
}).openapi('BookingIdParam')

export const paginatedBookingsResponseSchema = z.object({
  data: z.array(bookingResponseSchema),
  meta: z.object({
    total: z.number().int().openapi({ example: 25 }),
    page: z.number().int().openapi({ example: 1 }),
    limit: z.number().int().openapi({ example: 20 }),
    totalPages: z.number().int().openapi({ example: 2 }),
  }),
}).openapi('PaginatedBookingsResponse', {
  example: {
    data: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        establishmentId: '550e8400-e29b-41d4-a716-446655440002',
        serviceId: '550e8400-e29b-41d4-a716-446655440003',
        availabilityId: '550e8400-e29b-41d4-a716-446655440004',
        quantity: 1,
        totalPrice: 175.00,
        status: 'CONFIRMED',
        createdAt: '2025-01-15T10:30:00.000Z',
        updatedAt: '2025-01-15T10:30:00.000Z',
        service: {
          name: 'Deep Tissue Massage',
          durationMinutes: 60,
        },
        availability: {
          date: '2025-01-20',
          startTime: '09:00',
          endTime: '10:00',
        },
        establishment: {
          name: 'Wellness Spa Center',
        },
        extras: [],
      },
    ],
    meta: {
      total: 25,
      page: 1,
      limit: 20,
      totalPages: 2,
    },
  },
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type ListBookingsQueryInput = z.infer<typeof listBookingsQuerySchema>
export type BookingResponse = z.infer<typeof bookingResponseSchema>
