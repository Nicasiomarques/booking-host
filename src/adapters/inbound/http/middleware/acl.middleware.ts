import { FastifyRequest } from 'fastify'
import { ForbiddenError } from '#domain/index.js'
import type { Role } from '#domain/index.js'

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest) => {
    const { establishmentId } = request.params as { establishmentId?: string }

    if (!establishmentId) {
      throw new Error('establishmentId required in route params for ACL middleware')
    }

    const userRole = request.user.establishmentRoles.find(
      (r) => r.establishmentId === establishmentId
    )

    if (!userRole || !roles.includes(userRole.role as Role)) {
      throw new ForbiddenError('Insufficient permissions')
    }
  }
}
