import { PrismaClient } from '@prisma/client'
import { EstablishmentService } from './application/establishment.service.js'
import { EstablishmentRepository } from './adapters/persistence/establishment.repository.js'

export interface EstablishmentComposition {
  repository: EstablishmentRepository
  service: EstablishmentService
}

export function createEstablishmentComposition(
  prisma: PrismaClient
): EstablishmentComposition {
  const repository = new EstablishmentRepository(prisma)
  const service = new EstablishmentService(repository)

  return { repository, service }
}

