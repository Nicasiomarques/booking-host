import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { AvailabilityService } from '../../../../application/availability.service.js'
import { AvailabilityRepository } from '../../../outbound/prisma/availability.repository.js'
import { ServiceRepository } from '../../../outbound/prisma/service.repository.js'
import { EstablishmentRepository } from '../../../outbound/prisma/establishment.repository.js'
import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  queryAvailabilitySchema,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  QueryAvailabilityInput,
} from '../schemas/availability.schema.js'
import { validate, validateQuery } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.middleware.js'

// Swagger schemas for Availability routes
const errorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string', example: 'Availability not found' },
      },
    },
  },
}

const availabilityResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    serviceId: { type: 'string', format: 'uuid' },
    date: { type: 'string', format: 'date', example: '2025-01-20' },
    startTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', example: '09:00' },
    endTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', example: '10:00' },
    capacity: { type: 'integer', example: 5 },
    createdAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
  },
}

const createAvailabilityBodySchema = {
  type: 'object',
  required: ['date', 'startTime', 'endTime', 'capacity'],
  properties: {
    date: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Date in YYYY-MM-DD format',
      example: '2025-01-20',
    },
    startTime: {
      type: 'string',
      pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
      description: 'Start time in HH:MM format (24h)',
      example: '09:00',
    },
    endTime: {
      type: 'string',
      pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
      description: 'End time in HH:MM format (24h). Must be after startTime.',
      example: '10:00',
    },
    capacity: {
      type: 'integer',
      minimum: 1,
      maximum: 1000,
      description: 'Number of available slots for this time period',
      example: 5,
    },
  },
}

const updateAvailabilityBodySchema = {
  type: 'object',
  properties: {
    date: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Date in YYYY-MM-DD format',
      example: '2025-01-21',
    },
    startTime: {
      type: 'string',
      pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
      description: 'Start time in HH:MM format',
      example: '10:00',
    },
    endTime: {
      type: 'string',
      pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
      description: 'End time in HH:MM format',
      example: '11:00',
    },
    capacity: {
      type: 'integer',
      minimum: 1,
      maximum: 1000,
      description: 'Number of available slots',
      example: 10,
    },
  },
}

const availabilityParamsSchema = {
  type: 'object',
  properties: {
    serviceId: { type: 'string', format: 'uuid', description: 'Service UUID' },
    id: { type: 'string', format: 'uuid', description: 'Availability UUID' },
  },
}

const queryAvailabilityQuerySchema = {
  type: 'object',
  properties: {
    startDate: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Filter availabilities from this date (YYYY-MM-DD)',
      example: '2025-01-15',
    },
    endDate: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Filter availabilities until this date (YYYY-MM-DD)',
      example: '2025-01-31',
    },
  },
}

export default async function availabilityRoutes(fastify: FastifyInstance) {
  const availabilityRepository = new AvailabilityRepository(fastify.prisma)
  const serviceRepository = new ServiceRepository(fastify.prisma)
  const establishmentRepository = new EstablishmentRepository(fastify.prisma)
  const service = new AvailabilityService(
    availabilityRepository,
    serviceRepository,
    establishmentRepository
  )

  // POST /v1/services/:serviceId/availabilities - Create availability (OWNER only)
  fastify.post<{ Params: { serviceId: string }; Body: CreateAvailabilityInput }>(
    '/services/:serviceId/availabilities',
    {
      schema: {
        tags: ['Availabilities'],
        summary: 'Create availability slot',
        description: 'Creates a new availability time slot for a service. Only the establishment owner can perform this action. Validates for time overlaps with existing slots.',
        security: [{ bearerAuth: [] }],
        params: availabilityParamsSchema,
        body: createAvailabilityBodySchema,
        response: {
          201: {
            description: 'Availability created successfully',
            ...availabilityResponseSchema,
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
          409: {
            description: 'Time slot overlaps with existing availability',
            ...errorResponseSchema,
          },
          422: {
            description: 'Validation error',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate, validate(createAvailabilitySchema)],
    },
    async (
      request: FastifyRequest<{ Params: { serviceId: string }; Body: CreateAvailabilityInput }>,
      reply: FastifyReply
    ) => {
      const result = await service.create(
        request.params.serviceId,
        {
          date: new Date(request.body.date),
          startTime: request.body.startTime,
          endTime: request.body.endTime,
          capacity: request.body.capacity,
        },
        request.user.userId
      )
      return reply.status(201).send(result)
    }
  )

  // GET /v1/services/:serviceId/availabilities - List availabilities (public)
  fastify.get<{ Params: { serviceId: string }; Querystring: QueryAvailabilityInput }>(
    '/services/:serviceId/availabilities',
    {
      schema: {
        tags: ['Availabilities'],
        summary: 'List service availabilities',
        description: 'Retrieves all availability slots for a service. Can filter by date range. No authentication required.',
        params: availabilityParamsSchema,
        querystring: queryAvailabilityQuerySchema,
        response: {
          200: {
            description: 'List of availability slots',
            type: 'array',
            items: availabilityResponseSchema,
          },
          404: {
            description: 'Service not found',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [validateQuery(queryAvailabilitySchema)],
    },
    async (
      request: FastifyRequest<{ Params: { serviceId: string }; Querystring: QueryAvailabilityInput }>,
      _reply: FastifyReply
    ) => {
      const options: { startDate?: Date; endDate?: Date } = {}
      if (request.query.startDate) {
        options.startDate = new Date(request.query.startDate)
      }
      if (request.query.endDate) {
        options.endDate = new Date(request.query.endDate)
      }
      return service.findByService(request.params.serviceId, options)
    }
  )

  // PUT /v1/availabilities/:id - Update availability (OWNER only)
  fastify.put<{ Params: { id: string }; Body: UpdateAvailabilityInput }>(
    '/availabilities/:id',
    {
      schema: {
        tags: ['Availabilities'],
        summary: 'Update availability slot',
        description: 'Updates an existing availability slot. Only the establishment owner can perform this action.',
        security: [{ bearerAuth: [] }],
        params: availabilityParamsSchema,
        body: updateAvailabilityBodySchema,
        response: {
          200: {
            description: 'Availability updated successfully',
            ...availabilityResponseSchema,
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
            description: 'Availability not found',
            ...errorResponseSchema,
          },
          409: {
            description: 'Time slot overlaps with existing availability',
            ...errorResponseSchema,
          },
          422: {
            description: 'Validation error',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [authenticate, validate(updateAvailabilitySchema)],
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateAvailabilityInput }>,
      _reply: FastifyReply
    ) => {
      const updateData: { date?: Date; startTime?: string; endTime?: string; capacity?: number } = {}
      if (request.body.date) {
        updateData.date = new Date(request.body.date)
      }
      if (request.body.startTime) {
        updateData.startTime = request.body.startTime
      }
      if (request.body.endTime) {
        updateData.endTime = request.body.endTime
      }
      if (request.body.capacity !== undefined) {
        updateData.capacity = request.body.capacity
      }
      return service.update(request.params.id, updateData, request.user.userId)
    }
  )

  // DELETE /v1/availabilities/:id - Delete availability (OWNER only)
  fastify.delete<{ Params: { id: string } }>(
    '/availabilities/:id',
    {
      schema: {
        tags: ['Availabilities'],
        summary: 'Delete availability slot',
        description: 'Deletes an availability slot. Only the establishment owner can perform this action. Cannot delete if there are existing bookings.',
        security: [{ bearerAuth: [] }],
        params: availabilityParamsSchema,
        response: {
          200: {
            description: 'Availability deleted successfully',
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
            description: 'Availability not found',
            ...errorResponseSchema,
          },
          409: {
            description: 'Cannot delete availability with existing bookings',
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
