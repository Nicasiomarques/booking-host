import { FastifyRequest } from 'fastify'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'

export function requireRole(...roles: Domain.Role[]) {
  return async (request: FastifyRequest) => {
    const { establishmentId, serviceId } = request.params as {
      establishmentId?: string
      serviceId?: string
    }

    let targetEstablishmentId = establishmentId

    // If serviceId is provided, fetch establishmentId from service
    if (!targetEstablishmentId && serviceId) {
      const serviceResult = await request.server.services.service.findById(serviceId)
      if (DomainValues.isLeft(serviceResult)) {
        throw serviceResult.value
      }
      const service = serviceResult.value
      targetEstablishmentId = service.establishmentId
    }

    if (!targetEstablishmentId) {
      throw new Error('establishmentId or serviceId required in route params for ACL middleware')
    }

    const userRole = request.user.establishmentRoles.find(
      (r) => r.establishmentId === targetEstablishmentId
    )

    if (!userRole || !roles.includes(userRole.role as Domain.Role)) {
      throw new DomainValues.ForbiddenError('Insufficient permissions')
    }
  }
}

// Special middleware for routes that need to check role via roomId
export function requireRoleViaRoom(...roles: Domain.Role[]) {
  return async (request: FastifyRequest) => {
    const { id: roomId } = request.params as { id?: string }

    if (!roomId) {
      throw new Error('roomId required in route params for ACL middleware')
    }

    const roomResult = await request.server.services.room.findById(roomId)
    if (DomainValues.isLeft(roomResult)) {
      throw roomResult.value
    }
    const room = roomResult.value

    const serviceResult = await request.server.services.service.findById(room.serviceId)
    if (DomainValues.isLeft(serviceResult)) {
      throw serviceResult.value
    }
    const service = serviceResult.value

    const userRole = request.user.establishmentRoles.find(
      (r) => r.establishmentId === service.establishmentId
    )

    if (!userRole || !roles.includes(userRole.role as Domain.Role)) {
      throw new DomainValues.ForbiddenError('Insufficient permissions')
    }
  }
}
