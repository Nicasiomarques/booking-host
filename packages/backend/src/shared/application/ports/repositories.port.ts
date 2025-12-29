import type * as Domain from '#shared/domain/index.js'
import type * as EstablishmentDomain from '#features/establishment/domain/index.js'
import type * as ServiceDomain from '#features/service/domain/index.js'
import type * as RoomDomain from '#features/room/domain/index.js'
import type * as AvailabilityDomain from '#features/availability/domain/index.js'
import type * as ExtraItemDomain from '#features/extra-item/domain/index.js'
import type * as BookingDomain from '#features/booking/domain/index.js'

export interface EstablishmentRepositoryPort {
  create(data: EstablishmentDomain.CreateEstablishmentData, userId: string): Promise<Domain.Either<Domain.DomainError, EstablishmentDomain.Establishment>>
  findById(id: string): Promise<Domain.Either<Domain.DomainError, EstablishmentDomain.Establishment | null>>
  findByUserId(userId: string): Promise<Domain.Either<Domain.DomainError, EstablishmentDomain.EstablishmentWithRole[]>>
  update(id: string, data: EstablishmentDomain.UpdateEstablishmentData): Promise<Domain.Either<Domain.DomainError, EstablishmentDomain.Establishment>>
  getUserRole(userId: string, establishmentId: string): Promise<Domain.Either<Domain.DomainError, Domain.Role | null>>
}

export interface ServiceRepositoryPort {
  create(data: ServiceDomain.CreateServiceData): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service>>
  findById(id: string): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service | null>>
  findByEstablishment(establishmentId: string, options?: { activeOnly?: boolean }): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service[]>>
  update(id: string, data: ServiceDomain.UpdateServiceData): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service>>
  softDelete(id: string): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service>>
  hasActiveBookings(id: string): Promise<Domain.Either<Domain.DomainError, boolean>>
}

export interface AvailabilityRepositoryPort {
  create(data: AvailabilityDomain.CreateAvailabilityData): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>>
  findById(id: string): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability | null>>
  findByIdWithService(id: string): Promise<Domain.Either<Domain.DomainError, (AvailabilityDomain.Availability & { service: { establishmentId: string } }) | null>>
  findByService(serviceId: string, options?: { startDate?: Date; endDate?: Date }): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability[]>>
  update(id: string, data: AvailabilityDomain.UpdateAvailabilityData): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>>
  delete(id: string): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>>
  checkOverlap(
    serviceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<Domain.Either<Domain.DomainError, boolean>>
  hasActiveBookings(id: string): Promise<Domain.Either<Domain.DomainError, boolean>>
}

export interface ExtraItemRepositoryPort {
  create(data: ExtraItemDomain.CreateExtraItemData): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem>>
  findById(id: string): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem | null>>
  findByIdWithService(id: string): Promise<Domain.Either<Domain.DomainError, (ExtraItemDomain.ExtraItem & { service: { establishmentId: string } }) | null>>
  findByService(serviceId: string, options?: { activeOnly?: boolean }): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem[]>>
  update(id: string, data: ExtraItemDomain.UpdateExtraItemData): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem>>
  softDelete(id: string): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem>>
}

export interface RoomRepositoryPort {
  create(data: RoomDomain.CreateRoomData): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>>
  findById(id: string): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room | null>>
  findByService(serviceId: string): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room[]>>
  findAvailableRooms(serviceId: string, checkInDate: Date, checkOutDate: Date): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room[]>>
  update(id: string, data: RoomDomain.UpdateRoomData): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>>
  delete(id: string): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>>
  hasActiveBookings(id: string): Promise<Domain.Either<Domain.DomainError, boolean>>
}

export interface BookingRepositoryPort {
  findById(id: string): Promise<Domain.Either<Domain.DomainError, BookingDomain.BookingWithDetails | null>>
  findByUser(userId: string, options?: BookingDomain.ListBookingsOptions): Promise<Domain.Either<Domain.DomainError, Domain.PaginatedResult<BookingDomain.BookingWithDetails>>>
  findByEstablishment(
    establishmentId: string,
    options?: BookingDomain.ListBookingsOptions
  ): Promise<Domain.Either<Domain.DomainError, Domain.PaginatedResult<BookingDomain.BookingWithDetails>>>
  getBookingOwnership(id: string): Promise<Domain.Either<Domain.DomainError, {
    userId: string
    establishmentId: string
    quantity: number
    availabilityId: string
    status: Domain.BookingStatus
    roomId: string | null
    serviceType: string | null
  } | null>>
  updateStatus(id: string, status: Domain.BookingStatus): Promise<Domain.Either<Domain.DomainError, BookingDomain.Booking>>
}

