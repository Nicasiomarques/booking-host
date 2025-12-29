import { FastifyInstance, FastifyRequest } from 'fastify'
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
import { ErrorResponseSchema } from '#shared/adapters/http/openapi/index.js'
import { validateQuery } from '#shared/adapters/http/middleware/index.js'
import { formatAvailabilityResponse } from '#shared/adapters/http/utils/response-formatters.js'
import { serviceIdParamSchema } from '#features/service/adapters/schemas.js'
import type * as AvailabilityDomain from '../domain/index.js'
import {
  registerCreateEndpoint,
  registerUpdateEndpoint,
  registerDeleteEndpoint,
  registerListEndpoint,
  registerGetByIdEndpoint,
} from '#shared/adapters/http/utils/endpoint-helpers.js'

export default async function availabilityEndpoints(fastify: FastifyInstance) {
  const { availability: service } = fastify.services

  // Helper to transform CreateAvailabilityInput (date string) to CreateAvailabilityData (Date object)
  const transformCreateInput = (input: CreateAvailabilityInput): Omit<AvailabilityDomain.CreateAvailabilityData, 'serviceId'> => {
    return {
      date: new Date(input.date),
      startTime: input.startTime,
      endTime: input.endTime,
      capacity: input.capacity,
      price: input.price,
      notes: input.notes,
      isRecurring: input.isRecurring,
    }
  }

  // Helper to transform UpdateAvailabilityInput to UpdateAvailabilityData
  const transformUpdateInput = (input: UpdateAvailabilityInput): AvailabilityDomain.UpdateAvailabilityData => {
    const result: AvailabilityDomain.UpdateAvailabilityData = {}
    
    if (input.date !== undefined) {
      result.date = new Date(input.date)
    }
    if (input.startTime !== undefined) {
      result.startTime = input.startTime
    }
    if (input.endTime !== undefined) {
      result.endTime = input.endTime
    }
    if (input.capacity !== undefined) {
      result.capacity = input.capacity
    }
    if (input.price !== undefined) {
      result.price = input.price
    }
    if (input.notes !== undefined) {
      result.notes = input.notes
    }
    if (input.isRecurring !== undefined) {
      result.isRecurring = input.isRecurring
    }
    
    return result
  }

  registerCreateEndpoint<AvailabilityDomain.Availability, CreateAvailabilityInput, { serviceId: string }>(fastify, {
    path: '/services/:serviceId/availabilities',
    tags: ['Availabilities'],
    entityName: 'Availability',
    createSchema: createAvailabilitySchema,
    responseSchema: availabilityResponseSchema,
    paramsSchema: serviceIdParamSchema,
    service: {
      create: (params, data, userId) => {
        const transformedData = transformCreateInput(data as CreateAvailabilityInput)
        return service.create(params.serviceId, transformedData, userId)
      },
    },
    formatter: formatAvailabilityResponse,
    description: 'Creates a new availability time slot for a service. Only the establishment owner can perform this action. Validates for time overlaps with existing slots.',
    additionalResponses: {
      409: { description: 'Time slot overlaps with existing availability', schema: ErrorResponseSchema },
    },
    extractParams: (request) => ({ serviceId: request.params.serviceId }),
  })

  registerListEndpoint(fastify, {
    path: '/services/:serviceId/availabilities',
    tags: ['Availabilities'],
    entityName: 'Availability',
    responseSchema: availabilityResponseSchema,
    paramsSchema: serviceIdParamSchema,
    querySchema: queryAvailabilitySchema,
    service: {
      findByX: (params, query) => {
        const options: { startDate?: Date; endDate?: Date } = {}
        if (query.startDate) {
          options.startDate = new Date(query.startDate)
        }
        if (query.endDate) {
          options.endDate = new Date(query.endDate)
        }
        return service.findByService(params.serviceId, options)
      },
    },
    formatter: formatAvailabilityResponse,
    description: 'Retrieves all availability slots for a service. Can filter by date range. No authentication required.',
    extractParams: (request) => ({ serviceId: request.params.serviceId }),
    extractQuery: (request) => ({
      startDate: request.query.startDate,
      endDate: request.query.endDate,
    }),
  })

  registerGetByIdEndpoint(fastify, {
    path: '/availabilities/:id',
    tags: ['Availabilities'],
    entityName: 'Availability',
    responseSchema: availabilityResponseSchema,
    service: { findById: (id) => service.findById(id) },
    formatter: formatAvailabilityResponse,
  })

  registerUpdateEndpoint<AvailabilityDomain.Availability, UpdateAvailabilityInput>(fastify, {
    path: '/availabilities/:id',
    tags: ['Availabilities'],
    entityName: 'Availability',
    updateSchema: updateAvailabilitySchema,
    responseSchema: availabilityResponseSchema,
    service: {
      update: (id, data, userId) => {
        const transformedData = transformUpdateInput(data as UpdateAvailabilityInput)
        return service.update(id, transformedData, userId)
      },
    },
    formatter: formatAvailabilityResponse,
    description: 'Updates an existing availability slot. Only the establishment owner can perform this action.',
    additionalResponses: {
      409: { description: 'Time slot overlaps with existing availability', schema: ErrorResponseSchema },
    },
  })

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
