import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  createExtraItemSchema,
  updateExtraItemSchema,
  extraItemResponseSchema,
  CreateExtraItemInput,
  UpdateExtraItemInput,
} from '../schemas/extra-item.schema.js'
import { serviceIdParamSchema } from '../schemas/service.schema.js'
import { ErrorResponseSchema, SuccessResponseSchema } from '../openapi/common.schemas.js'
import { buildRouteSchema } from '../openapi/fastify-schema.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.middleware.js'

const idParamSchema = z.object({
  id: z.string().uuid(),
})

const listExtrasQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional().openapi({
    description: 'Filter by active status',
  }),
})

function formatExtraItemResponse<T extends { price: string | number }>(extra: T) {
  return {
    ...extra,
    price: typeof extra.price === 'string' ? parseFloat(extra.price) : extra.price,
  }
}

export default async function extraItemRoutes(fastify: FastifyInstance) {
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
        querystring: listExtrasQuerySchema,
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
        responses: {
          200: { description: 'Extra item updated successfully', schema: extraItemResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions', schema: ErrorResponseSchema },
          404: { description: 'Extra item not found', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
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
        responses: {
          200: { description: 'Extra item deleted successfully', schema: SuccessResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions', schema: ErrorResponseSchema },
          404: { description: 'Extra item not found', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      await service.delete(request.params.id, request.user.userId)
      return { success: true }
    }
  )
}
