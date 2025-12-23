import type {
  Booking,
  CreateBookingData,
  BookingExtraItemData,
  BookingStatus,
  Availability,
} from '#domain/index.js'

/**
 * Transactional booking repository - operations that run within a transaction
 */
export interface TransactionalBookingRepository {
  create(data: CreateBookingData, extras: BookingExtraItemData[]): Promise<Booking>
  updateStatus(id: string, status: BookingStatus): Promise<Booking>
}

/**
 * Transactional availability repository - operations that run within a transaction
 */
export interface TransactionalAvailabilityRepository {
  decrementCapacity(id: string, quantity: number): Promise<Availability>
  incrementCapacity(id: string, quantity: number): Promise<Availability>
}

/**
 * Unit of Work context provided within transactions
 */
export interface UnitOfWorkContext {
  bookingRepository: TransactionalBookingRepository
  availabilityRepository: TransactionalAvailabilityRepository
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
