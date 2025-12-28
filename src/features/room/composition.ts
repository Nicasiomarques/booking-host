import { PrismaClient } from '@prisma/client'
import { RoomService } from './application/room.service.js'
import { RoomRepository } from './adapters/persistence/room.repository.js'
import type {
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
} from '#shared/application/ports/index.js'

export interface RoomComposition {
  repository: RoomRepository
  service: RoomService
}

export function createRoomComposition(
  prisma: PrismaClient,
  dependencies: {
    serviceRepository: ServiceRepositoryPort
    establishmentRepository: EstablishmentRepositoryPort
  }
): RoomComposition {
  const repository = new RoomRepository(prisma)
  const service = new RoomService(
    repository,
    dependencies.serviceRepository,
    dependencies.establishmentRepository
  )

  return { repository, service }
}

