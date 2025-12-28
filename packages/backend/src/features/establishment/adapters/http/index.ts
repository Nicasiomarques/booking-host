import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import establishmentEndpoints from '../endpoints.js'

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(establishmentEndpoints, { prefix: '/v1/establishments' })
})

