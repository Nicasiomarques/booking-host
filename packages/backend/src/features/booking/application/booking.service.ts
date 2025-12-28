import type {
  Booking,
  BookingWithDetails,
  BookingExtraItemData,
  ListBookingsOptions,
} from '../domain/index.js'
import type { PaginatedResult, DomainError, Either } from '#shared/domain/index.js'
import { NotFoundError, ForbiddenError, ConflictError } from '#shared/domain/index.js'
import { left, right, isLeft } from '#shared/domain/index.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'
import type {
  UnitOfWorkPort,
  ServiceRepositoryPort,
  AvailabilityRepositoryPort,
  ExtraItemRepositoryPort,
  EstablishmentRepositoryPort,
  BookingRepositoryPort,
  RoomRepositoryPort,
} from '#shared/application/ports/index.js'

export interface CreateBookingInput {
  serviceId: string
  availabilityId: string
  quantity: number
  extras?: Array<{
    extraItemId: string
    quantity: number
  }>
  // Hotel-specific fields
  checkInDate?: string
  checkOutDate?: string
  roomId?: string
  numberOfGuests?: number
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  guestDocument?: string
  notes?: string
}

export const createBookingService = (deps: {
  unitOfWork: UnitOfWorkPort
  bookingRepository: BookingRepositoryPort
  serviceRepository: ServiceRepositoryPort
  availabilityRepository: AvailabilityRepositoryPort
  extraItemRepository: ExtraItemRepositoryPort
  establishmentRepository: EstablishmentRepositoryPort
  roomRepository: RoomRepositoryPort
}) => ({

  async create(input: CreateBookingInput, userId: string): Promise<Either<DomainError, Booking>> {
    const serviceResult = await deps.serviceRepository.findById(input.serviceId)
    if (isLeft(serviceResult)) {
      return serviceResult
    }
    const serviceEither = requireEntity(serviceResult.value, 'Service')
    if (isLeft(serviceEither)) {
      return serviceEither
    }
    const service = serviceEither.value
    if (!service.active) {
      return left(new ConflictError('Service is not active'))
    }

    const availabilityResult = await deps.availabilityRepository.findById(input.availabilityId)
    if (isLeft(availabilityResult)) {
      return availabilityResult
    }
    const availabilityEither = requireEntity(availabilityResult.value, 'Availability')
    if (isLeft(availabilityEither)) {
      return availabilityEither
    }
    const availability = availabilityEither.value

    if (availability.serviceId !== input.serviceId) {
      return left(new ConflictError('Availability does not belong to the specified service'))
    }

    // Hotel-specific validations
    const isHotelBooking = service.type === 'HOTEL'
    let checkInDate: Date | undefined
    let checkOutDate: Date | undefined
    let numberOfNights: number | undefined
    let roomId: string | undefined

    if (isHotelBooking) {
      if (!input.checkInDate || !input.checkOutDate) {
        return left(new ConflictError('checkInDate and checkOutDate are required for hotel bookings'))
      }

      checkInDate = new Date(input.checkInDate + 'T00:00:00.000Z')
      checkOutDate = new Date(input.checkOutDate + 'T00:00:00.000Z')

      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      if (checkInDate < today) {
        return left(new ConflictError('checkInDate cannot be in the past'))
      }

      if (checkInDate >= checkOutDate) {
        return left(new ConflictError('checkOutDate must be after checkInDate'))
      }

      const diffTime = checkOutDate.getTime() - checkInDate.getTime()
      numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (numberOfNights < 1) {
        return left(new ConflictError('Minimum stay is 1 night'))
      }

      if (input.roomId) {
        const roomResult = await deps.roomRepository.findById(input.roomId)
        if (isLeft(roomResult)) {
          return roomResult
        }
        const roomEither = requireEntity(roomResult.value, 'Room')
        if (isLeft(roomEither)) {
          return roomEither
        }
        const room = roomEither.value

        if (room.serviceId !== input.serviceId) {
          return left(new ConflictError('Room does not belong to the specified service'))
        }

        if (room.status !== 'AVAILABLE') {
          return left(new ConflictError(`Room is ${room.status} and cannot be booked`))
        }

        const availableRoomsResult = await deps.roomRepository.findAvailableRooms(
          input.serviceId,
          checkInDate,
          checkOutDate
        )
        if (isLeft(availableRoomsResult)) {
          return availableRoomsResult
        }

        if (!availableRoomsResult.value.find((r) => r.id === input.roomId)) {
          return left(new ConflictError('Room is not available for the selected dates'))
        }

        roomId = input.roomId
      } else {
        const availableRoomsResult = await deps.roomRepository.findAvailableRooms(
          input.serviceId,
          checkInDate,
          checkOutDate
        )
        if (isLeft(availableRoomsResult)) {
          return availableRoomsResult
        }

        if (availableRoomsResult.value.length === 0) {
          return left(new ConflictError('No rooms available for the selected dates'))
        }
        roomId = availableRoomsResult.value[0].id
      }
    }

    if (!isHotelBooking && availability.capacity < input.quantity) {
      return left(new ConflictError('No available capacity for the requested quantity'))
    }

    // Calculate total price
    // Use dynamic price from availability if available, otherwise use service basePrice
    const unitPrice = availability.price ? Number(availability.price) : Number(service.basePrice)
    
    let totalPrice: number
    if (isHotelBooking && numberOfNights) {
      // Price per night * number of nights
      totalPrice = unitPrice * numberOfNights
    } else {
      // Standard calculation
      totalPrice = unitPrice * input.quantity
    }

    const extrasData: BookingExtraItemData[] = []
    if (input.extras && input.extras.length > 0) {
      for (const extra of input.extras) {
        const extraItemResult = await deps.extraItemRepository.findById(extra.extraItemId)
        if (isLeft(extraItemResult)) {
          return extraItemResult
        }
        const extraItem = extraItemResult.value
        if (!extraItem || !extraItem.active) {
          return left(new NotFoundError(`ExtraItem ${extra.extraItemId}`))
        }

        if (extraItem.serviceId !== input.serviceId) {
          return left(new ConflictError(`Extra item ${extra.extraItemId} does not belong to the service`))
        }

        if (extra.quantity > extraItem.maxQuantity) {
          return left(new ConflictError(
            `Extra item ${extraItem.name} quantity exceeds maximum of ${extraItem.maxQuantity}`
          ))
        }

        const priceAtBooking = Number(extraItem.price)
        totalPrice += priceAtBooking * extra.quantity

        extrasData.push({
          extraItemId: extra.extraItemId,
          quantity: extra.quantity,
          priceAtBooking,
        })
      }
    }

    const bookingResult = await deps.unitOfWork.execute(async (ctx) => {
      const capacityResult = await ctx.availabilityRepository.decrementCapacity(input.availabilityId, input.quantity)
      if (isLeft(capacityResult)) {
        return capacityResult
      }

      if (isHotelBooking && roomId) {
        const roomStatusResult = await ctx.roomRepository.updateStatus(roomId, 'OCCUPIED')
        if (isLeft(roomStatusResult)) {
          return roomStatusResult
        }
      }

      return ctx.bookingRepository.create(
        {
          userId,
          establishmentId: service.establishmentId,
          serviceId: input.serviceId,
          availabilityId: input.availabilityId,
          quantity: input.quantity,
          totalPrice,
          status: 'CONFIRMED',
          checkInDate,
          checkOutDate,
          roomId,
          numberOfNights,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          guestDocument: input.guestDocument,
          notes: input.notes,
          numberOfGuests: input.numberOfGuests,
        },
        extrasData
      )
    })

    return bookingResult
  },

  async findById(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (isLeft(bookingResult)) {
      return bookingResult
    }
    const bookingEither = requireEntity(bookingResult.value, 'Booking')
    if (isLeft(bookingEither)) {
      return bookingEither
    }
    const booking = bookingEither.value

    if (booking.userId !== userId) {
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

  async cancel(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const ownershipResult = await deps.bookingRepository.getBookingOwnership(id)
    if (isLeft(ownershipResult)) {
      return ownershipResult
    }
    const ownershipEither = requireEntity(ownershipResult.value, 'Booking')
    if (isLeft(ownershipEither)) {
      return ownershipEither
    }
    const ownership = ownershipEither.value

    if (ownership.userId !== userId) {
      const roleResult = await deps.establishmentRepository.getUserRole(userId, ownership.establishmentId)
      if (isLeft(roleResult) || !roleResult.value) {
        return left(new ForbiddenError('You do not have permission to cancel this booking'))
      }
    }

    if (ownership.status === 'CANCELLED') {
      return left(new ConflictError('Booking is already cancelled'))
    }

    const transactionResult = await deps.unitOfWork.execute(async (ctx) => {
      const capacityResult = await ctx.availabilityRepository.incrementCapacity(
        ownership.availabilityId,
        ownership.quantity
      )
      if (isLeft(capacityResult)) {
        return capacityResult
      }

      if (ownership.serviceType === 'HOTEL' && ownership.roomId) {
        const roomStatusResult = await ctx.roomRepository.updateStatus(ownership.roomId, 'AVAILABLE')
        if (isLeft(roomStatusResult)) {
          return roomStatusResult
        }
      }

      return ctx.bookingRepository.updateStatus(id, 'CANCELLED')
    })

    if (isLeft(transactionResult)) {
      return transactionResult
    }

    return deps.bookingRepository.findById(id).then((result) => {
      if (isLeft(result) || !result.value) {
        return left(new NotFoundError('Booking'))
      }
      return right(result.value)
    })
  },

  async confirm(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const ownershipResult = await deps.bookingRepository.getBookingOwnership(id)
    if (isLeft(ownershipResult)) {
      return ownershipResult
    }
    const ownershipEither = requireEntity(ownershipResult.value, 'Booking')
    if (isLeft(ownershipEither)) {
      return ownershipEither
    }
    const ownership = ownershipEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, ownership.establishmentId)
    if (isLeft(roleResult) || !roleResult.value) {
      return left(new ForbiddenError('You do not have permission to confirm this booking'))
    }

    if (ownership.status === 'CONFIRMED') {
      return left(new ConflictError('Booking is already confirmed'))
    }

    if (ownership.status === 'CANCELLED') {
      return left(new ConflictError('Cannot confirm a cancelled booking'))
    }

    const updateResult = await deps.bookingRepository.updateStatus(id, 'CONFIRMED')
    if (isLeft(updateResult)) {
      return updateResult
    }

    return deps.bookingRepository.findById(id).then((result) => {
      if (isLeft(result) || !result.value) {
        return left(new NotFoundError('Booking'))
      }
      return right(result.value)
    })
  },

  async checkIn(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (isLeft(bookingResult)) {
      return bookingResult
    }
    const bookingEither = requireEntity(bookingResult.value, 'Booking')
    if (isLeft(bookingEither)) {
      return bookingEither
    }
    const booking = bookingEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (isLeft(roleResult) || !roleResult.value) {
      return left(new ForbiddenError('You do not have permission to check in this booking'))
    }

    const serviceResult = await deps.serviceRepository.findById(booking.serviceId)
    if (isLeft(serviceResult) || !serviceResult.value) {
      return left(new NotFoundError('Service'))
    }
    if (serviceResult.value.type !== 'HOTEL') {
      return left(new ConflictError('Check-in is only available for hotel bookings'))
    }

    if (booking.status === 'CHECKED_IN') {
      return left(new ConflictError('Booking is already checked in'))
    }

    if (booking.status === 'CHECKED_OUT') {
      return left(new ConflictError('Cannot check in a booking that has already been checked out'))
    }

    if (booking.status === 'CANCELLED') {
      return left(new ConflictError('Cannot check in a cancelled booking'))
    }

    if (booking.status === 'NO_SHOW') {
      return left(new ConflictError('Cannot check in a no-show booking'))
    }

    const updateResult = await deps.bookingRepository.updateStatus(id, 'CHECKED_IN')
    if (isLeft(updateResult)) {
      return updateResult
    }

    return deps.bookingRepository.findById(id).then((result) => {
      if (isLeft(result) || !result.value) {
        return left(new NotFoundError('Booking'))
      }
      return right(result.value)
    })
  },

  async checkOut(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (isLeft(bookingResult)) {
      return bookingResult
    }
    const bookingEither = requireEntity(bookingResult.value, 'Booking')
    if (isLeft(bookingEither)) {
      return bookingEither
    }
    const booking = bookingEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (isLeft(roleResult) || !roleResult.value) {
      return left(new ForbiddenError('You do not have permission to check out this booking'))
    }

    const serviceResult = await deps.serviceRepository.findById(booking.serviceId)
    if (isLeft(serviceResult) || !serviceResult.value) {
      return left(new NotFoundError('Service'))
    }
    if (serviceResult.value.type !== 'HOTEL') {
      return left(new ConflictError('Check-out is only available for hotel bookings'))
    }

    if (booking.status === 'CHECKED_OUT') {
      return left(new ConflictError('Booking is already checked out'))
    }

    if (booking.status === 'CANCELLED') {
      return left(new ConflictError('Cannot check out a cancelled booking'))
    }

    if (booking.status === 'NO_SHOW') {
      return left(new ConflictError('Cannot check out a no-show booking'))
    }

    const transactionResult = await deps.unitOfWork.execute(async (ctx) => {
      const updateResult = await ctx.bookingRepository.updateStatus(id, 'CHECKED_OUT')
      if (isLeft(updateResult)) {
        return updateResult
      }

      if (booking.roomId) {
        const roomStatusResult = await ctx.roomRepository.updateStatus(booking.roomId, 'AVAILABLE')
        if (isLeft(roomStatusResult)) {
          return roomStatusResult
        }
      }

      return right(undefined)
    })

    if (isLeft(transactionResult)) {
      return transactionResult
    }

    return deps.bookingRepository.findById(id).then((result) => {
      if (isLeft(result) || !result.value) {
        return left(new NotFoundError('Booking'))
      }
      return right(result.value)
    })
  },

  async markNoShow(id: string, userId: string): Promise<Either<DomainError, BookingWithDetails>> {
    const bookingResult = await deps.bookingRepository.findById(id)
    if (isLeft(bookingResult)) {
      return bookingResult
    }
    const bookingEither = requireEntity(bookingResult.value, 'Booking')
    if (isLeft(bookingEither)) {
      return bookingEither
    }
    const booking = bookingEither.value

    const roleResult = await deps.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (isLeft(roleResult) || !roleResult.value) {
      return left(new ForbiddenError('You do not have permission to mark this booking as no-show'))
    }

    const serviceResult = await deps.serviceRepository.findById(booking.serviceId)
    if (isLeft(serviceResult) || !serviceResult.value) {
      return left(new NotFoundError('Service'))
    }
    if (serviceResult.value.type !== 'HOTEL') {
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
      if (isLeft(updateResult)) {
        return updateResult
      }

      if (booking.roomId) {
        const roomStatusResult = await ctx.roomRepository.updateStatus(booking.roomId, 'AVAILABLE')
        if (isLeft(roomStatusResult)) {
          return roomStatusResult
        }
      }

      return right(undefined)
    })

    if (isLeft(transactionResult)) {
      return transactionResult
    }

    return deps.bookingRepository.findById(id).then((result) => {
      if (isLeft(result) || !result.value) {
        return left(new NotFoundError('Booking'))
      }
      return right(result.value)
    })
  },
})

