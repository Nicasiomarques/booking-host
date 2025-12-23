import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { EstablishmentService } from '../../../../application/establishment.service.js'
import { EstablishmentRepository } from '../../../outbound/prisma/establishment.repository.js'
import {
  createEstablishmentSchema,
  updateEstablishmentSchema,
  CreateEstablishmentInput,
  UpdateEstablishmentInput,
} from '../schemas/establishment.schema.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/acl.middleware.js'

export default async function establishmentRoutes(fastify: FastifyInstance) {
  const repository = new EstablishmentRepository(fastify.prisma)
  const service = new EstablishmentService(repository)

  // POST /v1/establishments - Create establishment
  fastify.post<{ Body: CreateEstablishmentInput }>(
    '/',
    { preHandler: [authenticate, validate(createEstablishmentSchema)] },
    async (request: FastifyRequest<{ Body: CreateEstablishmentInput }>, reply: FastifyReply) => {
      const establishment = await service.create(request.body, request.user.userId)
      return reply.status(201).send(establishment)
    }
  )

  // GET /v1/establishments/my - Get user's establishments
  fastify.get(
    '/my',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      return service.findByUserId(request.user.userId)
    }
  )

  // GET /v1/establishments/:id - Get establishment by ID (public)
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      return service.findById(request.params.id)
    }
  )

  // PUT /v1/establishments/:establishmentId - Update establishment (OWNER only)
  fastify.put<{ Params: { establishmentId: string }; Body: UpdateEstablishmentInput }>(
    '/:establishmentId',
    { preHandler: [authenticate, validate(updateEstablishmentSchema), requireRole('OWNER')] },
    async (
      request: FastifyRequest<{ Params: { establishmentId: string }; Body: UpdateEstablishmentInput }>,
      _reply: FastifyReply
    ) => {
      return service.update(
        request.params.establishmentId,
        request.body,
        request.user.userId
      )
    }
  )
}
