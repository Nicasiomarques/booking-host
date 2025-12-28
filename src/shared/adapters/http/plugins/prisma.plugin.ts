import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { prisma } from '#shared/adapters/outbound/prisma/index.js'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})
