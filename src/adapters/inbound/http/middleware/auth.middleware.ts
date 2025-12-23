import { FastifyRequest } from 'fastify'
import { jwtAdapter, TokenPayload } from '#adapters/outbound/token/index.js'
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

  const payload = jwtAdapter.verifyAccessToken(token)
  request.user = payload
}
