import type * as BookingDomain from '#features/booking/domain/index.js'
import type * as AvailabilityDomain from '#features/availability/domain/index.js'
import type * as RoomDomain from '#features/room/domain/index.js'
import type * as Domain from '#shared/domain/index.js'

/**
 * Transactional booking repository - operations that run within a transaction
 */
export interface TransactionalBookingRepository {
  create(data: BookingDomain.CreateBookingData, extras: BookingDomain.BookingExtraItemData[]): Promise<Domain.Either<Domain.DomainError, BookingDomain.Booking>>
  updateStatus(id: string, status: Domain.BookingStatus, cancellationReason?: string | null): Promise<Domain.Either<Domain.DomainError, BookingDomain.Booking>>
}

/**
 * Transactional availability repository - operations that run within a transaction
 */
export interface TransactionalAvailabilityRepository {
  decrementCapacity(id: string, quantity: number): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>>
  incrementCapacity(id: string, quantity: number): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>>
}

/**
 * Transactional room repository - operations that run within a transaction
 */
export interface TransactionalRoomRepository {
  updateStatus(id: string, status: Domain.RoomStatus): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>>
  isRoomAvailable(id: string, checkInDate: Date, checkOutDate: Date): Promise<Domain.Either<Domain.DomainError, boolean>>
}

/**
 * Unit of Work context provided within transactions
 */
export interface UnitOfWorkContext {
  bookingRepository: TransactionalBookingRepository
  availabilityRepository: TransactionalAvailabilityRepository
  roomRepository: TransactionalRoomRepository
}

/**
 * Port interface for Unit of Work pattern.
 * Manages database transactions across multiple repositories.
 */
export interface UnitOfWorkPort {
  /**
   * Execute a set of operations within a transaction
   * @throws Re-throws any error from the work function after rollback
   */
  execute<T>(work: (context: UnitOfWorkContext) => Promise<T>): Promise<T>
}

