import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import serviceEndpoints from '../endpoints.js'

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(serviceEndpoints, { prefix: '/v1' })
})

