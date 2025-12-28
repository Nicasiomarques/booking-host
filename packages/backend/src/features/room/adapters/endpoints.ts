import { FastifyInstance } from 'fastify'
import {
  createRoomSchema,
  updateRoomSchema,
  roomResponseSchema,
  CreateRoomInput,
  UpdateRoomInput,
} from './schemas.js'
import type { Room } from '../domain/index.js'
import { ErrorResponseSchema } from '#shared/adapters/http/openapi/index.js'
import { requireRole, requireRoleViaRoom } from '#shared/adapters/http/middleware/index.js'
import { serviceIdParamSchema } from '#features/service/adapters/schemas.js'
import { formatRoomResponse } from './http/mappers.js'
import { registerGetByIdEndpoint, registerUpdateEndpoint, registerDeleteEndpoint, registerCreateEndpoint, registerListEndpoint } from '#shared/adapters/http/utils/endpoint-helpers.js'

export default async function roomEndpoints(fastify: FastifyInstance) {
  const { room: service } = fastify.services

  registerCreateEndpoint<Room, CreateRoomInput, { serviceId: string }>(fastify, {
    path: '/services/:serviceId/rooms',
    tags: ['Rooms'],
    entityName: 'Room',
    createSchema: createRoomSchema,
    responseSchema: roomResponseSchema,
    paramsSchema: serviceIdParamSchema,
    service: {
      create: (params, data, userId) => service.create(params.serviceId, data as CreateRoomInput, userId),
    },
    formatter: formatRoomResponse,
    description: 'Creates a new room for a hotel service. Only the establishment owner can perform this action.',
    additionalResponses: {
      403: { description: 'Insufficient permissions (OWNER required)', schema: ErrorResponseSchema },
      409: { description: 'Room number already exists', schema: ErrorResponseSchema },
    },
    preHandler: [requireRole('OWNER')],
    extractParams: (request) => ({ serviceId: request.params.serviceId }),
  })

  registerListEndpoint(fastify, {
    path: '/services/:serviceId/rooms',
    tags: ['Rooms'],
    entityName: 'Room',
    responseSchema: roomResponseSchema,
    paramsSchema: serviceIdParamSchema,
    service: {
      findByX: (params) => service.findByService(params.serviceId),
    },
    formatter: formatRoomResponse,
    description: 'Retrieves all rooms for a hotel service. No authentication required.',
    extractParams: (request) => ({ serviceId: request.params.serviceId }),
  })

  registerGetByIdEndpoint(fastify, {
    path: '/rooms/:id',
    tags: ['Rooms'],
    entityName: 'Room',
    responseSchema: roomResponseSchema,
    service: { findById: (id) => service.findById(id) },
    formatter: formatRoomResponse,
  })

  registerUpdateEndpoint<Room, UpdateRoomInput>(fastify, {
    path: '/rooms/:id',
    tags: ['Rooms'],
    entityName: 'Room',
    updateSchema: updateRoomSchema,
    responseSchema: roomResponseSchema,
    service: { update: (id, data, userId) => service.update(id, data as UpdateRoomInput, userId) },
    formatter: formatRoomResponse,
    additionalResponses: {
      409: { description: 'Room number already exists or room has active bookings', schema: ErrorResponseSchema },
    },
    preHandler: [requireRoleViaRoom('OWNER')],
  })

  registerDeleteEndpoint(fastify, {
    path: '/rooms/:id',
    tags: ['Rooms'],
    entityName: 'Room',
    service: { delete: (id, userId) => service.delete(id, userId) },
    description: 'Deletes a room. Only the establishment owner can perform this action. Room must not have active bookings.',
    additionalResponses: {
      409: { description: 'Room has active bookings', schema: ErrorResponseSchema },
    },
    preHandler: [requireRoleViaRoom('OWNER')],
  })
}

