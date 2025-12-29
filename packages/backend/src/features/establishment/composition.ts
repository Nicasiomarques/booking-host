import { PrismaClient } from '@prisma/client'
import { createEstablishmentService } from './application/establishment.service.js'
import { createEstablishmentRepository } from './adapters/repository.js'
import type * as Ports from '#shared/application/ports/index.js'

export interface EstablishmentComposition {
  repository: Ports.EstablishmentRepositoryPort
  service: ReturnType<typeof createEstablishmentService>
}

export function createEstablishmentComposition(
  prisma: PrismaClient,
  dependencies: {
    errorHandler: Ports.RepositoryErrorHandlerPort
  }
): EstablishmentComposition {
  const repository = createEstablishmentRepository(prisma, dependencies.errorHandler)
  const service = createEstablishmentService({ repository })

  return { repository, service }
}

