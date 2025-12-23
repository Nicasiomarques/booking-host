import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ServiceService } from '../../../../application/service.service.js'
import { ServiceRepository } from '../../../outbound/prisma/service.repository.js'
import { EstablishmentRepository } from '../../../outbound/prisma/establishment.repository.js'
import {
  createServiceSchema,
  updateServiceSchema,
  CreateServiceInput,
  UpdateServiceInput,
} from '../schemas/service.schema.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/acl.middleware.js'

export default async function serviceRoutes(fastify: FastifyInstance) {
  const serviceRepository = new ServiceRepository(fastify.prisma)
  const establishmentRepository = new EstablishmentRepository(fastify.prisma)
  const service = new ServiceService(serviceRepository, establishmentRepository)

  // POST /v1/establishments/:establishmentId/services - Create service (OWNER only)
  fastify.post<{ Params: { establishmentId: string }; Body: CreateServiceInput }>(
    '/establishments/:establishmentId/services',
    { schema: { tags: ['Services'] }, preHandler: [authenticate, validate(createServiceSchema), requireRole('OWNER')] },
    async (
      request: FastifyRequest<{ Params: { establishmentId: string }; Body: CreateServiceInput }>,
      reply: FastifyReply
    ) => {
      const result = await service.create(
        request.params.establishmentId,
        request.body,
        request.user.userId
      )
      return reply.status(201).send(result)
    }
  )

  // GET /v1/establishments/:establishmentId/services - List services (public)
  fastify.get<{ Params: { establishmentId: string }; Querystring: { active?: string } }>(
    '/establishments/:establishmentId/services',
    { schema: { tags: ['Services'] } },
    async (
      request: FastifyRequest<{ Params: { establishmentId: string }; Querystring: { active?: string } }>,
      _reply: FastifyReply
    ) => {
      const activeOnly = request.query.active === 'true'
      return service.findByEstablishment(request.params.establishmentId, { activeOnly })
    }
  )

  // GET /v1/services/:id - Get service by ID (public)
  fastify.get<{ Params: { id: string } }>(
    '/services/:id',
    { schema: { tags: ['Services'] } },
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      return service.findById(request.params.id)
    }
  )

  // PUT /v1/services/:id - Update service (OWNER only)
  fastify.put<{ Params: { id: string }; Body: UpdateServiceInput }>(
    '/services/:id',
    { schema: { tags: ['Services'] }, preHandler: [authenticate, validate(updateServiceSchema)] },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateServiceInput }>,
      _reply: FastifyReply
    ) => {
      return service.update(request.params.id, request.body, request.user.userId)
    }
  )

  // DELETE /v1/services/:id - Soft delete service (OWNER only)
  fastify.delete<{ Params: { id: string } }>(
    '/services/:id',
    { schema: { tags: ['Services'] }, preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      await service.delete(request.params.id, request.user.userId)
      return { success: true }
    }
  )
}
