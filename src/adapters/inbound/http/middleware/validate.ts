import { FastifyRequest } from 'fastify'
import { ZodSchema } from 'zod'
import { ValidationError } from '#domain/index.js'

export function validate<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest) => {
    const result = schema.safeParse(request.body)

    if (!result.success) {
      throw new ValidationError(
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
      throw new ValidationError(
        'Invalid query parameters',
        result.error.flatten()
      )
    }

    request.query = result.data as typeof request.query
  }
}

export function validateParams<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest) => {
    const result = schema.safeParse(request.params)

    if (!result.success) {
      throw new ValidationError(
        'Invalid path parameters',
        result.error.flatten()
      )
    }

    request.params = result.data as typeof request.params
  }
}
