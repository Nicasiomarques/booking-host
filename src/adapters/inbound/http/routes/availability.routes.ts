import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { AvailabilityService } from '../../../../application/availability.service.js'
import { AvailabilityRepository } from '../../../outbound/prisma/availability.repository.js'
import { ServiceRepository } from '../../../outbound/prisma/service.repository.js'
import { EstablishmentRepository } from '../../../outbound/prisma/establishment.repository.js'
import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  queryAvailabilitySchema,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  QueryAvailabilityInput,
} from '../schemas/availability.schema.js'
import { validate, validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.middleware.js'

export default async function availabilityRoutes(fastify: FastifyInstance) {
  const availabilityRepository = new AvailabilityRepository(fastify.prisma)
  const serviceRepository = new ServiceRepository(fastify.prisma)
  const establishmentRepository = new EstablishmentRepository(fastify.prisma)
  const service = new AvailabilityService(
    availabilityRepository,
    serviceRepository,
    establishmentRepository
  )

  // POST /v1/services/:serviceId/availabilities - Create availability (OWNER only)
  fastify.post<{ Params: { serviceId: string }; Body: CreateAvailabilityInput }>(
    '/services/:serviceId/availabilities',
    { schema: { tags: ['Availabilities'] }, preHandler: [authenticate, validate(createAvailabilitySchema)] },
    async (
      request: FastifyRequest<{ Params: { serviceId: string }; Body: CreateAvailabilityInput }>,
      reply: FastifyReply
    ) => {
      const result = await service.create(
        request.params.serviceId,
        {
          date: new Date(request.body.date),
          startTime: request.body.startTime,
          endTime: request.body.endTime,
          capacity: request.body.capacity,
        },
        request.user.userId
      )
      return reply.status(201).send(result)
    }
  )

  // GET /v1/services/:serviceId/availabilities - List availabilities (public)
  fastify.get<{ Params: { serviceId: string }; Querystring: QueryAvailabilityInput }>(
    '/services/:serviceId/availabilities',
    { schema: { tags: ['Availabilities'] }, preHandler: [validateQuery(queryAvailabilitySchema)] },
    async (
      request: FastifyRequest<{ Params: { serviceId: string }; Querystring: QueryAvailabilityInput }>,
      _reply: FastifyReply
    ) => {
      const options: { startDate?: Date; endDate?: Date } = {}
      if (request.query.startDate) {
        options.startDate = new Date(request.query.startDate)
      }
      if (request.query.endDate) {
        options.endDate = new Date(request.query.endDate)
      }
      return service.findByService(request.params.serviceId, options)
    }
  )

  // PUT /v1/availabilities/:id - Update availability (OWNER only)
  fastify.put<{ Params: { id: string }; Body: UpdateAvailabilityInput }>(
    '/availabilities/:id',
    { schema: { tags: ['Availabilities'] }, preHandler: [authenticate, validate(updateAvailabilitySchema)] },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateAvailabilityInput }>,
      _reply: FastifyReply
    ) => {
      const updateData: { date?: Date; startTime?: string; endTime?: string; capacity?: number } = {}
      if (request.body.date) {
        updateData.date = new Date(request.body.date)
      }
      if (request.body.startTime) {
        updateData.startTime = request.body.startTime
      }
      if (request.body.endTime) {
        updateData.endTime = request.body.endTime
      }
      if (request.body.capacity !== undefined) {
        updateData.capacity = request.body.capacity
      }
      return service.update(request.params.id, updateData, request.user.userId)
    }
  )

  // DELETE /v1/availabilities/:id - Delete availability (OWNER only)
  fastify.delete<{ Params: { id: string } }>(
    '/availabilities/:id',
    { schema: { tags: ['Availabilities'] }, preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      await service.delete(request.params.id, request.user.userId)
      return { success: true }
    }
  )
}
