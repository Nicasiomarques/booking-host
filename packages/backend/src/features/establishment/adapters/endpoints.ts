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
} from './schemas.js'
import { ErrorResponseSchema, buildRouteSchema } from '#shared/adapters/http/openapi/index.js'
import { validate, authenticate, requireRole } from '#shared/adapters/http/middleware/index.js'
import { registerGetByIdEndpoint } from '#shared/adapters/http/utils/endpoint-helpers.js'
import { handleEitherAsync } from '#shared/adapters/http/utils/either-handler.js'

export default async function establishmentEndpoints(fastify: FastifyInstance) {
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
      return handleEitherAsync(
        service.create(request.body, request.user.userId),
        reply,
        (establishment) => establishment,
        201
      )
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      return handleEitherAsync(
        service.findByUserId(request.user.userId),
        reply
      )
    }
  )

  registerGetByIdEndpoint(fastify, {
    path: '/:id',
    tags: ['Establishments'],
    entityName: 'Establishment',
    responseSchema: establishmentResponseSchema,
    service: { findById: (id) => service.findById(id) },
  })

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
      request: FastifyRequest<{ Params: { establishmentId: string }; Body: UpdateEstablishmentInput }>,
      reply: FastifyReply
    ) => {
      return handleEitherAsync(
        service.update(
          request.params.establishmentId,
          request.body,
          request.user.userId
        ),
        reply
      )
    }
  )
}
