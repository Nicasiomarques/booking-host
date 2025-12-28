import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import extraItemEndpoints from '../endpoints.js'

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(extraItemEndpoints, { prefix: '/v1' })
})

