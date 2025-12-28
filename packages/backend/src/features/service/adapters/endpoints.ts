import { FastifyInstance } from 'fastify'
import {
  createServiceSchema,
  updateServiceSchema,
  serviceResponseSchema,
  CreateServiceInput,
  UpdateServiceInput,
} from './schemas.js'
import type { Service } from '../domain/index.js'
import { ErrorResponseSchema } from '#shared/adapters/http/openapi/index.js'
import { requireRole } from '#shared/adapters/http/middleware/index.js'
import { formatServiceResponse } from '#shared/adapters/http/utils/response-formatters.js'
import { establishmentIdParamSchema } from '#features/establishment/adapters/schemas.js'
import { activeQuerySchema } from '#shared/adapters/http/schemas/common.schema.js'
import { registerGetByIdEndpoint, registerUpdateEndpoint, registerDeleteEndpoint, registerCreateEndpoint, registerListEndpoint } from '#shared/adapters/http/utils/endpoint-helpers.js'

export default async function serviceEndpoints(fastify: FastifyInstance) {
  const { service } = fastify.services

  registerCreateEndpoint<Service, CreateServiceInput, { establishmentId: string }>(fastify, {
    path: '/establishments/:establishmentId/services',
    tags: ['Services'],
    entityName: 'Service',
    createSchema: createServiceSchema,
    responseSchema: serviceResponseSchema,
    paramsSchema: establishmentIdParamSchema,
    service: {
      create: (params, data, userId) => service.create(params.establishmentId, data as CreateServiceInput, userId),
    },
    formatter: formatServiceResponse,
    description: 'Creates a new service for an establishment. Only the establishment owner can perform this action.',
    additionalResponses: {
      403: { description: 'Insufficient permissions (OWNER required)', schema: ErrorResponseSchema },
    },
    preHandler: [requireRole('OWNER')],
    extractParams: (request) => ({ establishmentId: request.params.establishmentId }),
  })

  registerListEndpoint(fastify, {
    path: '/establishments/:establishmentId/services',
    tags: ['Services'],
    entityName: 'Service',
    responseSchema: serviceResponseSchema,
    paramsSchema: establishmentIdParamSchema,
    querySchema: activeQuerySchema,
    service: {
      findByX: (params, query) => {
        const activeOnly = query.active === 'true'
        return service.findByEstablishment(params.establishmentId, { activeOnly })
      },
    },
    formatter: formatServiceResponse,
    description: 'Retrieves all services for an establishment. Can filter by active status. No authentication required.',
    extractParams: (request) => ({ establishmentId: request.params.establishmentId }),
    extractQuery: (request) => ({ active: request.query.active }),
  })

  registerGetByIdEndpoint(fastify, {
    path: '/services/:id',
    tags: ['Services'],
    entityName: 'Service',
    responseSchema: serviceResponseSchema,
    service: { findById: (id) => service.findById(id) },
    formatter: formatServiceResponse,
  })

  registerUpdateEndpoint<Service, UpdateServiceInput>(fastify, {
    path: '/services/:id',
    tags: ['Services'],
    entityName: 'Service',
    updateSchema: updateServiceSchema,
    responseSchema: serviceResponseSchema,
    service: { update: (id, data, userId) => service.update(id, data as UpdateServiceInput, userId) },
    formatter: formatServiceResponse,
  })

  registerDeleteEndpoint(fastify, {
    path: '/services/:id',
    tags: ['Services'],
    entityName: 'Service',
    service: { delete: (id, userId) => service.delete(id, userId) },
    description: 'Soft deletes a service (sets active to false). Only the establishment owner can perform this action.',
  })
}
