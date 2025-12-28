import { PrismaClient } from '@prisma/client'
import { createRoomService } from './application/room.service.js'
import { createRoomRepository } from './adapters/persistence/room.repository.js'
import type {
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
  RoomRepositoryPort,
} from '#shared/application/ports/index.js'

export interface RoomComposition {
  repository: RoomRepositoryPort
  service: ReturnType<typeof createRoomService>
}

export function createRoomComposition(
  prisma: PrismaClient,
  dependencies: {
    serviceRepository: ServiceRepositoryPort
    establishmentRepository: EstablishmentRepositoryPort
  }
): RoomComposition {
  const repository = createRoomRepository(prisma)
  const service = createRoomService({
    repository,
    serviceRepository: dependencies.serviceRepository,
    establishmentRepository: dependencies.establishmentRepository,
  })

  return { repository, service }
}

