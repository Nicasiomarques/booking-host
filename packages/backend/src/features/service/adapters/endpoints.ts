import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  createServiceSchema,
  updateServiceSchema,
  serviceResponseSchema,
  CreateServiceInput,
  UpdateServiceInput,
} from './schemas.js'
import { ErrorResponseSchema, SuccessResponseSchema, buildRouteSchema } from '#shared/adapters/http/openapi/index.js'
import { validate, authenticate, requireRole } from '#shared/adapters/http/middleware/index.js'
import { formatServiceResponse } from '#shared/adapters/http/utils/response-formatters.js'
import { establishmentIdParamSchema } from '#features/establishment/adapters/schemas.js'

const idParamSchema = z.object({
  id: z.string().uuid(),
})

const listServicesQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional().openapi({
    description: 'Filter by active status',
  }),
})

export default async function serviceEndpoints(fastify: FastifyInstance) {
  const { service } = fastify.services

  fastify.post<{ Params: { establishmentId: string }; Body: CreateServiceInput }>(
    '/establishments/:establishmentId/services',
    {
      schema: buildRouteSchema({
        tags: ['Services'],
        summary: 'Create a new service',
        description: 'Creates a new service for an establishment. Only the establishment owner can perform this action.',
        security: true,
        params: establishmentIdParamSchema,
        body: createServiceSchema,
        responses: {
          201: { description: 'Service created successfully', schema: serviceResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions (OWNER required)', schema: ErrorResponseSchema },
          404: { description: 'Establishment not found', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
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
      return reply.status(201).send(formatServiceResponse(result))
    }
  )

  fastify.get<{ Params: { establishmentId: string }; Querystring: { active?: string } }>(
    '/establishments/:establishmentId/services',
    {
      schema: buildRouteSchema({
        tags: ['Services'],
        summary: 'List establishment services',
        description: 'Retrieves all services for an establishment. Can filter by active status. No authentication required.',
        params: establishmentIdParamSchema,
        querystring: listServicesQuerySchema,
        responses: {
          200: { description: 'List of services', schema: z.array(serviceResponseSchema) },
          404: { description: 'Establishment not found', schema: ErrorResponseSchema },
        },
      }),
    },
    async (
      request: FastifyRequest<{ Params: { establishmentId: string }; Querystring: { active?: string } }>
    ) => {
      const activeOnly = request.query.active === 'true'
      const results = await service.findByEstablishment(request.params.establishmentId, { activeOnly })
      return results.map(formatServiceResponse)
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/services/:id',
    {
      schema: buildRouteSchema({
        tags: ['Services'],
        summary: 'Get service by ID',
        description: 'Retrieves detailed information about a specific service. No authentication required.',
        params: idParamSchema,
        responses: {
          200: { description: 'Service details', schema: serviceResponseSchema },
          404: { description: 'Service not found', schema: ErrorResponseSchema },
        },
      }),
    },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      const result = await service.findById(request.params.id)
      return formatServiceResponse(result)
    }
  )

  fastify.put<{ Params: { id: string }; Body: UpdateServiceInput }>(
    '/services/:id',
    {
      schema: buildRouteSchema({
        tags: ['Services'],
        summary: 'Update service',
        description: 'Updates an existing service. Only the establishment owner can perform this action.',
        security: true,
        params: idParamSchema,
        body: updateServiceSchema,
        responses: {
          200: { description: 'Service updated successfully', schema: serviceResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions', schema: ErrorResponseSchema },
          404: { description: 'Service not found', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, validate(updateServiceSchema)],
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateServiceInput }>
    ) => {
      const result = await service.update(request.params.id, request.body, request.user.userId)
      return formatServiceResponse(result)
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    '/services/:id',
    {
      schema: buildRouteSchema({
        tags: ['Services'],
        summary: 'Delete service',
        description: 'Soft deletes a service (sets active to false). Only the establishment owner can perform this action.',
        security: true,
        params: idParamSchema,
        responses: {
          200: { description: 'Service deleted successfully', schema: SuccessResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions', schema: ErrorResponseSchema },
          404: { description: 'Service not found', schema: ErrorResponseSchema },
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
