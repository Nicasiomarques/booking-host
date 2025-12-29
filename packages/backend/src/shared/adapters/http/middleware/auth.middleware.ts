import { FastifyRequest } from 'fastify'
import type * as Ports from '#shared/application/ports/index.js'
import * as DomainValues from '#shared/domain/index.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: Ports.TokenPayload
  }
}

export async function authenticate(request: FastifyRequest): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader) {
    throw new DomainValues.UnauthorizedError('Missing authorization header')
  }

  const [type, token] = authHeader.split(' ')

  if (type !== 'Bearer' || !token) {
    throw new DomainValues.UnauthorizedError('Invalid authorization header format')
  }

  const tokenResult = request.server.services.adapters.tokenProvider.verifyAccessToken(token)
  
  if (DomainValues.isLeft(tokenResult)) {
    throw tokenResult.value
  }

  request.user = tokenResult.value
}
