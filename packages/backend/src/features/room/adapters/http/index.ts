import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import roomEndpoints from '../endpoints.js'

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(roomEndpoints, { prefix: '/v1' })
})

