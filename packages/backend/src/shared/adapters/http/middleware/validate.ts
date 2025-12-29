import { FastifyRequest } from 'fastify'
import { ZodSchema } from 'zod'
import * as DomainValues from '#shared/domain/index.js'

export function validate<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest) => {
    const result = schema.safeParse(request.body)

    if (!result.success) {
      throw new DomainValues.ValidationError(
        'Invalid request body',
        result.error.flatten()
      )
    }

    request.body = result.data
  }
}

export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest) => {
    const result = schema.safeParse(request.query)

    if (!result.success) {
      throw new DomainValues.ValidationError(
        'Invalid query parameters',
        result.error.flatten()
      )
    }

    request.query = result.data as typeof request.query
  }
}
