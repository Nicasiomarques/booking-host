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

// Swagger schemas for Service routes
const errorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string', example: 'Service not found' },
      },
    },
  },
}

const serviceResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    establishmentId: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Deep Tissue Massage' },
    description: { type: 'string', example: 'A therapeutic massage that focuses on realigning deeper layers of muscles' },
    basePrice: { type: 'number', example: 120.00 },
    durationMinutes: { type: 'integer', example: 60 },
    capacity: { type: 'integer', example: 1 },
    active: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
  },
}

const createServiceBodySchema = {
  type: 'object',
  required: ['name', 'basePrice', 'durationMinutes'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      description: 'Service name',
      example: 'Deep Tissue Massage',
    },
    description: {
      type: 'string',
      maxLength: 1000,
      description: 'Detailed description of the service',
      example: 'A therapeutic massage that focuses on realigning deeper layers of muscles and connective tissue.',
    },
    basePrice: {
      type: 'number',
      minimum: 0.01,
      multipleOf: 0.01,
      description: 'Base price per booking (in currency units)',
      example: 120.00,
    },
    durationMinutes: {
      type: 'integer',
      minimum: 1,
      maximum: 1440,
      description: 'Service duration in minutes (max 24 hours)',
      example: 60,
    },
    capacity: {
      type: 'integer',
      minimum: 1,
      maximum: 1000,
      default: 1,
      description: 'Maximum number of simultaneous bookings',
      example: 1,
    },
  },
}

const updateServiceBodySchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      description: 'Service name',
      example: 'Premium Deep Tissue Massage',
    },
    description: {
      type: 'string',
      maxLength: 1000,
      description: 'Detailed description',
      example: 'Updated description of the massage service.',
    },
    basePrice: {
      type: 'number',
      minimum: 0.01,
      multipleOf: 0.01,
      description: 'Base price per booking',
      example: 150.00,
    },
    durationMinutes: {
      type: 'integer',
      minimum: 1,
      maximum: 1440,
      description: 'Service duration in minutes',
      example: 90,
    },
    capacity: {
      type: 'integer',
      minimum: 1,
      maximum: 1000,
      description: 'Maximum simultaneous bookings',
      example: 2,
    },
    active: {
      type: 'boolean',
      description: 'Whether the service is active',
      example: true,
    },
  },
}

const serviceParamsSchema = {
  type: 'object',
  properties: {
    establishmentId: { type: 'string', format: 'uuid', description: 'Establishment UUID' },
    id: { type: 'string', format: 'uuid', description: 'Service UUID' },
  },
}

const listServicesQuerySchema = {
  type: 'object',
  properties: {
    active: { type: 'string', enum: ['true', 'false'], description: 'Filter by active status' },
  },
}

export default async function serviceRoutes(fastify: FastifyInstance) {
  const serviceRepository = new ServiceRepository(fastify.prisma)
  const establishmentRepository = new EstablishmentRepository(fastify.prisma)
  const service = new ServiceService(serviceRepository, establishmentRepository)

  // POST /v1/establishments/:establishmentId/services - Create service (OWNER only)
  fastify.post<{ Params: { establishmentId: string }; Body: CreateServiceInput }>(
    '/establishments/:establishmentId/services',
    {
      schema: {
        tags: ['Services'],
        summary: 'Create a new service',
        description: 'Creates a new service for an establishment. Only the establishment owner can perform this action.',
        security: [{ bearerAuth: [] }],
        params: serviceParamsSchema,
        body: createServiceBodySchema,
        response: {
          201: {
            description: 'Service created successfully',
            ...serviceResponseSchema,
          },
          401: {
            description: 'Unauthorized',
            ...errorResponseSchema,
          },
          403: {
            description: 'Insufficient permissions (OWNER required)',
            ...errorResponseSchema,
          },
          404: {
            description: 'Establishment not found',
            ...errorResponseSchema,
          },
          422: {
            description: 'Validation error',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate, validate(createServiceSchema), requireRole('OWNER')],
    },
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
    {
      schema: {
        tags: ['Services'],
        summary: 'List establishment services',
        description: 'Retrieves all services for an establishment. Can filter by active status. No authentication required.',
        params: serviceParamsSchema,
        querystring: listServicesQuerySchema,
        response: {
          200: {
            description: 'List of services',
            type: 'array',
            items: serviceResponseSchema,
          },
          404: {
            description: 'Establishment not found',
            ...errorResponseSchema,
          },
        },
      },
    },
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
    {
      schema: {
        tags: ['Services'],
        summary: 'Get service by ID',
        description: 'Retrieves detailed information about a specific service. No authentication required.',
        params: serviceParamsSchema,
        response: {
          200: {
            description: 'Service details',
            ...serviceResponseSchema,
          },
          404: {
            description: 'Service not found',
            ...errorResponseSchema,
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      return service.findById(request.params.id)
    }
  )

  // PUT /v1/services/:id - Update service (OWNER only)
  fastify.put<{ Params: { id: string }; Body: UpdateServiceInput }>(
    '/services/:id',
    {
      schema: {
        tags: ['Services'],
        summary: 'Update service',
        description: 'Updates an existing service. Only the establishment owner can perform this action.',
        security: [{ bearerAuth: [] }],
        params: serviceParamsSchema,
        body: updateServiceBodySchema,
        response: {
          200: {
            description: 'Service updated successfully',
            ...serviceResponseSchema,
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
      preHandler: [authenticate, validate(updateServiceSchema)],
    },
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
    {
      schema: {
        tags: ['Services'],
        summary: 'Delete service',
        description: 'Soft deletes a service (sets active to false). Only the establishment owner can perform this action.',
        security: [{ bearerAuth: [] }],
        params: serviceParamsSchema,
        response: {
          200: {
            description: 'Service deleted successfully',
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
            description: 'Service not found',
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
