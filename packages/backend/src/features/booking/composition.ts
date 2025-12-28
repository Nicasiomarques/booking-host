import { PrismaClient } from '@prisma/client'
import { createBookingService } from './application/booking.service.js'
import { createBookingRepository } from './adapters/persistence/booking.repository.js'
import type {
  UnitOfWorkPort,
  ServiceRepositoryPort,
  AvailabilityRepositoryPort,
  ExtraItemRepositoryPort,
  EstablishmentRepositoryPort,
  RoomRepositoryPort,
  BookingRepositoryPort,
  RepositoryErrorHandlerPort,
} from '#shared/application/ports/index.js'

export interface BookingComposition {
  repository: BookingRepositoryPort
  service: ReturnType<typeof createBookingService>
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
    errorHandler: RepositoryErrorHandlerPort
  }
): BookingComposition {
  const repository = createBookingRepository(prisma, dependencies.errorHandler)
  const service = createBookingService({
    unitOfWork: dependencies.unitOfWork,
    bookingRepository: repository,
    serviceRepository: dependencies.serviceRepository,
    availabilityRepository: dependencies.availabilityRepository,
    extraItemRepository: dependencies.extraItemRepository,
    establishmentRepository: dependencies.establishmentRepository,
    roomRepository: dependencies.roomRepository,
  })

  return { repository, service }
}

