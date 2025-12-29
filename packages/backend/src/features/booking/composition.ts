import { PrismaClient } from '@prisma/client'
import { createBookingService } from './application/booking.service.js'
import { createBookingRepository } from './adapters/persistence/booking.repository.js'
import type * as Ports from '#shared/application/ports/index.js'

export interface BookingComposition {
  repository: Ports.BookingRepositoryPort
  service: ReturnType<typeof createBookingService>
}

export function createBookingComposition(
  prisma: PrismaClient,
  dependencies: {
    unitOfWork: Ports.UnitOfWorkPort
    serviceRepository: Ports.ServiceRepositoryPort
    availabilityRepository: Ports.AvailabilityRepositoryPort
    extraItemRepository: Ports.ExtraItemRepositoryPort
    establishmentRepository: Ports.EstablishmentRepositoryPort
    roomRepository: Ports.RoomRepositoryPort
    errorHandler: Ports.RepositoryErrorHandlerPort
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

