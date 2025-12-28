import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  queryAvailabilitySchema,
  availabilityResponseSchema,
  serviceIdParamSchema,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  QueryAvailabilityInput,
} from '../schemas/index.js'
import { ErrorResponseSchema, SuccessResponseSchema, buildRouteSchema } from '../openapi/index.js'
import { validate, validateQuery, authenticate } from '../middleware/index.js'
import { formatAvailabilityResponse } from '../utils/response-formatters.js'

const idParamSchema = z.object({
  id: z.string().uuid(),
})

export default async function availabilityRoutes(fastify: FastifyInstance) {
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
      const result = await service.create(
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
      )
      return reply.status(201).send(formatAvailabilityResponse(result))
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
      request: FastifyRequest<{ Params: { serviceId: string }; Querystring: QueryAvailabilityInput }>
    ) => {
      const options: { startDate?: Date; endDate?: Date } = {}
      if (request.query.startDate) {
        options.startDate = new Date(request.query.startDate)
      }
      if (request.query.endDate) {
        options.endDate = new Date(request.query.endDate)
      }
      const results = await service.findByService(request.params.serviceId, options)
      return results.map(formatAvailabilityResponse)
    }
  )

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
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateAvailabilityInput }>
    ) => {
      const updateData: {
        date?: Date;
        startTime?: string; 
        endTime?: string; 
        capacity?: number;
        price?: number;
        notes?: string;
        isRecurring?: boolean;
      } = {}
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
      if (request.body.price !== undefined && request.body.price !== null) {
        updateData.price = request.body.price
      }
      if (request.body.notes !== undefined) {
        updateData.notes = request.body.notes
      }
      if (request.body.isRecurring !== undefined) {
        updateData.isRecurring = request.body.isRecurring
      }
      const result = await service.update(request.params.id, updateData, request.user.userId)
      return formatAvailabilityResponse(result)
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    '/availabilities/:id',
    {
      schema: buildRouteSchema({
        tags: ['Availabilities'],
        summary: 'Delete availability slot',
        description: 'Deletes an availability slot. Only the establishment owner can perform this action. Cannot delete if there are existing bookings.',
        security: true,
        params: idParamSchema,
        responses: {
          200: { description: 'Availability deleted successfully', schema: SuccessResponseSchema },
          401: { description: 'Unauthorized', schema: ErrorResponseSchema },
          403: { description: 'Insufficient permissions', schema: ErrorResponseSchema },
          404: { description: 'Availability not found', schema: ErrorResponseSchema },
          409: { description: 'Cannot delete availability with existing bookings', schema: ErrorResponseSchema },
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
