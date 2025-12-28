import { PrismaClient } from '@prisma/client'
import { createServiceService } from './application/service.service.js'
import { createServiceRepository } from './adapters/persistence/service.repository.js'
import type { EstablishmentRepositoryPort, ServiceRepositoryPort } from '#shared/application/ports/index.js'

export interface ServiceComposition {
  repository: ServiceRepositoryPort
  service: ReturnType<typeof createServiceService>
}

export function createServiceComposition(
  prisma: PrismaClient,
  dependencies: {
    establishmentRepository: EstablishmentRepositoryPort
  }
): ServiceComposition {
  const repository = createServiceRepository(prisma)
  const service = createServiceService({
    repository,
    establishmentRepository: dependencies.establishmentRepository,
  })

  return { repository, service }
}

