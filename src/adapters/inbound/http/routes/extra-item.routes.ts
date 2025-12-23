import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ExtraItemService } from '../../../../application/extra-item.service.js'
import { ExtraItemRepository } from '../../../outbound/prisma/extra-item.repository.js'
import { ServiceRepository } from '../../../outbound/prisma/service.repository.js'
import { EstablishmentRepository } from '../../../outbound/prisma/establishment.repository.js'
import {
  createExtraItemSchema,
  updateExtraItemSchema,
  CreateExtraItemInput,
  UpdateExtraItemInput,
} from '../schemas/extra-item.schema.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.middleware.js'

export default async function extraItemRoutes(fastify: FastifyInstance) {
  const extraItemRepository = new ExtraItemRepository(fastify.prisma)
  const serviceRepository = new ServiceRepository(fastify.prisma)
  const establishmentRepository = new EstablishmentRepository(fastify.prisma)
  const service = new ExtraItemService(
    extraItemRepository,
    serviceRepository,
    establishmentRepository
  )

  // POST /v1/services/:serviceId/extras - Create extra item (OWNER only)
  fastify.post<{ Params: { serviceId: string }; Body: CreateExtraItemInput }>(
    '/services/:serviceId/extras',
    { schema: { tags: ['Extras'] }, preHandler: [authenticate, validate(createExtraItemSchema)] },
    async (
      request: FastifyRequest<{ Params: { serviceId: string }; Body: CreateExtraItemInput }>,
      reply: FastifyReply
    ) => {
      const result = await service.create(
        request.params.serviceId,
        request.body,
        request.user.userId
      )
      return reply.status(201).send(result)
    }
  )

  // GET /v1/services/:serviceId/extras - List extras for service (public)
  fastify.get<{ Params: { serviceId: string }; Querystring: { active?: string } }>(
    '/services/:serviceId/extras',
    { schema: { tags: ['Extras'] } },
    async (
      request: FastifyRequest<{ Params: { serviceId: string }; Querystring: { active?: string } }>,
      _reply: FastifyReply
    ) => {
      const activeOnly = request.query.active === 'true'
      return service.findByService(request.params.serviceId, { activeOnly })
    }
  )

  // PUT /v1/extras/:id - Update extra item (OWNER only)
  fastify.put<{ Params: { id: string }; Body: UpdateExtraItemInput }>(
    '/extras/:id',
    { schema: { tags: ['Extras'] }, preHandler: [authenticate, validate(updateExtraItemSchema)] },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateExtraItemInput }>,
      _reply: FastifyReply
    ) => {
      return service.update(request.params.id, request.body, request.user.userId)
    }
  )

  // DELETE /v1/extras/:id - Soft delete extra item (OWNER only)
  fastify.delete<{ Params: { id: string } }>(
    '/extras/:id',
    { schema: { tags: ['Extras'] }, preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      await service.delete(request.params.id, request.user.userId)
      return { success: true }
    }
  )
}
