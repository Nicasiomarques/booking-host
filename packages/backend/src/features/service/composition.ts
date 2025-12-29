import { PrismaClient } from '@prisma/client'
import { createServiceService } from './application/service.service.js'
import { createServiceRepository } from './adapters/repository.js'
import type * as Ports from '#shared/application/ports/index.js'

export interface ServiceComposition {
  repository: Ports.ServiceRepositoryPort
  service: ReturnType<typeof createServiceService>
}

export function createServiceComposition(
  prisma: PrismaClient,
  dependencies: {
    establishmentRepository: Ports.EstablishmentRepositoryPort
    errorHandler: Ports.RepositoryErrorHandlerPort
  }
): ServiceComposition {
  const repository = createServiceRepository(prisma, dependencies.errorHandler)
  const service = createServiceService({
    repository,
    establishmentRepository: dependencies.establishmentRepository,
  })

  return { repository, service }
}

