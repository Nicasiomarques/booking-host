import { FastifyRequest } from 'fastify'
import { ForbiddenError } from '#domain/index.js'
import type { Role } from '#domain/index.js'

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest) => {
    const { establishmentId, serviceId } = request.params as {
      establishmentId?: string
      serviceId?: string
    }

    let targetEstablishmentId = establishmentId

    // If serviceId is provided, fetch establishmentId from service
    if (!targetEstablishmentId && serviceId) {
      const service = await request.server.services.service.findById(serviceId)
      if (!service) {
        throw new ForbiddenError('Service not found')
      }
      targetEstablishmentId = service.establishmentId
    }

    if (!targetEstablishmentId) {
      throw new Error('establishmentId or serviceId required in route params for ACL middleware')
    }

    const userRole = request.user.establishmentRoles.find(
      (r) => r.establishmentId === targetEstablishmentId
    )

    if (!userRole || !roles.includes(userRole.role as Role)) {
      throw new ForbiddenError('Insufficient permissions')
    }
  }
}

// Special middleware for routes that need to check role via roomId
export function requireRoleViaRoom(...roles: Role[]) {
  return async (request: FastifyRequest) => {
    const { id: roomId } = request.params as { id?: string }

    if (!roomId) {
      throw new Error('roomId required in route params for ACL middleware')
    }

    const room = await request.server.services.room.findById(roomId)
    const service = await request.server.services.service.findById(room.serviceId)

    const userRole = request.user.establishmentRoles.find(
      (r) => r.establishmentId === service.establishmentId
    )

    if (!userRole || !roles.includes(userRole.role as Role)) {
      throw new ForbiddenError('Insufficient permissions')
    }
  }
}
