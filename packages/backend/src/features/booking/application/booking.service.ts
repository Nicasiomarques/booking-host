import { createBookingCreationService, type CreateBookingInput } from './booking-creation.service.js'
import { createBookingStatusService } from './booking-status.service.js'
import { createBookingQueryService } from './booking-query.service.js'
import type * as Ports from '#shared/application/ports/index.js'

export type { CreateBookingInput }

interface BookingServiceDependencies {
  unitOfWork: Ports.UnitOfWorkPort
  bookingRepository: Ports.BookingRepositoryPort
  serviceRepository: Ports.ServiceRepositoryPort
  availabilityRepository: Ports.AvailabilityRepositoryPort
  extraItemRepository: Ports.ExtraItemRepositoryPort
  establishmentRepository: Ports.EstablishmentRepositoryPort
  roomRepository: Ports.RoomRepositoryPort
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
