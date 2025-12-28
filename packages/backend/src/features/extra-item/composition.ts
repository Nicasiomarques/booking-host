import { PrismaClient } from '@prisma/client'
import { createExtraItemService } from './application/extra-item.service.js'
import { createExtraItemRepository } from './adapters/persistence/extra-item.repository.js'
import type {
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
  ExtraItemRepositoryPort,
} from '#shared/application/ports/index.js'

export interface ExtraItemComposition {
  repository: ExtraItemRepositoryPort
  service: ReturnType<typeof createExtraItemService>
}

export function createExtraItemComposition(
  prisma: PrismaClient,
  dependencies: {
    serviceRepository: ServiceRepositoryPort
    establishmentRepository: EstablishmentRepositoryPort
  }
): ExtraItemComposition {
  const repository = createExtraItemRepository(prisma)
  const service = createExtraItemService({
    repository,
    serviceRepository: dependencies.serviceRepository,
    establishmentRepository: dependencies.establishmentRepository,
  })

  return { repository, service }
}

