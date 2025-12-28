import { PrismaClient } from '@prisma/client'
import { ExtraItemService } from './application/extra-item.service.js'
import { ExtraItemRepository } from './adapters/persistence/extra-item.repository.js'
import type {
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
} from '#shared/application/ports/index.js'

export interface ExtraItemComposition {
  repository: ExtraItemRepository
  service: ExtraItemService
}

export function createExtraItemComposition(
  prisma: PrismaClient,
  dependencies: {
    serviceRepository: ServiceRepositoryPort
    establishmentRepository: EstablishmentRepositoryPort
  }
): ExtraItemComposition {
  const repository = new ExtraItemRepository(prisma)
  const service = new ExtraItemService(
    repository,
    dependencies.serviceRepository,
    dependencies.establishmentRepository
  )

  return { repository, service }
}

