import type { BookingWithDetails } from '../domain/index.js'
import type { DomainError, Either } from '#shared/domain/index.js'
import { NotFoundError, ForbiddenError, ConflictError } from '#shared/domain/index.js'
import { left, right, isLeft } from '#shared/domain/index.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'
import {
  canBookingBeCheckedIn,
  canBookingBeCheckedOut,
  canBookingStatusBeCancelled,
  canBookingStatusBeConfirmed,
} from '../domain/index.js'
import { isServiceHotel } from '#features/service/domain/index.js'
import type {
  UnitOfWorkPort,
  BookingRepositoryPort,
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
  AvailabilityRepositoryPort,
  RoomRepositoryPort,
} from '#shared/application/ports/index.js'

export const createBookingStatusService = (deps: {
  unitOfWork: UnitOfWorkPort
  bookingRepository: BookingRepositoryPort
  serviceRepository: ServiceRepositoryPort
  establishmentRepository: EstablishmentRepositoryPort
  availabilityRepository: AvailabilityRepositoryPort
  roomRepository: RoomRepositoryPort
}) => ({
  async cancel(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const ownershipResult = await deps.bookingRepository.getBookingOwnership(id)
    if (isLeft(ownershipResult)) return ownershipResult
    
    const ownershipEither = requireEntity(ownershipResult.value, 'Booking')
    if (isLeft(ownershipEither)) return ownershipEither;
    
    const ownership = ownershipEither.value
    if (ownership.userId !== userId) {
      const roleResult = await deps.establishmentRepository.getUserRole(userId, ownership.establishmentId)
      if (isLeft(roleResult) || !roleResult.value) {
        return left(new ForbiddenError('You do not have permission to cancel this booking'))
      }
    }

    const canCancelResult = canBookingStatusBeCancelled(ownership.status)
    if (isLeft(canCancelResult)) return canCancelResult;

    const transactionResult = await deps.unitOfWork.execute(async (ctx) => {
      const capacityResult = await ctx.availabilityRepository.incrementCapacity(
        ownership.availabilityId,
        ownership.quantity
      )
      if (isLeft(capacityResult)) return capacityResult;

      if (ownership.serviceType === 'HOTEL' && ownership.roomId) {
        const roomStatusResult = await ctx.roomRepository.updateStatus(ownership.roomId, 'AVAILABLE')
        if (isLeft(roomStatusResult)) return roomStatusResult;
      }

      return ctx.bookingRepository.updateStatus(id, 'CANCELLED')
    })

    if (isLeft(transactionResult)) return transactionResult;

    return deps.bookingRepository.findById(id).then((result) => {
      if (isLeft(result) || !result.value) return left(new NotFoundError('Booking'));
      return right(result.value)
    })
  },

  async confirm(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const ownershipResult = await deps.bookingRepository.getBookingOwnership(id)
    if (isLeft(ownershipResult)) return ownershipResult
    
    const ownershipEither = requireEntity(ownershipResult.value, 'Booking')
    if (isLeft(ownershipEither)) return ownershipEither;
    const ownership = ownershipEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, ownership.establishmentId)
    if (isLeft(roleResult) || !roleResult.value) {
      return left(new ForbiddenError('You do not have permission to confirm this booking'))
    }

    const canConfirmResult = canBookingStatusBeConfirmed(ownership.status)
    if (isLeft(canConfirmResult)) return canConfirmResult;

    const updateResult = await deps.bookingRepository.updateStatus(id, 'CONFIRMED')
    if (isLeft(updateResult)) return updateResult;

    return deps.bookingRepository.findById(id).then((result) => {
      if (isLeft(result) || !result.value) return left(new NotFoundError('Booking'));
      return right(result.value)
    })
  },

  async checkIn(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (isLeft(bookingResult)) return bookingResult
    
    const bookingEither = requireEntity(bookingResult.value, 'Booking')
    if (isLeft(bookingEither)) return bookingEither;
    const booking = bookingEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (isLeft(roleResult) || !roleResult.value) {
      return left(new ForbiddenError('You do not have permission to check in this booking'))
    }

    const serviceResult = await deps.serviceRepository.findById(booking.serviceId)
    if (isLeft(serviceResult) || !serviceResult.value) {
      return left(new NotFoundError('Service'))
    }
    if (!isServiceHotel(serviceResult.value)) {
      return left(new ConflictError('Check-in is only available for hotel bookings'))
    }

    const canCheckInResult = canBookingBeCheckedIn(booking)
    if (isLeft(canCheckInResult)) return canCheckInResult;

    const updateResult = await deps.bookingRepository.updateStatus(id, 'CHECKED_IN')
    if (isLeft(updateResult)) return updateResult;

    return deps.bookingRepository.findById(id).then((result) => {
      if (isLeft(result) || !result.value) return left(new NotFoundError('Booking'))
      return right(result.value)
    })
  },

  async checkOut(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (isLeft(bookingResult)) return bookingResult
    
    const bookingEither = requireEntity(bookingResult.value, 'Booking')
    if (isLeft(bookingEither)) return bookingEither;
    const booking = bookingEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (isLeft(roleResult) || !roleResult.value) {
      return left(new ForbiddenError('You do not have permission to check out this booking'))
    }

    const serviceResult = await deps.serviceRepository.findById(booking.serviceId)
    if (isLeft(serviceResult) || !serviceResult.value) return left(new NotFoundError('Service'))
    
    if (!isServiceHotel(serviceResult.value)) {
      return left(new ConflictError('Check-out is only available for hotel bookings'))
    }

    const canCheckOutResult = canBookingBeCheckedOut(booking)
    if (isLeft(canCheckOutResult)) return canCheckOutResult;

    const transactionResult = await deps.unitOfWork.execute(async (ctx) => {
      const updateResult = await ctx.bookingRepository.updateStatus(id, 'CHECKED_OUT')
      if (isLeft(updateResult)) return updateResult;

      if (booking.roomId) {
        const roomStatusResult = await ctx.roomRepository.updateStatus(booking.roomId, 'AVAILABLE')
        if (isLeft(roomStatusResult)) return roomStatusResult;
      }

      return right(undefined)
    })

    if (isLeft(transactionResult)) return transactionResult;

    return deps.bookingRepository.findById(id).then((result) => {
      if (isLeft(result) || !result.value) return left(new NotFoundError('Booking'));
      return right(result.value)
    })
  },

  async markNoShow(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (isLeft(bookingResult)) return bookingResult
    
    const bookingEither = requireEntity(bookingResult.value, 'Booking')
    if (isLeft(bookingEither)) return bookingEither;
    const booking = bookingEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (isLeft(roleResult) || !roleResult.value) {
      return left(new ForbiddenError('You do not have permission to mark this booking as no-show'))
    }

    const serviceResult = await deps.serviceRepository.findById(booking.serviceId)
    if (isLeft(serviceResult) || !serviceResult.value) {
      return left(new NotFoundError('Service'))
    }
    if (!isServiceHotel(serviceResult.value)) {
      return left(new ConflictError('No-show is only available for hotel bookings'))
    }

    if (booking.status === 'CHECKED_IN') {
      return left(new ConflictError('Cannot mark a checked-in booking as no-show'))
    }

    if (booking.status === 'CHECKED_OUT') {
      return left(new ConflictError('Cannot mark a checked-out booking as no-show'))
    }

    if (booking.status === 'NO_SHOW') {
      return left(new ConflictError('Booking is already marked as no-show'))
    }

    if (booking.status === 'CANCELLED') {
      return left(new ConflictError('Cannot mark a cancelled booking as no-show'))
    }

    const transactionResult = await deps.unitOfWork.execute(async (ctx) => {
      const updateResult = await ctx.bookingRepository.updateStatus(id, 'NO_SHOW')
      if (isLeft(updateResult)) return updateResult
      

      if (booking.roomId) {
        const roomStatusResult = await ctx.roomRepository.updateStatus(booking.roomId, 'AVAILABLE')
        if (isLeft(roomStatusResult)) return roomStatusResult;
      }

      return right(undefined)
    })

    if (isLeft(transactionResult)) return transactionResult

    return deps.bookingRepository.findById(id).then((result) => {
      if (isLeft(result) || !result.value) return left(new NotFoundError('Booking'));
      return right(result.value)
    })
  },
})

