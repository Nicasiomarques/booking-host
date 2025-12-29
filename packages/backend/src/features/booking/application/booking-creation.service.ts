import type * as BookingDomain from '../domain/index.js'
import * as BookingDomainValues from '../domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import * as Validation from '#shared/application/utils/validation.helper.js'
import * as ServiceDomain from '#features/service/domain/index.js'
import * as AvailabilityDomain from '#features/availability/domain/index.js'
import * as ExtraItemDomain from '#features/extra-item/domain/index.js'
import * as RoomDomain from '#features/room/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'

export interface CreateBookingInput {
  serviceId: string
  availabilityId: string
  quantity: number
  extras?: Array<{
    extraItemId: string
    quantity: number
  }>
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

interface BookingCreationServiceDependencies {
  unitOfWork: Ports.UnitOfWorkPort
  bookingRepository: Ports.BookingRepositoryPort
  serviceRepository: Ports.ServiceRepositoryPort
  availabilityRepository: Ports.AvailabilityRepositoryPort
  extraItemRepository: Ports.ExtraItemRepositoryPort
  roomRepository: Ports.RoomRepositoryPort
}

export const createBookingCreationService = (deps: BookingCreationServiceDependencies) => ({
  async create(input: CreateBookingInput, userId: string): Promise<Domain.Either<Domain.DomainError, BookingDomain.Booking>> {
    const serviceResult = await deps.serviceRepository.findById(input.serviceId)
    if (Validation.isLeft(serviceResult)) return serviceResult;
        
    const serviceEither = Validation.requireEntity(serviceResult.value, 'Service')
    if (Validation.isLeft(serviceEither)) return serviceEither;
    const service = serviceEither.value
    
    const canBeBookedResult = ServiceDomain.canServiceBeBooked(service)
    if (Validation.isLeft(canBeBookedResult)) return canBeBookedResult;

    const availabilityResult = await deps.availabilityRepository.findById(input.availabilityId)
    if (Validation.isLeft(availabilityResult)) return availabilityResult;
    
    const availabilityEither = Validation.requireEntity(availabilityResult.value, 'Availability')
    if (Validation.isLeft(availabilityEither)) return availabilityEither;
    
    const availability = availabilityEither.value
    if (!AvailabilityDomain.availabilityBelongsToService(availability, input.serviceId)) {
      return DomainValues.left(new DomainValues.ConflictError('Availability does not belong to the specified service'))
    }

    const isHotelBooking = ServiceDomain.isServiceHotel(service)
    let checkInDate: Date | undefined
    let checkOutDate: Date | undefined
    let numberOfNights: number | undefined
    let roomId: string | undefined

    if (isHotelBooking) {
      if (!input.checkInDate || !input.checkOutDate) {
        return DomainValues.left(new DomainValues.ConflictError('checkInDate and checkOutDate are required for hotel bookings'))
      }

      checkInDate = new Date(input.checkInDate + 'T00:00:00.000Z')
      checkOutDate = new Date(input.checkOutDate + 'T00:00:00.000Z')

      const datesValidationResult = BookingDomainValues.validateHotelDates(checkInDate, checkOutDate)
      if (Validation.isLeft(datesValidationResult)) return datesValidationResult;
      numberOfNights = datesValidationResult.value.numberOfNights

      if (input.roomId) {
        const roomResult = await deps.roomRepository.findById(input.roomId)
        if (Validation.isLeft(roomResult)) return roomResult;
       
        const roomEither = Validation.requireEntity(roomResult.value, 'Room')
        if (Validation.isLeft(roomEither)) return roomEither;
       
        const room = roomEither.value
        const canBookRoomResult = RoomDomain.canRoomBeBooked(room, input.serviceId)
        if (Validation.isLeft(canBookRoomResult)) return canBookRoomResult;

        const availableRoomsResult = await deps.roomRepository.findAvailableRooms(
          input.serviceId,
          checkInDate,
          checkOutDate
        )
        if (Validation.isLeft(availableRoomsResult)) return availableRoomsResult;

        const selectedRoom = availableRoomsResult.value.find((r) => r.id === input.roomId)
        if (!selectedRoom) {
          return DomainValues.left(new DomainValues.ConflictError('Room is not available for the selected dates'))
        }

        roomId = input.roomId
      } else {
        const availableRoomsResult = await deps.roomRepository.findAvailableRooms(
          input.serviceId,
          checkInDate,
          checkOutDate
        )
        if (Validation.isLeft(availableRoomsResult)) return availableRoomsResult;

        if (availableRoomsResult.value.length === 0) {
          return DomainValues.left(new DomainValues.ConflictError('No rooms available for the selected dates'))
        }
        roomId = availableRoomsResult.value[0].id
      }
    }

    if (!isHotelBooking) {
      const capacityResult = AvailabilityDomain.availabilityHasCapacity(availability, input.quantity)
      if (Validation.isLeft(capacityResult)) return capacityResult;
    }

    const unitPrice = availability.price ? Number(availability.price) : Number(service.basePrice)
    
    let totalPrice: number
    if (isHotelBooking && numberOfNights) {
      totalPrice = unitPrice * numberOfNights
    } else {
      totalPrice = unitPrice * input.quantity
    }

    const extrasData: BookingDomain.BookingExtraItemData[] = []
    if (input.extras && input.extras.length > 0) {
      for (const extra of input.extras) {
        const extraItemResult = await deps.extraItemRepository.findById(extra.extraItemId)
        if (Validation.isLeft(extraItemResult)) return extraItemResult;
        
        const validatedExtraItemResult = ExtraItemDomain.validateExtraItemForBooking(extraItemResult.value, input.serviceId)
        if (Validation.isLeft(validatedExtraItemResult)) return validatedExtraItemResult;
        const extraItem = validatedExtraItemResult.value

        const quantityResult = ExtraItemDomain.extraItemCanAccommodateQuantity(extraItem, extra.quantity)
        if (Validation.isLeft(quantityResult)) return quantityResult;

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
      // Capacity validation happens inside transaction in decrementCapacity method
      const capacityResult = await ctx.availabilityRepository.decrementCapacity(input.availabilityId, input.quantity)
      if (Validation.isLeft(capacityResult)) {
        return capacityResult;
      }

      // Verify room availability inside transaction for ALL hotel bookings to prevent race conditions
      // This check must happen inside the transaction to ensure atomicity and prevent double-booking
      if (isHotelBooking && roomId && checkInDate && checkOutDate) {
        const roomAvailabilityResult = await ctx.roomRepository.isRoomAvailable(roomId, checkInDate, checkOutDate)
        if (Validation.isLeft(roomAvailabilityResult)) {
          return roomAvailabilityResult;
        }
        if (!roomAvailabilityResult.value) {
          return DomainValues.left(new DomainValues.ConflictError('Room is not available for the selected dates'))
        }
        
        const roomStatusResult = await ctx.roomRepository.updateStatus(roomId, 'OCCUPIED')
        if (Validation.isLeft(roomStatusResult)) {
          return roomStatusResult;
        }
      }

      const createResult = ctx.bookingRepository.create(
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
      return createResult
    })

    return bookingResult
  },
})

