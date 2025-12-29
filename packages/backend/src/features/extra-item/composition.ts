import { PrismaClient } from '@prisma/client'
import { createExtraItemService } from './application/extra-item.service.js'
import { createExtraItemRepository } from './adapters/persistence/extra-item.repository.js'
import type * as Ports from '#shared/application/ports/index.js'

export interface ExtraItemComposition {
  repository: Ports.ExtraItemRepositoryPort
  service: ReturnType<typeof createExtraItemService>
}

export function createExtraItemComposition(
  prisma: PrismaClient,
  dependencies: {
    serviceRepository: Ports.ServiceRepositoryPort
    establishmentRepository: Ports.EstablishmentRepositoryPort
    errorHandler: Ports.RepositoryErrorHandlerPort
  }
): ExtraItemComposition {
  const repository = createExtraItemRepository(prisma, dependencies.errorHandler)
  const service = createExtraItemService({
    repository,
    serviceRepository: dependencies.serviceRepository,
    establishmentRepository: dependencies.establishmentRepository,
  })

  return { repository, service }
}

