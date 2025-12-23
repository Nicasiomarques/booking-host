import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  createEstablishmentSchema,
  updateEstablishmentSchema,
  establishmentResponseSchema,
  establishmentWithRoleResponseSchema,
  establishmentIdParamSchema,
  CreateEstablishmentInput,
  UpdateEstablishmentInput,
} from '../schemas/index.js'
import { ErrorResponseSchema, buildRouteSchema } from '../openapi/index.js'
import { validate, authenticate, requireRole } from '../middleware/index.js'

const idParamSchema = z.object({
  id: z.string().uuid(),
})

export default async function establishmentRoutes(fastify: FastifyInstance) {
  const { establishment: service } = fastify.services

  fastify.post<{ Body: CreateEstablishmentInput }>(
    '/',
    {
      schema: buildRouteSchema({
        tags: ['Establishments'],
        summary: 'Create a new establishment',
        description: 'Creates a new establishment. The authenticated user becomes the owner automatically.',
        security: true,
        body: createEstablishmentSchema,
        responses: {
          201: { description: 'Establishment created successfully', schema: establishmentResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, validate(createEstablishmentSchema)],
    },
    async (request: FastifyRequest<{ Body: CreateEstablishmentInput }>, reply: FastifyReply) => {
      const establishment = await service.create(request.body, request.user.userId)
      return reply.status(201).send(establishment)
    }
  )

  fastify.get(
    '/my',
    {
      schema: buildRouteSchema({
        tags: ['Establishments'],
        summary: 'Get my establishments',
        description: 'Retrieves all establishments owned or managed by the authenticated user.',
        security: true,
        responses: {
          200: { description: 'List of user establishments', schema: z.array(establishmentWithRoleResponseSchema) },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate],
    },
    async (request: FastifyRequest) => {
      return service.findByUserId(request.user.userId)
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: buildRouteSchema({
        tags: ['Establishments'],
        summary: 'Get establishment by ID',
        description: 'Retrieves public information about an establishment. No authentication required.',
        params: idParamSchema,
        responses: {
          200: { description: 'Establishment details', schema: establishmentResponseSchema },
          404: { description: 'Establishment not found', schema: ErrorResponseSchema },
        },
      }),
    },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      return service.findById(request.params.id)
    }
  )

  fastify.put<{ Params: { establishmentId: string }; Body: UpdateEstablishmentInput }>(
    '/:establishmentId',
    {
      schema: buildRouteSchema({
        tags: ['Establishments'],
        summary: 'Update establishment',
        description: 'Updates an existing establishment. Only the owner can perform this action.',
        security: true,
        params: establishmentIdParamSchema,
        body: updateEstablishmentSchema,
        responses: {
          200: { description: 'Establishment updated successfully', schema: establishmentResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions (OWNER required)', schema: ErrorResponseSchema },
          404: { description: 'Establishment not found', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, validate(updateEstablishmentSchema), requireRole('OWNER')],
    },
    async (
      request: FastifyRequest<{ Params: { establishmentId: string }; Body: UpdateEstablishmentInput }>
    ) => {
      return service.update(
        request.params.establishmentId,
        request.body,
        request.user.userId
      )
    }
  )
}
