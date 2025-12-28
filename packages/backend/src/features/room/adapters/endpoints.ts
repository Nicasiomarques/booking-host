import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  createRoomSchema,
  updateRoomSchema,
  roomResponseSchema,
  CreateRoomInput,
  UpdateRoomInput,
} from './schemas.js'
import { ErrorResponseSchema, SuccessResponseSchema, buildRouteSchema } from '#shared/adapters/http/openapi/index.js'
import { validate, authenticate, requireRole, requireRoleViaRoom } from '#shared/adapters/http/middleware/index.js'
import { serviceIdParamSchema } from '#features/service/adapters/schemas.js'
import { formatRoomResponse } from './http/mappers.js'

const idParamSchema = z.object({
  id: z.string().uuid(),
})

export default async function roomEndpoints(fastify: FastifyInstance) {
  const { room: service } = fastify.services

  fastify.post<{ Params: { serviceId: string }; Body: CreateRoomInput }>(
    '/services/:serviceId/rooms',
    {
      schema: buildRouteSchema({
        tags: ['Rooms'],
        summary: 'Create a new room',
        description: 'Creates a new room for a hotel service. Only the establishment owner can perform this action.',
        security: true,
        params: serviceIdParamSchema,
        body: createRoomSchema,
        responses: {
          201: { description: 'Room created successfully', schema: roomResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions (OWNER required)', schema: ErrorResponseSchema },
          404: { description: 'Service not found', schema: ErrorResponseSchema },
          409: { description: 'Room number already exists', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, validate(createRoomSchema), requireRole('OWNER')],
    },
    async (
      request: FastifyRequest<{ Params: { serviceId: string }; Body: CreateRoomInput }>,
      reply: FastifyReply
    ) => {
      const result = await service.create(request.params.serviceId, request.body, request.user.userId)
      return reply.status(201).send(formatRoomResponse(result))
    }
  )

  fastify.get<{ Params: { serviceId: string } }>(
    '/services/:serviceId/rooms',
    {
      schema: buildRouteSchema({
        tags: ['Rooms'],
        summary: 'List rooms for a service',
        description: 'Retrieves all rooms for a hotel service. No authentication required.',
        params: serviceIdParamSchema,
        responses: {
          200: { description: 'List of rooms', schema: z.array(roomResponseSchema) },
          404: { description: 'Service not found', schema: ErrorResponseSchema },
        },
      }),
    },
    async (request: FastifyRequest<{ Params: { serviceId: string } }>) => {
      const results = await service.findByService(request.params.serviceId)
      return results.map(formatRoomResponse)
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/rooms/:id',
    {
      schema: buildRouteSchema({
        tags: ['Rooms'],
        summary: 'Get room by ID',
        description: 'Retrieves detailed information about a specific room. No authentication required.',
        params: idParamSchema,
        responses: {
          200: { description: 'Room details', schema: roomResponseSchema },
          404: { description: 'Room not found', schema: ErrorResponseSchema },
        },
      }),
    },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      const result = await service.findById(request.params.id)
      return formatRoomResponse(result)
    }
  )

  fastify.put<{ Params: { id: string }; Body: UpdateRoomInput }>(
    '/rooms/:id',
    {
      schema: buildRouteSchema({
        tags: ['Rooms'],
        summary: 'Update a room',
        description: 'Updates room information. Only the establishment owner can perform this action.',
        security: true,
        params: idParamSchema,
        body: updateRoomSchema,
        responses: {
          200: { description: 'Room updated successfully', schema: roomResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions (OWNER required)', schema: ErrorResponseSchema },
          404: { description: 'Room not found', schema: ErrorResponseSchema },
          409: { description: 'Room number already exists or room has active bookings', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, validate(updateRoomSchema), requireRoleViaRoom('OWNER')],
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateRoomInput }>, reply: FastifyReply) => {
      const result = await service.update(request.params.id, request.body, request.user.userId)
      return reply.status(200).send(formatRoomResponse(result))
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    '/rooms/:id',
    {
      schema: buildRouteSchema({
        tags: ['Rooms'],
        summary: 'Delete a room',
        description: 'Deletes a room. Only the establishment owner can perform this action. Room must not have active bookings.',
        security: true,
        params: idParamSchema,
        responses: {
          200: { description: 'Room deleted successfully', schema: SuccessResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions (OWNER required)', schema: ErrorResponseSchema },
          404: { description: 'Room not found', schema: ErrorResponseSchema },
          409: { description: 'Room has active bookings', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, requireRoleViaRoom('OWNER')],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      await service.delete(request.params.id, request.user.userId)
      return reply.status(200).send({ success: true })
    }
  )
}

