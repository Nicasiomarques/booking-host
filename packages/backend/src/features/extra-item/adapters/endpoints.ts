import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  createExtraItemSchema,
  updateExtraItemSchema,
  extraItemResponseSchema,
  CreateExtraItemInput,
  UpdateExtraItemInput,
} from './schemas.js'
import { ErrorResponseSchema, buildRouteSchema } from '#shared/adapters/http/openapi/index.js'
import { validate, authenticate } from '#shared/adapters/http/middleware/index.js'
import { serviceIdParamSchema } from '#features/service/adapters/schemas.js'
import { formatExtraItemResponse } from './http/mappers.js'
import { idParamSchema, activeQuerySchema } from '#shared/adapters/http/schemas/common.schema.js'
import { updateResponses, deleteResponses } from '#shared/adapters/http/utils/crud-helpers.js'

export default async function extraItemEndpoints(fastify: FastifyInstance) {
  const { extraItem: service } = fastify.services

  fastify.post<{ Params: { serviceId: string }; Body: CreateExtraItemInput }>(
    '/services/:serviceId/extras',
    {
      schema: buildRouteSchema({
        tags: ['Extras'],
        summary: 'Create extra item',
        description: 'Creates a new extra item for a service. Extra items are add-ons that can be included in bookings. Only the establishment owner can perform this action.',
        security: true,
        params: serviceIdParamSchema,
        body: createExtraItemSchema,
        responses: {
          201: { description: 'Extra item created successfully', schema: extraItemResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions', schema: ErrorResponseSchema },
          404: { description: 'Service not found', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, validate(createExtraItemSchema)],
    },
    async (
      request: FastifyRequest<{ Params: { serviceId: string }; Body: CreateExtraItemInput }>,
      reply: FastifyReply
    ) => {
      const result = await service.create(
        request.params.serviceId,
        request.body,
        request.user.userId
      )
      return reply.status(201).send(formatExtraItemResponse(result))
    }
  )

  fastify.get<{ Params: { serviceId: string }; Querystring: { active?: string } }>(
    '/services/:serviceId/extras',
    {
      schema: buildRouteSchema({
        tags: ['Extras'],
        summary: 'List extra items',
        description: 'Retrieves all extra items available for a service. Can filter by active status. No authentication required.',
        params: serviceIdParamSchema,
        querystring: activeQuerySchema,
        responses: {
          200: { description: 'List of extra items', schema: z.array(extraItemResponseSchema) },
          404: { description: 'Service not found', schema: ErrorResponseSchema },
        },
      }),
    },
    async (
      request: FastifyRequest<{ Params: { serviceId: string }; Querystring: { active?: string } }>
    ) => {
      const activeOnly = request.query.active === 'true'
      const results = await service.findByService(request.params.serviceId, { activeOnly })
      return results.map(formatExtraItemResponse)
    }
  )

  fastify.put<{ Params: { id: string }; Body: UpdateExtraItemInput }>(
    '/extras/:id',
    {
      schema: buildRouteSchema({
        tags: ['Extras'],
        summary: 'Update extra item',
        description: 'Updates an existing extra item. Only the establishment owner can perform this action.',
        security: true,
        params: idParamSchema,
        body: updateExtraItemSchema,
        responses: updateResponses('Extra item', extraItemResponseSchema),
      }),
      preHandler: [authenticate, validate(updateExtraItemSchema)],
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateExtraItemInput }>
    ) => {
      const result = await service.update(request.params.id, request.body, request.user.userId)
      return formatExtraItemResponse(result)
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    '/extras/:id',
    {
      schema: buildRouteSchema({
        tags: ['Extras'],
        summary: 'Delete extra item',
        description: 'Soft deletes an extra item (sets active to false). Only the establishment owner can perform this action.',
        security: true,
        params: idParamSchema,
        responses: deleteResponses('Extra item'),
      }),
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      await service.delete(request.params.id, request.user.userId)
      return { success: true }
    }
  )
}
