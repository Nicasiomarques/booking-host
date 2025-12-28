import { PrismaClient } from '@prisma/client'
import { BookingService } from './application/booking.service.js'
import { BookingRepository } from './adapters/persistence/booking.repository.js'
import type {
  UnitOfWorkPort,
  ServiceRepositoryPort,
  AvailabilityRepositoryPort,
  ExtraItemRepositoryPort,
  EstablishmentRepositoryPort,
  RoomRepositoryPort,
} from '#shared/application/ports/index.js'

export interface BookingComposition {
  repository: BookingRepository
  service: BookingService
}

export function createBookingComposition(
  prisma: PrismaClient,
  dependencies: {
    unitOfWork: UnitOfWorkPort
    serviceRepository: ServiceRepositoryPort
    availabilityRepository: AvailabilityRepositoryPort
    extraItemRepository: ExtraItemRepositoryPort
    establishmentRepository: EstablishmentRepositoryPort
    roomRepository: RoomRepositoryPort
  }
): BookingComposition {
  const repository = new BookingRepository(prisma)
  const service = new BookingService(
    dependencies.unitOfWork,
    repository,
    dependencies.serviceRepository,
    dependencies.availabilityRepository,
    dependencies.extraItemRepository,
    dependencies.establishmentRepository,
    dependencies.roomRepository
  )

  return { repository, service }
}

