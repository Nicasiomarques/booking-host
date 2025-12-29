import type * as BookingDomain from '../domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import * as Validation from '#shared/application/utils/validation.helper.js'
import {
  canBookingBeCheckedIn,
  canBookingBeCheckedOut,
  canBookingStatusBeCancelled,
  canBookingStatusBeConfirmed,
} from '../domain/index.js'
import * as ServiceDomainValues from '#features/service/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'

export const createBookingStatusService = (deps: {
  unitOfWork: Ports.UnitOfWorkPort
  bookingRepository: Ports.BookingRepositoryPort
  serviceRepository: Ports.ServiceRepositoryPort
  establishmentRepository: Ports.EstablishmentRepositoryPort
  availabilityRepository: Ports.AvailabilityRepositoryPort
  roomRepository: Ports.RoomRepositoryPort
}) => ({
  async cancel(id: string, userId: string): Promise<Domain.Either<Domain.DomainError, BookingDomain.BookingWithDetails>> {
    const ownershipResult = await deps.bookingRepository.getBookingOwnership(id)
    if (Validation.isLeft(ownershipResult)) return ownershipResult
    
    const ownershipEither = Validation.requireEntity(ownershipResult.value, 'Booking')
    if (Validation.isLeft(ownershipEither)) return ownershipEither;
    
    const ownership = ownershipEither.value
    if (ownership.userId !== userId) {
      const roleResult = await deps.establishmentRepository.getUserRole(userId, ownership.establishmentId)
      if (Validation.isLeft(roleResult) || !roleResult.value) {
        return DomainValues.left(new DomainValues.ForbiddenError('You do not have permission to cancel this booking'))
      }
    }

    const canCancelResult = canBookingStatusBeCancelled(ownership.status)
    if (Validation.isLeft(canCancelResult)) return canCancelResult;

    const transactionResult = await deps.unitOfWork.execute(async (ctx) => {
      const capacityResult = await ctx.availabilityRepository.incrementCapacity(
        ownership.availabilityId,
        ownership.quantity
      )
      if (Validation.isLeft(capacityResult)) return capacityResult;

      if (ownership.serviceType === 'HOTEL' && ownership.roomId) {
        const roomStatusResult = await ctx.roomRepository.updateStatus(ownership.roomId, 'AVAILABLE')
        if (Validation.isLeft(roomStatusResult)) return roomStatusResult;
      }

      return ctx.bookingRepository.updateStatus(id, 'CANCELLED')
    })

    if (Validation.isLeft(transactionResult)) return transactionResult;

    return deps.bookingRepository.findById(id).then((result) => {
      if (Validation.isLeft(result) || !result.value) return DomainValues.left(new DomainValues.NotFoundError('Booking'));
      return DomainValues.right(result.value)
    })
  },

  async confirm(id: string, userId: string): Promise<Domain.Either<Domain.DomainError, BookingDomain.BookingWithDetails>> {
    const ownershipResult = await deps.bookingRepository.getBookingOwnership(id)
    if (Validation.isLeft(ownershipResult)) return ownershipResult
    
    const ownershipEither = Validation.requireEntity(ownershipResult.value, 'Booking')
    if (Validation.isLeft(ownershipEither)) return ownershipEither;
    const ownership = ownershipEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, ownership.establishmentId)
    if (Validation.isLeft(roleResult) || !roleResult.value) {
      return DomainValues.left(new DomainValues.ForbiddenError('You do not have permission to confirm this booking'))
    }

    const canConfirmResult = canBookingStatusBeConfirmed(ownership.status)
    if (Validation.isLeft(canConfirmResult)) return canConfirmResult;

    const updateResult = await deps.bookingRepository.updateStatus(id, 'CONFIRMED')
    if (Validation.isLeft(updateResult)) return updateResult;

    return deps.bookingRepository.findById(id).then((result) => {
      if (Validation.isLeft(result) || !result.value) return DomainValues.left(new DomainValues.NotFoundError('Booking'));
      return DomainValues.right(result.value)
    })
  },

  async checkIn(id: string, userId: string): Promise<Domain.Either<Domain.DomainError, BookingDomain.BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (Validation.isLeft(bookingResult)) return bookingResult
    
    const bookingEither = Validation.requireEntity(bookingResult.value, 'Booking')
    if (Validation.isLeft(bookingEither)) return bookingEither;
    const booking = bookingEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (Validation.isLeft(roleResult) || !roleResult.value) {
      return DomainValues.left(new DomainValues.ForbiddenError('You do not have permission to check in this booking'))
    }

    const serviceResult = await deps.serviceRepository.findById(booking.serviceId)
    if (Validation.isLeft(serviceResult) || !serviceResult.value) {
      return DomainValues.left(new DomainValues.NotFoundError('Service'))
    }
    if (!ServiceDomainValues.isServiceHotel(serviceResult.value)) {
      return DomainValues.left(new DomainValues.ConflictError('Check-in is only available for hotel bookings'))
    }

    const canCheckInResult = canBookingBeCheckedIn(booking)
    if (Validation.isLeft(canCheckInResult)) return canCheckInResult;

    const updateResult = await deps.bookingRepository.updateStatus(id, 'CHECKED_IN')
    if (Validation.isLeft(updateResult)) return updateResult;

    return deps.bookingRepository.findById(id).then((result) => {
      if (Validation.isLeft(result) || !result.value) return DomainValues.left(new DomainValues.NotFoundError('Booking'))
      return DomainValues.right(result.value)
    })
  },

  async checkOut(id: string, userId: string): Promise<Domain.Either<Domain.DomainError, BookingDomain.BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (Validation.isLeft(bookingResult)) return bookingResult
    
    const bookingEither = Validation.requireEntity(bookingResult.value, 'Booking')
    if (Validation.isLeft(bookingEither)) return bookingEither;
    const booking = bookingEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (Validation.isLeft(roleResult) || !roleResult.value) {
      return DomainValues.left(new DomainValues.ForbiddenError('You do not have permission to check out this booking'))
    }

    const serviceResult = await deps.serviceRepository.findById(booking.serviceId)
    if (Validation.isLeft(serviceResult) || !serviceResult.value) return DomainValues.left(new DomainValues.NotFoundError('Service'))
    
    if (!ServiceDomainValues.isServiceHotel(serviceResult.value)) {
      return DomainValues.left(new DomainValues.ConflictError('Check-out is only available for hotel bookings'))
    }

    const canCheckOutResult = canBookingBeCheckedOut(booking)
    if (Validation.isLeft(canCheckOutResult)) return canCheckOutResult;

    const transactionResult = await deps.unitOfWork.execute(async (ctx) => {
      const updateResult = await ctx.bookingRepository.updateStatus(id, 'CHECKED_OUT')
      if (Validation.isLeft(updateResult)) return updateResult;

      // Restore availability capacity when checking out
      const capacityResult = await ctx.availabilityRepository.incrementCapacity(
        booking.availabilityId,
        booking.quantity
      )
      if (Validation.isLeft(capacityResult)) return capacityResult;

      if (booking.roomId) {
        const roomStatusResult = await ctx.roomRepository.updateStatus(booking.roomId, 'AVAILABLE')
        if (Validation.isLeft(roomStatusResult)) return roomStatusResult;
      }

      return DomainValues.right(undefined)
    })

    if (Validation.isLeft(transactionResult)) return transactionResult;

    return deps.bookingRepository.findById(id).then((result) => {
      if (Validation.isLeft(result) || !result.value) return DomainValues.left(new DomainValues.NotFoundError('Booking'));
      return DomainValues.right(result.value)
    })
  },

  async markNoShow(id: string, userId: string): Promise<Domain.Either<Domain.DomainError, BookingDomain.BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (Validation.isLeft(bookingResult)) return bookingResult
    
    const bookingEither = Validation.requireEntity(bookingResult.value, 'Booking')
    if (Validation.isLeft(bookingEither)) return bookingEither;
    const booking = bookingEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (Validation.isLeft(roleResult) || !roleResult.value) {
      return DomainValues.left(new DomainValues.ForbiddenError('You do not have permission to mark this booking as no-show'))
    }

    const serviceResult = await deps.serviceRepository.findById(booking.serviceId)
    if (Validation.isLeft(serviceResult) || !serviceResult.value) {
      return DomainValues.left(new DomainValues.NotFoundError('Service'))
    }
    if (!ServiceDomainValues.isServiceHotel(serviceResult.value)) {
      return DomainValues.left(new DomainValues.ConflictError('No-show is only available for hotel bookings'))
    }

    if (booking.status === 'CHECKED_IN') {
      return DomainValues.left(new DomainValues.ConflictError('Cannot mark a checked-in booking as no-show'))
    }

    if (booking.status === 'CHECKED_OUT') {
      return DomainValues.left(new DomainValues.ConflictError('Cannot mark a checked-out booking as no-show'))
    }

    if (booking.status === 'NO_SHOW') {
      return DomainValues.left(new DomainValues.ConflictError('Booking is already marked as no-show'))
    }

    if (booking.status === 'CANCELLED') {
      return DomainValues.left(new DomainValues.ConflictError('Cannot mark a cancelled booking as no-show'))
    }

    const transactionResult = await deps.unitOfWork.execute(async (ctx) => {
      const updateResult = await ctx.bookingRepository.updateStatus(id, 'NO_SHOW')
      if (Validation.isLeft(updateResult)) return updateResult
      
      // Restore availability capacity when marking as no-show
      const capacityResult = await ctx.availabilityRepository.incrementCapacity(
        booking.availabilityId,
        booking.quantity
      )
      if (Validation.isLeft(capacityResult)) return capacityResult;

      if (booking.roomId) {
        const roomStatusResult = await ctx.roomRepository.updateStatus(booking.roomId, 'AVAILABLE')
        if (Validation.isLeft(roomStatusResult)) return roomStatusResult;
      }

      return DomainValues.right(undefined)
    })

    if (Validation.isLeft(transactionResult)) return transactionResult

    return deps.bookingRepository.findById(id).then((result) => {
      if (Validation.isLeft(result) || !result.value) return DomainValues.left(new DomainValues.NotFoundError('Booking'));
      return DomainValues.right(result.value)
    })
  },
})

