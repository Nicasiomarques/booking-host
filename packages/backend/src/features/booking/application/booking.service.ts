import { createBookingCreationService, type CreateBookingInput } from './booking-creation.service.js'
import { createBookingStatusService } from './booking-status.service.js'
import { createBookingQueryService } from './booking-query.service.js'
import type {
  UnitOfWorkPort,
  ServiceRepositoryPort,
  AvailabilityRepositoryPort,
  ExtraItemRepositoryPort,
  EstablishmentRepositoryPort,
  BookingRepositoryPort,
  RoomRepositoryPort,
} from '#shared/application/ports/index.js'

export type { CreateBookingInput }

interface BookingServiceDependencies {
  unitOfWork: UnitOfWorkPort
  bookingRepository: BookingRepositoryPort
  serviceRepository: ServiceRepositoryPort
  availabilityRepository: AvailabilityRepositoryPort
  extraItemRepository: ExtraItemRepositoryPort
  establishmentRepository: EstablishmentRepositoryPort
  roomRepository: RoomRepositoryPort
}

export const createBookingService = (deps: BookingServiceDependencies) => {
  const creationService = createBookingCreationService({
    unitOfWork: deps.unitOfWork,
    bookingRepository: deps.bookingRepository,
    serviceRepository: deps.serviceRepository,
    availabilityRepository: deps.availabilityRepository,
    extraItemRepository: deps.extraItemRepository,
    roomRepository: deps.roomRepository,
  })

  const statusService = createBookingStatusService({
    unitOfWork: deps.unitOfWork,
    bookingRepository: deps.bookingRepository,
    serviceRepository: deps.serviceRepository,
    establishmentRepository: deps.establishmentRepository,
    availabilityRepository: deps.availabilityRepository,
    roomRepository: deps.roomRepository,
  })

  const queryService = createBookingQueryService({
    bookingRepository: deps.bookingRepository,
    establishmentRepository: deps.establishmentRepository,
  })

  return {
    create: creationService.create.bind(creationService),
    findById: queryService.findById.bind(queryService),
    findByUser: queryService.findByUser.bind(queryService),
    findByEstablishment: queryService.findByEstablishment.bind(queryService),
    cancel: statusService.cancel.bind(statusService),
    confirm: statusService.confirm.bind(statusService),
    checkIn: statusService.checkIn.bind(statusService),
    checkOut: statusService.checkOut.bind(statusService),
    markNoShow: statusService.markNoShow.bind(statusService),
  }
}
