import type {
  BookingWithDetails,
  ListBookingsOptions,
} from '../domain/index.js'
import type { PaginatedResult, DomainError, Either } from '#shared/domain/index.js'
import { ForbiddenError } from '#shared/domain/index.js'
import { left, right, isLeft } from '#shared/domain/index.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'
import { bookingBelongsToUser } from '../domain/index.js'
import type {
  BookingRepositoryPort,
  EstablishmentRepositoryPort,
} from '#shared/application/ports/index.js'

export const createBookingQueryService = (deps: {
  bookingRepository: BookingRepositoryPort
  establishmentRepository: EstablishmentRepositoryPort
}) => ({
  async findById(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (isLeft(bookingResult)) return bookingResult
    
    const bookingEither = requireEntity(bookingResult.value, 'Booking')
    if (isLeft(bookingEither)) return bookingEither;
    const booking = bookingEither.value

    if (!bookingBelongsToUser(booking, userId)) {
      const roleResult = await deps.establishmentRepository.getUserRole(userId, booking.establishmentId)
      if (isLeft(roleResult) || !roleResult.value) {
        return left(new ForbiddenError('You do not have access to this booking'))
      }
    }

    return right(booking)
  },

  async findByUser(
    userId: string,
    options: ListBookingsOptions = {}
  ): Promise<Either<DomainError, PaginatedResult<BookingWithDetails>>> {
    return deps.bookingRepository.findByUser(userId, options)
  },

  async findByEstablishment(
    establishmentId: string,
    userId: string,
    options: ListBookingsOptions = {}
  ): Promise<Either<DomainError, PaginatedResult<BookingWithDetails>>> {
    const roleResult = await deps.establishmentRepository.getUserRole(userId, establishmentId)
    if (isLeft(roleResult) || !roleResult.value) {
      return left(new ForbiddenError('You do not have access to this establishment bookings'))
    }

    return deps.bookingRepository.findByEstablishment(establishmentId, options)
  },
})

