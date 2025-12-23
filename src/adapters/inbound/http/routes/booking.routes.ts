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
    { preHandler: [authenticate, validate(createBookingSchema)] },
    async (request: FastifyRequest<{ Body: CreateBookingInput }>, reply: FastifyReply) => {
      const result = await service.create(request.body, request.user.userId)
      return reply.status(201).send(result)
    }
  )

  // GET /v1/bookings/:id - Get booking by ID
  fastify.get<{ Params: { id: string } }>(
    '/bookings/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      return service.findById(request.params.id, request.user.userId)
    }
  )

  // GET /v1/bookings/my - Get current user's bookings
  fastify.get<{ Querystring: ListBookingsQueryInput }>(
    '/bookings/my',
    { preHandler: [authenticate, validateQuery(listBookingsQuerySchema)] },
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
    { preHandler: [authenticate, validateQuery(listBookingsQuerySchema)] },
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
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      return service.cancel(request.params.id, request.user.userId)
    }
  )
}
