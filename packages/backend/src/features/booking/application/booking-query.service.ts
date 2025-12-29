import type * as BookingDomain from '../domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import * as Validation from '#shared/application/utils/validation.helper.js'
import * as BookingDomainValues from '../domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'

export const createBookingQueryService = (deps: {
  bookingRepository: Ports.BookingRepositoryPort
  establishmentRepository: Ports.EstablishmentRepositoryPort
}) => ({
  async findById(id: string, userId: string): Promise<Domain.Either<Domain.DomainError, BookingDomain.BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (Validation.isLeft(bookingResult)) return bookingResult
    
    const bookingEither = Validation.requireEntity(bookingResult.value, 'Booking')
    if (Validation.isLeft(bookingEither)) return bookingEither;
    const booking = bookingEither.value

    if (!BookingDomainValues.bookingBelongsToUser(booking, userId)) {
      const roleResult = await deps.establishmentRepository.getUserRole(userId, booking.establishmentId)
      if (Validation.isLeft(roleResult) || !roleResult.value) {
        return DomainValues.left(new DomainValues.ForbiddenError('You do not have access to this booking'))
      }
    }

    return DomainValues.right(booking)
  },

  async findByUser(
    userId: string,
    options: BookingDomain.ListBookingsOptions = {}
  ): Promise<Domain.Either<Domain.DomainError, Domain.PaginatedResult<BookingDomain.BookingWithDetails>>> {
    return deps.bookingRepository.findByUser(userId, options)
  },

  async findByEstablishment(
    establishmentId: string,
    userId: string,
    options: BookingDomain.ListBookingsOptions = {}
  ): Promise<Domain.Either<Domain.DomainError, Domain.PaginatedResult<BookingDomain.BookingWithDetails>>> {
    const roleResult = await deps.establishmentRepository.getUserRole(userId, establishmentId)
    if (Validation.isLeft(roleResult) || !roleResult.value) {
      return DomainValues.left(new DomainValues.ForbiddenError('You do not have access to this establishment bookings'))
    }

    return deps.bookingRepository.findByEstablishment(establishmentId, options)
  },
})

