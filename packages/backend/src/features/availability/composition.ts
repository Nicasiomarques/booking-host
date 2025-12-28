import { PrismaClient } from '@prisma/client'
import { createAvailabilityService } from './application/availability.service.js'
import { createAvailabilityRepository } from './adapters/persistence/availability.repository.js'
import type {
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
  AvailabilityRepositoryPort,
  RepositoryErrorHandlerPort,
} from '#shared/application/ports/index.js'

export interface AvailabilityComposition {
  repository: AvailabilityRepositoryPort
  service: ReturnType<typeof createAvailabilityService>
}

export function createAvailabilityComposition(
  prisma: PrismaClient,
  dependencies: {
    serviceRepository: ServiceRepositoryPort
    establishmentRepository: EstablishmentRepositoryPort
    errorHandler: RepositoryErrorHandlerPort
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

