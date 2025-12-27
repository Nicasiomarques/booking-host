import { FastifyRequest } from 'fastify'
import type { TokenPayload } from '#application/ports/index.js'
import { UnauthorizedError } from '#domain/index.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: TokenPayload
  }
}

export async function authenticate(request: FastifyRequest): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader) {
    throw new UnauthorizedError('Missing authorization header')
  }

  const [type, token] = authHeader.split(' ')

  if (type !== 'Bearer' || !token) {
    throw new UnauthorizedError('Invalid authorization header format')
  }

  const payload = request.server.services.adapters.tokenProvider.verifyAccessToken(token)
  request.user = payload
}
