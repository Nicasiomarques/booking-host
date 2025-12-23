import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { DomainError } from '../../../../domain/errors.js'

export default fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error, request, reply) => {
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

    // Generic error
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    })
  })
})
