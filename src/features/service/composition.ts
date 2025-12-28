import { PrismaClient } from '@prisma/client'
import { ServiceService } from './application/service.service.js'
import { ServiceRepository } from './adapters/persistence/service.repository.js'
import type { EstablishmentRepositoryPort } from '#shared/application/ports/index.js'

export interface ServiceComposition {
  repository: ServiceRepository
  service: ServiceService
}

export function createServiceComposition(
  prisma: PrismaClient,
  dependencies: {
    establishmentRepository: EstablishmentRepositoryPort
  }
): ServiceComposition {
  const repository = new ServiceRepository(prisma)
  const service = new ServiceService(repository, dependencies.establishmentRepository)

  return { repository, service }
}

