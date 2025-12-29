import { PrismaClient } from '@prisma/client'
import { createAvailabilityService } from './application/availability.service.js'
import { createAvailabilityRepository } from './adapters/repository.js'
import type * as Ports from '#shared/application/ports/index.js'

export interface AvailabilityComposition {
  repository: Ports.AvailabilityRepositoryPort
  service: ReturnType<typeof createAvailabilityService>
}

export function createAvailabilityComposition(
  prisma: PrismaClient,
  dependencies: {
    serviceRepository: Ports.ServiceRepositoryPort
    establishmentRepository: Ports.EstablishmentRepositoryPort
    errorHandler: Ports.RepositoryErrorHandlerPort
  }
): AvailabilityComposition {
  const repository = createAvailabilityRepository(prisma, dependencies.errorHandler)
  const service = createAvailabilityService({
    repository,
    serviceRepository: dependencies.serviceRepository,
    establishmentRepository: dependencies.establishmentRepository,
  })

  return { repository, service }
}

