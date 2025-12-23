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

// Swagger schemas for Extra Item routes
const errorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string', example: 'Extra item not found' },
      },
    },
  },
}

const extraItemResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    serviceId: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Aromatherapy Oil' },
    price: { type: 'number', example: 25.00 },
    maxQuantity: { type: 'integer', example: 3 },
    active: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
  },
}

const createExtraItemBodySchema = {
  type: 'object',
  required: ['name', 'price'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      description: 'Name of the extra item',
      example: 'Aromatherapy Oil',
    },
    price: {
      type: 'number',
      minimum: 0,
      multipleOf: 0.01,
      description: 'Price of the extra item (can be 0 for free extras)',
      example: 25.00,
    },
    maxQuantity: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 1,
      description: 'Maximum quantity per booking',
      example: 3,
    },
  },
}

const updateExtraItemBodySchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      description: 'Name of the extra item',
      example: 'Premium Aromatherapy Oil',
    },
    price: {
      type: 'number',
      minimum: 0,
      multipleOf: 0.01,
      description: 'Price of the extra item',
      example: 35.00,
    },
    maxQuantity: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      description: 'Maximum quantity per booking',
      example: 5,
    },
    active: {
      type: 'boolean',
      description: 'Whether the extra item is available for booking',
      example: true,
    },
  },
}

const extraItemParamsSchema = {
  type: 'object',
  properties: {
    serviceId: { type: 'string', format: 'uuid', description: 'Service UUID' },
    id: { type: 'string', format: 'uuid', description: 'Extra item UUID' },
  },
}

const listExtrasQuerySchema = {
  type: 'object',
  properties: {
    active: { type: 'string', enum: ['true', 'false'], description: 'Filter by active status' },
  },
}

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
    {
      schema: {
        tags: ['Extras'],
        summary: 'Create extra item',
        description: 'Creates a new extra item for a service. Extra items are add-ons that can be included in bookings. Only the establishment owner can perform this action.',
        security: [{ bearerAuth: [] }],
        params: extraItemParamsSchema,
        body: createExtraItemBodySchema,
        response: {
          201: {
            description: 'Extra item created successfully',
            ...extraItemResponseSchema,
          },
          401: {
            description: 'Unauthorized',
            ...errorResponseSchema,
          },
          403: {
            description: 'Insufficient permissions',
            ...errorResponseSchema,
          },
          404: {
            description: 'Service not found',
            ...errorResponseSchema,
          },
          422: {
            description: 'Validation error',
            ...errorResponseSchema,
          },
        },
      },
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
      return reply.status(201).send(result)
    }
  )

  // GET /v1/services/:serviceId/extras - List extras for service (public)
  fastify.get<{ Params: { serviceId: string }; Querystring: { active?: string } }>(
    '/services/:serviceId/extras',
    {
      schema: {
        tags: ['Extras'],
        summary: 'List extra items',
        description: 'Retrieves all extra items available for a service. Can filter by active status. No authentication required.',
        params: extraItemParamsSchema,
        querystring: listExtrasQuerySchema,
        response: {
          200: {
            description: 'List of extra items',
            type: 'array',
            items: extraItemResponseSchema,
          },
          404: {
            description: 'Service not found',
            ...errorResponseSchema,
          },
        },
      },
    },
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
    {
      schema: {
        tags: ['Extras'],
        summary: 'Update extra item',
        description: 'Updates an existing extra item. Only the establishment owner can perform this action.',
        security: [{ bearerAuth: [] }],
        params: extraItemParamsSchema,
        body: updateExtraItemBodySchema,
        response: {
          200: {
            description: 'Extra item updated successfully',
            ...extraItemResponseSchema,
          },
          401: {
            description: 'Unauthorized',
            ...errorResponseSchema,
          },
          403: {
            description: 'Insufficient permissions',
            ...errorResponseSchema,
          },
          404: {
            description: 'Extra item not found',
            ...errorResponseSchema,
          },
          422: {
            description: 'Validation error',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate, validate(updateExtraItemSchema)],
    },
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
    {
      schema: {
        tags: ['Extras'],
        summary: 'Delete extra item',
        description: 'Soft deletes an extra item (sets active to false). Only the establishment owner can perform this action.',
        security: [{ bearerAuth: [] }],
        params: extraItemParamsSchema,
        response: {
          200: {
            description: 'Extra item deleted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
            },
          },
          401: {
            description: 'Unauthorized',
            ...errorResponseSchema,
          },
          403: {
            description: 'Insufficient permissions',
            ...errorResponseSchema,
          },
          404: {
            description: 'Extra item not found',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      await service.delete(request.params.id, request.user.userId)
      return { success: true }
    }
  )
}
