import type {
  Establishment,
  CreateEstablishmentData,
  UpdateEstablishmentData,
  EstablishmentWithRole,
} from '#features/establishment/domain/index.js'
import type { Role, DomainError, Either } from '#shared/domain/index.js'
import type {
  Service,
  CreateServiceData,
  UpdateServiceData,
} from '#features/service/domain/index.js'
import type {
  Room,
  CreateRoomData,
  UpdateRoomData,
} from '#features/room/domain/index.js'
import type {
  Availability,
  CreateAvailabilityData,
  UpdateAvailabilityData,
} from '#features/availability/domain/index.js'
import type {
  ExtraItem,
  CreateExtraItemData,
  UpdateExtraItemData,
} from '#features/extra-item/domain/index.js'
import type {
  Booking,
  BookingWithDetails,
  ListBookingsOptions,
} from '#features/booking/domain/index.js'
import type { BookingStatus, PaginatedResult } from '#shared/domain/index.js'

/**
 * Port interface for Establishment repository operations
 */
export interface EstablishmentRepositoryPort {
  create(data: CreateEstablishmentData, userId: string): Promise<Either<DomainError, Establishment>>
  findById(id: string): Promise<Either<DomainError, Establishment | null>>
  findByUserId(userId: string): Promise<Either<DomainError, EstablishmentWithRole[]>>
  update(id: string, data: UpdateEstablishmentData): Promise<Either<DomainError, Establishment>>
  getUserRole(userId: string, establishmentId: string): Promise<Either<DomainError, Role | null>>
}

/**
 * Port interface for Service repository operations
 */
export interface ServiceRepositoryPort {
  create(data: CreateServiceData): Promise<Either<DomainError, Service>>
  findById(id: string): Promise<Either<DomainError, Service | null>>
  findByEstablishment(establishmentId: string, options?: { activeOnly?: boolean }): Promise<Either<DomainError, Service[]>>
  update(id: string, data: UpdateServiceData): Promise<Either<DomainError, Service>>
  softDelete(id: string): Promise<Either<DomainError, Service>>
  hasActiveBookings(id: string): Promise<Either<DomainError, boolean>>
}

/**
 * Port interface for Availability repository operations
 */
export interface AvailabilityRepositoryPort {
  create(data: CreateAvailabilityData): Promise<Either<DomainError, Availability>>
  findById(id: string): Promise<Either<DomainError, Availability | null>>
  findByIdWithService(id: string): Promise<Either<DomainError, (Availability & { service: { establishmentId: string } }) | null>>
  findByService(serviceId: string, options?: { startDate?: Date; endDate?: Date }): Promise<Either<DomainError, Availability[]>>
  update(id: string, data: UpdateAvailabilityData): Promise<Either<DomainError, Availability>>
  delete(id: string): Promise<Either<DomainError, Availability>>
  checkOverlap(
    serviceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<Either<DomainError, boolean>>
  hasActiveBookings(id: string): Promise<Either<DomainError, boolean>>
}

/**
 * Port interface for ExtraItem repository operations
 */
export interface ExtraItemRepositoryPort {
  create(data: CreateExtraItemData): Promise<Either<DomainError, ExtraItem>>
  findById(id: string): Promise<Either<DomainError, ExtraItem | null>>
  findByIdWithService(id: string): Promise<Either<DomainError, (ExtraItem & { service: { establishmentId: string } }) | null>>
  findByService(serviceId: string, options?: { activeOnly?: boolean }): Promise<Either<DomainError, ExtraItem[]>>
  update(id: string, data: UpdateExtraItemData): Promise<Either<DomainError, ExtraItem>>
  softDelete(id: string): Promise<Either<DomainError, ExtraItem>>
}

/**
 * Port interface for Room repository operations
 */
export interface RoomRepositoryPort {
  create(data: CreateRoomData): Promise<Either<DomainError, Room>>
  findById(id: string): Promise<Either<DomainError, Room | null>>
  findByService(serviceId: string): Promise<Either<DomainError, Room[]>>
  findAvailableRooms(serviceId: string, checkInDate: Date, checkOutDate: Date): Promise<Either<DomainError, Room[]>>
  update(id: string, data: UpdateRoomData): Promise<Either<DomainError, Room>>
  delete(id: string): Promise<Either<DomainError, Room>>
  hasActiveBookings(id: string): Promise<Either<DomainError, boolean>>
}

/**
 * Port interface for Booking repository operations (read-only, outside transactions)
 */
export interface BookingRepositoryPort {
  findById(id: string): Promise<Either<DomainError, BookingWithDetails | null>>
  findByUser(userId: string, options?: ListBookingsOptions): Promise<Either<DomainError, PaginatedResult<BookingWithDetails>>>
  findByEstablishment(
    establishmentId: string,
    options?: ListBookingsOptions
  ): Promise<Either<DomainError, PaginatedResult<BookingWithDetails>>>
  getBookingOwnership(id: string): Promise<Either<DomainError, {
    userId: string
    establishmentId: string
    quantity: number
    availabilityId: string
    status: BookingStatus
    roomId: string | null
    serviceType: string | null
  } | null>>
  updateStatus(id: string, status: BookingStatus): Promise<Either<DomainError, Booking>>
}

