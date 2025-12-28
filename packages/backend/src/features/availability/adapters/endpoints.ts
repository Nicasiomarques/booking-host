import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  queryAvailabilitySchema,
  availabilityResponseSchema,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  QueryAvailabilityInput,
} from './schemas.js'
import { ErrorResponseSchema, buildRouteSchema } from '#shared/adapters/http/openapi/index.js'
import { validate, validateQuery, authenticate } from '#shared/adapters/http/middleware/index.js'
import { formatAvailabilityResponse } from '#shared/adapters/http/utils/response-formatters.js'
import { serviceIdParamSchema } from '#features/service/adapters/schemas.js'
import { idParamSchema } from '#shared/adapters/http/schemas/common.schema.js'
import { registerDeleteEndpoint } from '#shared/adapters/http/utils/endpoint-helpers.js'
import { handleEitherAsync } from '#shared/adapters/http/utils/either-handler.js'

export default async function availabilityEndpoints(fastify: FastifyInstance) {
  const { availability: service } = fastify.services

  fastify.post<{ Params: { serviceId: string }; Body: CreateAvailabilityInput }>(
    '/services/:serviceId/availabilities',
    {
      schema: buildRouteSchema({
        tags: ['Availabilities'],
        summary: 'Create availability slot',
        description: 'Creates a new availability time slot for a service. Only the establishment owner can perform this action. Validates for time overlaps with existing slots.',
        security: true,
        params: serviceIdParamSchema,
        body: createAvailabilitySchema,
        responses: {
          201: { description: 'Availability created successfully', schema: availabilityResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions', schema: ErrorResponseSchema },
          404: { description: 'Service not found', schema: ErrorResponseSchema },
          409: { description: 'Time slot overlaps with existing availability', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, validate(createAvailabilitySchema)],
    },
    async (
      request: FastifyRequest<{ Params: { serviceId: string }; Body: CreateAvailabilityInput }>,
      reply: FastifyReply
    ) => {
      return handleEitherAsync(
        service.create(
          request.params.serviceId,
          {
            date: new Date(request.body.date),
            startTime: request.body.startTime,
            endTime: request.body.endTime,
            capacity: request.body.capacity,
            price: request.body.price,
            notes: request.body.notes,
            isRecurring: request.body.isRecurring,
          },
          request.user.userId
        ),
        reply,
        (result) => formatAvailabilityResponse(result),
        201
      )
    }
  )

  fastify.get<{ Params: { serviceId: string }; Querystring: QueryAvailabilityInput }>(
    '/services/:serviceId/availabilities',
    {
      schema: buildRouteSchema({
        tags: ['Availabilities'],
        summary: 'List service availabilities',
        description: 'Retrieves all availability slots for a service. Can filter by date range. No authentication required.',
        params: serviceIdParamSchema,
        querystring: queryAvailabilitySchema,
        responses: {
          200: { description: 'List of availability slots', schema: z.array(availabilityResponseSchema) },
          404: { description: 'Service not found', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [validateQuery(queryAvailabilitySchema)],
    },
    async (
      request: FastifyRequest<{ Params: { serviceId: string }; Querystring: QueryAvailabilityInput }>,
      reply: FastifyReply
    ) => {
      const options: { startDate?: Date; endDate?: Date } = {}
      if (request.query.startDate) {
        options.startDate = new Date(request.query.startDate)
      }
      if (request.query.endDate) {
        options.endDate = new Date(request.query.endDate)
      }
      return handleEitherAsync(
        service.findByService(request.params.serviceId, options),
        reply,
        (results) => results.map(formatAvailabilityResponse)
      )
    }
  )

  // Helper function to transform UpdateAvailabilityInput to UpdateAvailabilityData
  const transformUpdateInput = (input: UpdateAvailabilityInput) => {
    const fields: Array<keyof UpdateAvailabilityInput> = ['startTime', 'endTime', 'capacity', 'price', 'notes', 'isRecurring']

    return fields.reduce<{
      date?: Date
      startTime?: string
      endTime?: string
      capacity?: number
      price?: number
      notes?: string
      isRecurring?: boolean
    }>((acc, field) => {
      const value = input[field]
      if (value !== undefined && (field !== 'price' || value !== null)) {
        acc[field] = value as any
      }
      return acc
    }, input.date ? { date: new Date(input.date) } : {})
  }

  fastify.put<{ Params: { id: string }; Body: UpdateAvailabilityInput }>(
    '/availabilities/:id',
    {
      schema: buildRouteSchema({
        tags: ['Availabilities'],
        summary: 'Update availability slot',
        description: 'Updates an existing availability slot. Only the establishment owner can perform this action.',
        security: true,
        params: idParamSchema,
        body: updateAvailabilitySchema,
        responses: {
          200: { description: 'Availability updated successfully', schema: availabilityResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions', schema: ErrorResponseSchema },
          404: { description: 'Availability not found', schema: ErrorResponseSchema },
          409: { description: 'Time slot overlaps with existing availability', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate, validate(updateAvailabilitySchema)],
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateAvailabilityInput }>,
      reply: FastifyReply
    ) => {
      const updateData = transformUpdateInput(request.body)
      return handleEitherAsync(
        service.update(request.params.id, updateData, request.user.userId),
        reply,
        (result) => formatAvailabilityResponse(result)
      )
    }
  )

  registerDeleteEndpoint(fastify, {
    path: '/availabilities/:id',
    tags: ['Availabilities'],
    entityName: 'Availability',
    service: { delete: (id, userId) => service.delete(id, userId) },
    description: 'Deletes an availability slot. Only the establishment owner can perform this action. Cannot delete if there are existing bookings.',
    additionalResponses: {
      409: { description: 'Cannot delete availability with existing bookings', schema: ErrorResponseSchema },
    },
  })
}
