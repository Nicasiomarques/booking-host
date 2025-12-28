import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import authEndpoints from '../endpoints.js'

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(authEndpoints, { prefix: '/v1/auth' })
})

