import fp from 'fastify-plugin'
import { FastifyInstance, FastifyError } from 'fastify'
import { DomainError } from '#domain/index.js'

export default fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error: FastifyError | DomainError, request, reply) => {
    request.log.error(error)

    if (error instanceof DomainError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      })
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.validation,
        },
      })
    }

    // Rate limit errors (from @fastify/rate-limit - the error is actually the response object from errorResponseBuilder)
    const errorObj = error as { error?: { code?: string; message?: string } }
    if (errorObj.error?.code === 'TOO_MANY_REQUESTS') {
      return reply.status(429).send(error)
    }

    // Generic error
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    })
  })
})
