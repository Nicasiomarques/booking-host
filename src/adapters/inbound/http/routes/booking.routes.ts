import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { BookingService } from '../../../../application/booking.service.js'
import { BookingRepository } from '../../../outbound/prisma/booking.repository.js'
import { ServiceRepository } from '../../../outbound/prisma/service.repository.js'
import { AvailabilityRepository } from '../../../outbound/prisma/availability.repository.js'
import { ExtraItemRepository } from '../../../outbound/prisma/extra-item.repository.js'
import { EstablishmentRepository } from '../../../outbound/prisma/establishment.repository.js'
import {
  createBookingSchema,
  listBookingsQuerySchema,
  CreateBookingInput,
  ListBookingsQueryInput,
} from '../schemas/booking.schema.js'
import { validate, validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { BookingStatus } from '@prisma/client'

// Swagger schemas for Booking routes
const errorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string', example: 'Booking not found' },
      },
    },
  },
}

const bookingExtraSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    extraItemId: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Equipment rental' },
    quantity: { type: 'integer', example: 2 },
    priceAtBooking: { type: 'number', example: 25.00 },
  },
}

const bookingResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    userId: { type: 'string', format: 'uuid' },
    establishmentId: { type: 'string', format: 'uuid' },
    serviceId: { type: 'string', format: 'uuid' },
    availabilityId: { type: 'string', format: 'uuid' },
    quantity: { type: 'integer', example: 2 },
    totalPrice: { type: 'number', example: 150.00 },
    status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'], example: 'CONFIRMED' },
    createdAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
    service: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'Massage Therapy' },
        basePrice: { type: 'number', example: 75.00 },
        durationMinutes: { type: 'integer', example: 60 },
      },
    },
    extras: { type: 'array', items: bookingExtraSchema },
  },
}

const paginatedBookingsSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: bookingResponseSchema },
    total: { type: 'integer', example: 25 },
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 10 },
    totalPages: { type: 'integer', example: 3 },
  },
}

const createBookingBodySchema = {
  type: 'object',
  required: ['serviceId', 'availabilityId', 'quantity'],
  properties: {
    serviceId: {
      type: 'string',
      format: 'uuid',
      description: 'ID of the service to book',
      example: '550e8400-e29b-41d4-a716-446655440001',
    },
    availabilityId: {
      type: 'string',
      format: 'uuid',
      description: 'ID of the availability slot',
      example: '550e8400-e29b-41d4-a716-446655440002',
    },
    quantity: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      description: 'Number of slots to book',
      example: 2,
    },
    extras: {
      type: 'array',
      description: 'Optional extra items to add to the booking',
      items: {
        type: 'object',
        required: ['extraItemId', 'quantity'],
        properties: {
          extraItemId: {
            type: 'string',
            format: 'uuid',
            description: 'ID of the extra item',
            example: '550e8400-e29b-41d4-a716-446655440003',
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            description: 'Quantity of this extra',
            example: 1,
          },
        },
      },
    },
  },
}

const listBookingsQueryParamsSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1, description: 'Page number', example: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10, description: 'Items per page', example: 10 },
    status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'], description: 'Filter by status' },
  },
}

const uuidParamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Resource UUID' },
  },
}

export default async function bookingRoutes(fastify: FastifyInstance) {
  const bookingRepository = new BookingRepository(fastify.prisma)
  const serviceRepository = new ServiceRepository(fastify.prisma)
  const availabilityRepository = new AvailabilityRepository(fastify.prisma)
  const extraItemRepository = new ExtraItemRepository(fastify.prisma)
  const establishmentRepository = new EstablishmentRepository(fastify.prisma)

  const service = new BookingService(
    fastify.prisma,
    bookingRepository,
    serviceRepository,
    availabilityRepository,
    extraItemRepository,
    establishmentRepository
  )

  // POST /v1/bookings - Create booking (authenticated)
  fastify.post<{ Body: CreateBookingInput }>(
    '/bookings',
    {
      schema: {
        tags: ['Bookings'],
        summary: 'Create a new booking',
        description: 'Creates a new booking for the authenticated user. Validates availability capacity and calculates total price including extras.',
        security: [{ bearerAuth: [] }],
        body: createBookingBodySchema,
        response: {
          201: {
            description: 'Booking created successfully',
            ...bookingResponseSchema,
          },
          401: {
            description: 'Unauthorized - authentication required',
            ...errorResponseSchema,
          },
          404: {
            description: 'Service or availability not found',
            ...errorResponseSchema,
          },
          409: {
            description: 'No available capacity for this slot',
            ...errorResponseSchema,
          },
          422: {
            description: 'Validation error',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate, validate(createBookingSchema)],
    },
    async (request: FastifyRequest<{ Body: CreateBookingInput }>, reply: FastifyReply) => {
      const result = await service.create(request.body, request.user.userId)
      return reply.status(201).send(result)
    }
  )

  // GET /v1/bookings/:id - Get booking by ID
  fastify.get<{ Params: { id: string } }>(
    '/bookings/:id',
    {
      schema: {
        tags: ['Bookings'],
        summary: 'Get booking by ID',
        description: 'Retrieves a specific booking. User can only view their own bookings or bookings from establishments they manage.',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: {
          200: {
            description: 'Booking details',
            ...bookingResponseSchema,
          },
          401: {
            description: 'Unauthorized',
            ...errorResponseSchema,
          },
          403: {
            description: 'Cannot view another user\'s booking',
            ...errorResponseSchema,
          },
          404: {
            description: 'Booking not found',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      return service.findById(request.params.id, request.user.userId)
    }
  )

  // GET /v1/bookings/my - Get current user's bookings
  fastify.get<{ Querystring: ListBookingsQueryInput }>(
    '/bookings/my',
    {
      schema: {
        tags: ['Bookings'],
        summary: 'Get my bookings',
        description: 'Retrieves paginated list of bookings for the authenticated user. Can be filtered by status.',
        security: [{ bearerAuth: [] }],
        querystring: listBookingsQueryParamsSchema,
        response: {
          200: {
            description: 'Paginated list of user bookings',
            ...paginatedBookingsSchema,
          },
          401: {
            description: 'Unauthorized',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate, validateQuery(listBookingsQuerySchema)],
    },
    async (
      request: FastifyRequest<{ Querystring: ListBookingsQueryInput }>,
      _reply: FastifyReply
    ) => {
      const options = {
        page: request.query.page ?? 1,
        limit: request.query.limit ?? 10,
        status: request.query.status as BookingStatus | undefined,
      }
      return service.findByUser(request.user.userId, options)
    }
  )

  // GET /v1/establishments/:id/bookings - Get establishment bookings
  fastify.get<{ Params: { id: string }; Querystring: ListBookingsQueryInput }>(
    '/establishments/:id/bookings',
    {
      schema: {
        tags: ['Bookings'],
        summary: 'Get establishment bookings',
        description: 'Retrieves paginated list of bookings for an establishment. Only accessible by establishment owners/staff.',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        querystring: listBookingsQueryParamsSchema,
        response: {
          200: {
            description: 'Paginated list of establishment bookings',
            ...paginatedBookingsSchema,
          },
          401: {
            description: 'Unauthorized',
            ...errorResponseSchema,
          },
          403: {
            description: 'No permission to view establishment bookings',
            ...errorResponseSchema,
          },
          404: {
            description: 'Establishment not found',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate, validateQuery(listBookingsQuerySchema)],
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: ListBookingsQueryInput }>,
      _reply: FastifyReply
    ) => {
      const options = {
        page: request.query.page ?? 1,
        limit: request.query.limit ?? 10,
        status: request.query.status as BookingStatus | undefined,
      }
      return service.findByEstablishment(request.params.id, request.user.userId, options)
    }
  )

  // PUT /v1/bookings/:id/cancel - Cancel booking
  fastify.put<{ Params: { id: string } }>(
    '/bookings/:id/cancel',
    {
      schema: {
        tags: ['Bookings'],
        summary: 'Cancel a booking',
        description: 'Cancels a booking and restores the availability capacity. Users can only cancel their own bookings.',
        security: [{ bearerAuth: [] }],
        params: uuidParamSchema,
        response: {
          200: {
            description: 'Booking cancelled successfully',
            ...bookingResponseSchema,
          },
          401: {
            description: 'Unauthorized',
            ...errorResponseSchema,
          },
          403: {
            description: 'Cannot cancel another user\'s booking',
            ...errorResponseSchema,
          },
          404: {
            description: 'Booking not found',
            ...errorResponseSchema,
          },
          409: {
            description: 'Booking already cancelled',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      return service.cancel(request.params.id, request.user.userId)
    }
  )
}
