import type {
  Booking,
  BookingExtraItemData,
} from '../domain/index.js'
import type { DomainError, Either } from '#shared/domain/index.js'
import { ConflictError } from '#shared/domain/index.js'
import { left, isLeft } from '#shared/domain/index.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'
import { validateHotelDates } from '../domain/index.js'
import { isServiceHotel, canServiceBeBooked } from '#features/service/domain/index.js'
import { availabilityBelongsToService, availabilityHasCapacity } from '#features/availability/domain/index.js'
import { validateExtraItemForBooking, extraItemCanAccommodateQuantity } from '#features/extra-item/domain/index.js'
import { canRoomBeBooked } from '#features/room/domain/index.js'
import type {
  UnitOfWorkPort,
  ServiceRepositoryPort,
  AvailabilityRepositoryPort,
  ExtraItemRepositoryPort,
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
  unitOfWork: UnitOfWorkPort
  bookingRepository: BookingRepositoryPort
  serviceRepository: ServiceRepositoryPort
  availabilityRepository: AvailabilityRepositoryPort
  extraItemRepository: ExtraItemRepositoryPort
  roomRepository: RoomRepositoryPort
}

export const createBookingCreationService = (deps: BookingCreationServiceDependencies) => ({
  async create(input: CreateBookingInput, userId: string): Promise<Either<DomainError, Booking>> {
    const serviceResult = await deps.serviceRepository.findById(input.serviceId)
    if (isLeft(serviceResult)) return serviceResult;
        
    const serviceEither = requireEntity(serviceResult.value, 'Service')
    if (isLeft(serviceEither)) return serviceEither;
    const service = serviceEither.value
    
    const canBeBookedResult = canServiceBeBooked(service)
    if (isLeft(canBeBookedResult)) return canBeBookedResult;

    const availabilityResult = await deps.availabilityRepository.findById(input.availabilityId)
    if (isLeft(availabilityResult)) return availabilityResult;
    
    const availabilityEither = requireEntity(availabilityResult.value, 'Availability')
    if (isLeft(availabilityEither)) return availabilityEither;
    
    const availability = availabilityEither.value
    if (!availabilityBelongsToService(availability, input.serviceId)) {
      return left(new ConflictError('Availability does not belong to the specified service'))
    }

    const isHotelBooking = isServiceHotel(service)
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

      const datesValidationResult = validateHotelDates(checkInDate, checkOutDate)
      if (isLeft(datesValidationResult)) return datesValidationResult;
      numberOfNights = datesValidationResult.value.numberOfNights

      if (input.roomId) {
        const roomResult = await deps.roomRepository.findById(input.roomId)
        if (isLeft(roomResult)) return roomResult;
       
        const roomEither = requireEntity(roomResult.value, 'Room')
        if (isLeft(roomEither)) return roomEither;
       
        const room = roomEither.value
        const canBookRoomResult = canRoomBeBooked(room, input.serviceId)
        if (isLeft(canBookRoomResult)) return canBookRoomResult;

        const availableRoomsResult = await deps.roomRepository.findAvailableRooms(
          input.serviceId,
          checkInDate,
          checkOutDate
        )
        if (isLeft(availableRoomsResult)) return availableRoomsResult;

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
        if (isLeft(availableRoomsResult)) return availableRoomsResult;

        if (availableRoomsResult.value.length === 0) {
          return left(new ConflictError('No rooms available for the selected dates'))
        }
        roomId = availableRoomsResult.value[0].id
      }
    }

    if (!isHotelBooking) {
      const capacityResult = availabilityHasCapacity(availability, input.quantity)
      if (isLeft(capacityResult)) return capacityResult;
    }

    const unitPrice = availability.price ? Number(availability.price) : Number(service.basePrice)
    
    let totalPrice: number
    if (isHotelBooking && numberOfNights) {
      totalPrice = unitPrice * numberOfNights
    } else {
      totalPrice = unitPrice * input.quantity
    }

    const extrasData: BookingExtraItemData[] = []
    if (input.extras && input.extras.length > 0) {
      for (const extra of input.extras) {
        const extraItemResult = await deps.extraItemRepository.findById(extra.extraItemId)
        if (isLeft(extraItemResult)) return extraItemResult;
        
        const validatedExtraItemResult = validateExtraItemForBooking(extraItemResult.value, input.serviceId)
        if (isLeft(validatedExtraItemResult)) return validatedExtraItemResult;
        const extraItem = validatedExtraItemResult.value

        const quantityResult = extraItemCanAccommodateQuantity(extraItem, extra.quantity)
        if (isLeft(quantityResult)) return quantityResult;

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
      if (isLeft(capacityResult)) return capacityResult;

      if (isHotelBooking && roomId) {
        const roomStatusResult = await ctx.roomRepository.updateStatus(roomId, 'OCCUPIED')
        if (isLeft(roomStatusResult)) return roomStatusResult;
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
})

