import { FastifyInstance } from 'fastify'
import {
  createExtraItemSchema,
  updateExtraItemSchema,
  extraItemResponseSchema,
  CreateExtraItemInput,
  UpdateExtraItemInput,
} from './schemas.js'
import type { ExtraItem } from '../domain/index.js'
import { serviceIdParamSchema } from '#features/service/adapters/schemas.js'
import { formatExtraItemResponse } from './http/mappers.js'
import { activeQuerySchema } from '#shared/adapters/http/schemas/common.schema.js'
import { registerUpdateEndpoint, registerDeleteEndpoint, registerCreateEndpoint, registerListEndpoint } from '#shared/adapters/http/utils/endpoint-helpers.js'

export default async function extraItemEndpoints(fastify: FastifyInstance) {
  const { extraItem: service } = fastify.services

  registerCreateEndpoint<ExtraItem, CreateExtraItemInput, { serviceId: string }>(fastify, {
    path: '/services/:serviceId/extras',
    tags: ['Extras'],
    entityName: 'Extra item',
    createSchema: createExtraItemSchema,
    responseSchema: extraItemResponseSchema,
    paramsSchema: serviceIdParamSchema,
    service: {
      create: (params, data, userId) => service.create(params.serviceId, data as CreateExtraItemInput, userId),
    },
    formatter: formatExtraItemResponse,
    description: 'Creates a new extra item for a service. Extra items are add-ons that can be included in bookings. Only the establishment owner can perform this action.',
    extractParams: (request) => ({ serviceId: request.params.serviceId }),
  })

  registerListEndpoint(fastify, {
    path: '/services/:serviceId/extras',
    tags: ['Extras'],
    entityName: 'Extra item',
    responseSchema: extraItemResponseSchema,
    paramsSchema: serviceIdParamSchema,
    querySchema: activeQuerySchema,
    service: {
      findByX: (params, query) => {
        const activeOnly = query.active === 'true'
        return service.findByService(params.serviceId, { activeOnly })
      },
    },
    formatter: formatExtraItemResponse,
    description: 'Retrieves all extra items available for a service. Can filter by active status. No authentication required.',
    extractParams: (request) => ({ serviceId: request.params.serviceId }),
    extractQuery: (request) => ({ active: request.query.active }),
  })

  registerUpdateEndpoint<ExtraItem, UpdateExtraItemInput>(fastify, {
    path: '/extras/:id',
    tags: ['Extras'],
    entityName: 'Extra item',
    updateSchema: updateExtraItemSchema,
    responseSchema: extraItemResponseSchema,
    service: { update: (id, data, userId) => service.update(id, data as UpdateExtraItemInput, userId) },
    formatter: formatExtraItemResponse,
  })

  registerDeleteEndpoint(fastify, {
    path: '/extras/:id',
    tags: ['Extras'],
    entityName: 'Extra item',
    service: { delete: (id, userId) => service.delete(id, userId) },
    description: 'Soft deletes an extra item (sets active to false). Only the establishment owner can perform this action.',
  })
}
