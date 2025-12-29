import { PrismaClient } from '@prisma/client'
import { createRoomService } from './application/room.service.js'
import { createRoomRepository } from './adapters/persistence/room.repository.js'
import type * as Ports from '#shared/application/ports/index.js'

export interface RoomComposition {
  repository: Ports.RoomRepositoryPort
  service: ReturnType<typeof createRoomService>
}

export function createRoomComposition(
  prisma: PrismaClient,
  dependencies: {
    serviceRepository: Ports.ServiceRepositoryPort
    establishmentRepository: Ports.EstablishmentRepositoryPort
    errorHandler: Ports.RepositoryErrorHandlerPort
  }
): RoomComposition {
  const repository = createRoomRepository(prisma, dependencies.errorHandler)
  const service = createRoomService({
    repository,
    serviceRepository: dependencies.serviceRepository,
    establishmentRepository: dependencies.establishmentRepository,
  })

  return { repository, service }
}

