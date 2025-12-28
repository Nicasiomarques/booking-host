import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { createCompositionRoot, Services, CompositionRoot } from '../services/service-factory.js'

declare module 'fastify' {
  interface FastifyInstance {
    services: Services & {
      adapters: CompositionRoot['adapters']
    }
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const { services, adapters } = createCompositionRoot(fastify.prisma)
  fastify.decorate('services', { ...services, adapters })
})
