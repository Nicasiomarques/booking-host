import type {
  Booking,
  CreateBookingData,
  BookingExtraItemData,
} from '#features/booking/domain/index.js'
import type { Availability } from '#features/availability/domain/index.js'
import type { Room } from '#features/room/domain/index.js'
import type { BookingStatus, RoomStatus, DomainError, Either } from '#shared/domain/index.js'

/**
 * Transactional booking repository - operations that run within a transaction
 */
export interface TransactionalBookingRepository {
  create(data: CreateBookingData, extras: BookingExtraItemData[]): Promise<Either<DomainError, Booking>>
  updateStatus(id: string, status: BookingStatus, cancellationReason?: string | null): Promise<Either<DomainError, Booking>>
}

/**
 * Transactional availability repository - operations that run within a transaction
 */
export interface TransactionalAvailabilityRepository {
  decrementCapacity(id: string, quantity: number): Promise<Either<DomainError, Availability>>
  incrementCapacity(id: string, quantity: number): Promise<Either<DomainError, Availability>>
}

/**
 * Transactional room repository - operations that run within a transaction
 */
export interface TransactionalRoomRepository {
  updateStatus(id: string, status: RoomStatus): Promise<Either<DomainError, Room>>
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

