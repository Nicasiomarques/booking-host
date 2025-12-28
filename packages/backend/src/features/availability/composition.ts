import { PrismaClient } from '@prisma/client'
import { AvailabilityService } from './application/availability.service.js'
import { AvailabilityRepository } from './adapters/persistence/availability.repository.js'
import type {
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
} from '#shared/application/ports/index.js'

export interface AvailabilityComposition {
  repository: AvailabilityRepository
  service: AvailabilityService
}

export function createAvailabilityComposition(
  prisma: PrismaClient,
  dependencies: {
    serviceRepository: ServiceRepositoryPort
    establishmentRepository: EstablishmentRepositoryPort
  }
): AvailabilityComposition {
  const repository = new AvailabilityRepository(prisma)
  const service = new AvailabilityService(
    repository,
    dependencies.serviceRepository,
    dependencies.establishmentRepository
  )

  return { repository, service }
}

