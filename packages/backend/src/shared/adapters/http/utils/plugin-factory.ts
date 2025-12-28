import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'

/**
 * Factory function to create Fastify plugins for feature endpoints
 * @param endpoints - The endpoints function to register
 * @param prefix - The route prefix (e.g., '/v1', '/v1/auth')
 * @returns A Fastify plugin
 */
export function createFeaturePlugin(
  endpoints: FastifyPluginAsync,
  prefix: string
) {
  return fp(async (fastify: FastifyInstance) => {
    await fastify.register(endpoints, { prefix })
  })
}

