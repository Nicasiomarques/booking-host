import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import bookingEndpoints from '../endpoints.js'

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(bookingEndpoints, { prefix: '/v1' })
})

