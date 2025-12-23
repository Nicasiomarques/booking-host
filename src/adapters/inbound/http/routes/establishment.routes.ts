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

// Swagger schemas for Establishment routes
const errorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string', example: 'Establishment not found' },
      },
    },
  },
}

const establishmentResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    name: { type: 'string', example: 'Wellness Spa Center' },
    description: { type: 'string', example: 'A premium spa offering relaxation and wellness services' },
    address: { type: 'string', example: '123 Main Street, Downtown, City 12345' },
    timezone: { type: 'string', example: 'America/Sao_Paulo' },
    active: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
  },
}

const createEstablishmentBodySchema = {
  type: 'object',
  required: ['name', 'address'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      description: 'Establishment name',
      example: 'Wellness Spa Center',
    },
    description: {
      type: 'string',
      maxLength: 1000,
      description: 'Detailed description of the establishment',
      example: 'A premium spa offering relaxation and wellness services including massage, facials, and aromatherapy.',
    },
    address: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
      description: 'Full address of the establishment',
      example: '123 Main Street, Downtown, City 12345',
    },
    timezone: {
      type: 'string',
      description: 'IANA timezone identifier',
      default: 'UTC',
      example: 'America/Sao_Paulo',
    },
  },
}

const updateEstablishmentBodySchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      description: 'Establishment name',
      example: 'Wellness Spa Center - Updated',
    },
    description: {
      type: 'string',
      maxLength: 1000,
      description: 'Detailed description',
      example: 'Updated description of the spa center.',
    },
    address: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
      description: 'Full address',
      example: '456 New Avenue, Uptown, City 54321',
    },
    timezone: {
      type: 'string',
      description: 'IANA timezone identifier',
      example: 'America/New_York',
    },
    active: {
      type: 'boolean',
      description: 'Whether the establishment is active',
      example: true,
    },
  },
}

const establishmentIdParamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Establishment UUID' },
    establishmentId: { type: 'string', format: 'uuid', description: 'Establishment UUID' },
  },
}

export default async function establishmentRoutes(fastify: FastifyInstance) {
  const repository = new EstablishmentRepository(fastify.prisma)
  const service = new EstablishmentService(repository)

  // POST /v1/establishments - Create establishment
  fastify.post<{ Body: CreateEstablishmentInput }>(
    '/',
    {
      schema: {
        tags: ['Establishments'],
        summary: 'Create a new establishment',
        description: 'Creates a new establishment. The authenticated user becomes the owner automatically.',
        security: [{ bearerAuth: [] }],
        body: createEstablishmentBodySchema,
        response: {
          201: {
            description: 'Establishment created successfully',
            ...establishmentResponseSchema,
          },
          401: {
            description: 'Unauthorized',
            ...errorResponseSchema,
          },
          422: {
            description: 'Validation error',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate, validate(createEstablishmentSchema)],
    },
    async (request: FastifyRequest<{ Body: CreateEstablishmentInput }>, reply: FastifyReply) => {
      const establishment = await service.create(request.body, request.user.userId)
      return reply.status(201).send(establishment)
    }
  )

  // GET /v1/establishments/my - Get user's establishments
  fastify.get(
    '/my',
    {
      schema: {
        tags: ['Establishments'],
        summary: 'Get my establishments',
        description: 'Retrieves all establishments owned or managed by the authenticated user.',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'List of user establishments',
            type: 'array',
            items: establishmentResponseSchema,
          },
          401: {
            description: 'Unauthorized',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      return service.findByUserId(request.user.userId)
    }
  )

  // GET /v1/establishments/:id - Get establishment by ID (public)
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        tags: ['Establishments'],
        summary: 'Get establishment by ID',
        description: 'Retrieves public information about an establishment. No authentication required.',
        params: establishmentIdParamSchema,
        response: {
          200: {
            description: 'Establishment details',
            ...establishmentResponseSchema,
          },
          404: {
            description: 'Establishment not found',
            ...errorResponseSchema,
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
      return service.findById(request.params.id)
    }
  )

  // PUT /v1/establishments/:establishmentId - Update establishment (OWNER only)
  fastify.put<{ Params: { establishmentId: string }; Body: UpdateEstablishmentInput }>(
    '/:establishmentId',
    {
      schema: {
        tags: ['Establishments'],
        summary: 'Update establishment',
        description: 'Updates an existing establishment. Only the owner can perform this action.',
        security: [{ bearerAuth: [] }],
        params: establishmentIdParamSchema,
        body: updateEstablishmentBodySchema,
        response: {
          200: {
            description: 'Establishment updated successfully',
            ...establishmentResponseSchema,
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
      preHandler: [authenticate, validate(updateEstablishmentSchema), requireRole('OWNER')],
    },
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
