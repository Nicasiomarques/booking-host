import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { createCompositionRoot, Services } from '../services/service-factory.js'

declare module 'fastify' {
  interface FastifyInstance {
    services: Services
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const { services } = createCompositionRoot(fastify.prisma)
  fastify.decorate('services', services)
})
