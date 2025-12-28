import { PrismaClient } from '@prisma/client'
import { createEstablishmentService } from './application/establishment.service.js'
import { createEstablishmentRepository } from './adapters/persistence/establishment.repository.js'
import type { EstablishmentRepositoryPort, RepositoryErrorHandlerPort } from '#shared/application/ports/index.js'

export interface EstablishmentComposition {
  repository: EstablishmentRepositoryPort
  service: ReturnType<typeof createEstablishmentService>
}

export function createEstablishmentComposition(
  prisma: PrismaClient,
  errorHandler: RepositoryErrorHandlerPort
): EstablishmentComposition {
  const repository = createEstablishmentRepository(prisma, errorHandler)
  const service = createEstablishmentService({ repository })

  return { repository, service }
}

