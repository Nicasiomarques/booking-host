import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  createBookingSchema,
  listBookingsQuerySchema,
  bookingResponseSchema,
  paginatedBookingsResponseSchema,
  CreateBookingInput,
  ListBookingsQueryInput,
} from '../schemas/booking.schema.js'
import { ErrorResponseSchema } from '../openapi/common.schemas.js'
import { buildRouteSchema } from '../openapi/fastify-schema.js'
import { validate, validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.middleware.js'
import type { BookingStatus } from '../../../../domain/entities/index.js'

const idParamSchema = z.object({
  id: z.string().uuid(),
})

function formatBookingResponse<T extends { totalPrice: string | number; service?: { basePrice: string | number }; extraItems?: Array<{ priceAtBooking: string | number }> }>(booking: T) {
  return {
    ...booking,
    totalPrice: typeof booking.totalPrice === 'string' ? parseFloat(booking.totalPrice) : booking.totalPrice,
    ...(booking.service && {
      service: {
        ...booking.service,
        basePrice: typeof booking.service.basePrice === 'string' ? parseFloat(booking.service.basePrice) : booking.service.basePrice,
      },
    }),
    ...(booking.extraItems && {
      extraItems: booking.extraItems.map(item => ({
        ...item,
        priceAtBooking: typeof item.priceAtBooking === 'string' ? parseFloat(item.priceAtBooking) : item.priceAtBooking,
      })),
    }),
  }
}

function formatPaginatedBookings<T extends { data: Array<{ totalPrice: string | number; service?: { basePrice: string | number }; extraItems?: Array<{ priceAtBooking: string | number }> }> }>(result: T) {
  return {
    ...result,
    data: result.data.map(formatBookingResponse),
  }
}

export default async function bookingRoutes(fastify: FastifyInstance) {
  const { booking: service } = fastify.services

  fastify.post<{ Body: CreateBookingInput }>(
    '/bookings',
    {
      schema: buildRouteSchema({
        tags: ['Bookings'],
        summary: 'Create a new booking',
        description: 'Creates a new booking for the authenticated user. Validates availability capacity and calculates total price including extras.',
        security: true,
        body: createBookingSchema,
        responses: {
          201: { description: 'Booking created successfully', schema: bookingResponseSchema },
          401: { description: 'Unauthorized - authentication required', schema: ErrorResponseSchema },
          404: { description: 'Service or availability not found', schema: ErrorResponseSchema },
          409: { description: 'No available capacity for this slot', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, validate(createBookingSchema)],
    },
    async (request: FastifyRequest<{ Body: CreateBookingInput }>, reply: FastifyReply) => {
      const result = await service.create(request.body, request.user.userId)
      return reply.status(201).send(formatBookingResponse(result))
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/bookings/:id',
    {
      schema: buildRouteSchema({
        tags: ['Bookings'],
        summary: 'Get booking by ID',
        description: 'Retrieves a specific booking. User can only view their own bookings or bookings from establishments they manage.',
        security: true,
        params: idParamSchema,
        responses: {
          200: { description: 'Booking details', schema: bookingResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Cannot view another user\'s booking', schema: ErrorResponseSchema },
          404: { description: 'Booking not found', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      const result = await service.findById(request.params.id, request.user.userId)
      return formatBookingResponse(result)
    }
  )

  fastify.get<{ Querystring: ListBookingsQueryInput }>(
    '/bookings/my',
    {
      schema: buildRouteSchema({
        tags: ['Bookings'],
        summary: 'Get my bookings',
        description: 'Retrieves paginated list of bookings for the authenticated user. Can be filtered by status.',
        security: true,
        querystring: listBookingsQuerySchema,
        responses: {
          200: { description: 'Paginated list of user bookings', schema: paginatedBookingsResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, validateQuery(listBookingsQuerySchema)],
    },
    async (
      request: FastifyRequest<{ Querystring: ListBookingsQueryInput }>
    ) => {
      const options = {
        page: request.query.page ?? 1,
        limit: request.query.limit ?? 10,
        status: request.query.status as BookingStatus | undefined,
      }
      const result = await service.findByUser(request.user.userId, options)
      return formatPaginatedBookings(result)
    }
  )

  fastify.get<{ Params: { id: string }; Querystring: ListBookingsQueryInput }>(
    '/establishments/:id/bookings',
    {
      schema: buildRouteSchema({
        tags: ['Bookings'],
        summary: 'Get establishment bookings',
        description: 'Retrieves paginated list of bookings for an establishment. Only accessible by establishment owners/staff.',
        security: true,
        params: idParamSchema,
        querystring: listBookingsQuerySchema,
        responses: {
          200: { description: 'Paginated list of establishment bookings', schema: paginatedBookingsResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'No permission to view establishment bookings', schema: ErrorResponseSchema },
          404: { description: 'Establishment not found', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, validateQuery(listBookingsQuerySchema)],
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: ListBookingsQueryInput }>
    ) => {
      const options = {
        page: request.query.page ?? 1,
        limit: request.query.limit ?? 10,
        status: request.query.status as BookingStatus | undefined,
      }
      const result = await service.findByEstablishment(request.params.id, request.user.userId, options)
      return formatPaginatedBookings(result)
    }
  )

  fastify.put<{ Params: { id: string } }>(
    '/bookings/:id/cancel',
    {
      schema: buildRouteSchema({
        tags: ['Bookings'],
        summary: 'Cancel a booking',
        description: 'Cancels a booking and restores the availability capacity. Users can only cancel their own bookings.',
        security: true,
        params: idParamSchema,
        responses: {
          200: { description: 'Booking cancelled successfully', schema: bookingResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Cannot cancel another user\'s booking', schema: ErrorResponseSchema },
          404: { description: 'Booking not found', schema: ErrorResponseSchema },
          409: { description: 'Booking already cancelled', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      const result = await service.cancel(request.params.id, request.user.userId)
      return formatBookingResponse(result)
    }
  )
}
