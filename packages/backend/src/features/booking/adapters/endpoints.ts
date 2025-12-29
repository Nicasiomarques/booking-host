import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  createBookingSchema,
  listBookingsQuerySchema,
  bookingResponseSchema,
  paginatedBookingsResponseSchema,
  CreateBookingInput,
  ListBookingsQueryInput,
} from './schemas.js'
import { ErrorResponseSchema, buildRouteSchema } from '#shared/adapters/http/openapi/index.js'
import { validate, validateQuery, authenticate } from '#shared/adapters/http/middleware/index.js'
import type * as Domain from '#shared/domain/index.js'
import { formatBookingResponse, formatPaginatedBookings } from './mappers.js'
import { idParamSchema } from '#shared/adapters/http/schemas/common.schema.js'
import { handleEitherAsync } from '#shared/adapters/http/utils/either-handler.js'

export default async function bookingEndpoints(fastify: FastifyInstance) {
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
      return handleEitherAsync(
        service.create(request.body, request.user.userId),
        reply,
        (result) => formatBookingResponse(result),
        201
      )
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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return handleEitherAsync(
        service.findById(request.params.id, request.user.userId),
        reply,
        (result) => formatBookingResponse(result)
      )
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
      request: FastifyRequest<{ Querystring: ListBookingsQueryInput }>,
      reply: FastifyReply
    ) => {
      const options = {
        page: request.query.page ?? 1,
        limit: request.query.limit ?? 10,
        status: request.query.status as Domain.BookingStatus | undefined,
      }
      return handleEitherAsync(
        service.findByUser(request.user.userId, options),
        reply,
        (result) => formatPaginatedBookings(result)
      )
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
      request: FastifyRequest<{ Params: { id: string }; Querystring: ListBookingsQueryInput }>,
      reply: FastifyReply
    ) => {
      const options = {
        page: request.query.page ?? 1,
        limit: request.query.limit ?? 10,
        status: request.query.status as Domain.BookingStatus | undefined,
      }
      return handleEitherAsync(
        service.findByEstablishment(request.params.id, request.user.userId, options),
        reply,
        (result) => formatPaginatedBookings(result)
      )
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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return handleEitherAsync(
        service.cancel(request.params.id, request.user.userId),
        reply,
        (result) => formatBookingResponse(result)
      )
    }
  )

  fastify.put<{ Params: { id: string } }>(
    '/bookings/:id/confirm',
    {
      schema: buildRouteSchema({
        tags: ['Bookings'],
        summary: 'Confirm a booking',
        description: 'Confirms a pending booking. Only accessible by establishment owners/staff.',
        security: true,
        params: idParamSchema,
        responses: {
          200: { description: 'Booking confirmed successfully', schema: bookingResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'No permission to confirm this booking', schema: ErrorResponseSchema },
          404: { description: 'Booking not found', schema: ErrorResponseSchema },
          409: { description: 'Booking already confirmed or cancelled', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return handleEitherAsync(
        service.confirm(request.params.id, request.user.userId),
        reply,
        (result) => formatBookingResponse(result)
      )
    }
  )

  fastify.put<{ Params: { id: string } }>(
    '/bookings/:id/check-in',
    {
      schema: buildRouteSchema({
        tags: ['Bookings'],
        summary: 'Check in a hotel booking',
        description: 'Marks a hotel booking as checked in. Only accessible by establishment owners/staff. Only available for hotel bookings.',
        security: true,
        params: idParamSchema,
        responses: {
          200: { description: 'Booking checked in successfully', schema: bookingResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'No permission to check in this booking', schema: ErrorResponseSchema },
          404: { description: 'Booking not found', schema: ErrorResponseSchema },
          409: { description: 'Booking cannot be checked in (already checked in, checked out, cancelled, or no-show)', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return handleEitherAsync(
        service.checkIn(request.params.id, request.user.userId),
        reply,
        (result) => formatBookingResponse(result)
      )
    }
  )

  fastify.put<{ Params: { id: string } }>(
    '/bookings/:id/check-out',
    {
      schema: buildRouteSchema({
        tags: ['Bookings'],
        summary: 'Check out a hotel booking',
        description: 'Marks a hotel booking as checked out and frees the room. Only accessible by establishment owners/staff. Only available for hotel bookings.',
        security: true,
        params: idParamSchema,
        responses: {
          200: { description: 'Booking checked out successfully', schema: bookingResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'No permission to check out this booking', schema: ErrorResponseSchema },
          404: { description: 'Booking not found', schema: ErrorResponseSchema },
          409: { description: 'Booking cannot be checked out (already checked out, cancelled, or no-show)', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return handleEitherAsync(
        service.checkOut(request.params.id, request.user.userId),
        reply,
        (result) => formatBookingResponse(result)
      )
    }
  )

  fastify.put<{ Params: { id: string } }>(
    '/bookings/:id/no-show',
    {
      schema: buildRouteSchema({
        tags: ['Bookings'],
        summary: 'Mark a hotel booking as no-show',
        description: 'Marks a hotel booking as no-show and frees the room. Only accessible by establishment owners/staff. Only available for hotel bookings.',
        security: true,
        params: idParamSchema,
        responses: {
          200: { description: 'Booking marked as no-show successfully', schema: bookingResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'No permission to mark this booking as no-show', schema: ErrorResponseSchema },
          404: { description: 'Booking not found', schema: ErrorResponseSchema },
          409: { description: 'Booking cannot be marked as no-show (already checked in, checked out, cancelled, or no-show)', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return handleEitherAsync(
        service.markNoShow(request.params.id, request.user.userId),
        reply,
        (result) => formatBookingResponse(result)
      )
    }
  )
}
