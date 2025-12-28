import type {
  Booking,
  BookingWithDetails,
  BookingExtraItemData,
  ListBookingsOptions,
} from '../domain/index.js'
import type { PaginatedResult } from '#shared/domain/index.js'
import { NotFoundError, ForbiddenError, ConflictError } from '#shared/domain/index.js'
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

export class BookingService {
  constructor(
    private readonly unitOfWork: UnitOfWorkPort,
    private readonly bookingRepository: BookingRepositoryPort,
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly availabilityRepository: AvailabilityRepositoryPort,
    private readonly extraItemRepository: ExtraItemRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly roomRepository: RoomRepositoryPort
  ) {}

  async create(input: CreateBookingInput, userId: string): Promise<Booking> {
    // Validate service exists and is active
    const service = requireEntity(
      await this.serviceRepository.findById(input.serviceId),
      'Service'
    )
    if (!service.active) throw new ConflictError('Service is not active')

    // Validate availability exists
    const availability = requireEntity(
      await this.availabilityRepository.findById(input.availabilityId),
      'Availability'
    )

    // Ensure availability belongs to service
    if (availability.serviceId !== input.serviceId) {
      throw new ConflictError('Availability does not belong to the specified service')
    }

    // Hotel-specific validations
    const isHotelBooking = service.type === 'HOTEL'
    let checkInDate: Date | undefined
    let checkOutDate: Date | undefined
    let numberOfNights: number | undefined
    let roomId: string | undefined

    if (isHotelBooking) {
      if (!input.checkInDate || !input.checkOutDate) {
        throw new ConflictError('checkInDate and checkOutDate are required for hotel bookings')
      }

      // Normalize dates to start of day (UTC) to avoid timezone issues
      checkInDate = new Date(input.checkInDate + 'T00:00:00.000Z')
      checkOutDate = new Date(input.checkOutDate + 'T00:00:00.000Z')

      // Validate dates are not in the past (check first before other validations)
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      if (checkInDate < today) {
        throw new ConflictError('checkInDate cannot be in the past')
      }

      // Validate dates
      if (checkInDate >= checkOutDate) {
        throw new ConflictError('checkOutDate must be after checkInDate')
      }

      // Calculate number of nights
      const diffTime = checkOutDate.getTime() - checkInDate.getTime()
      numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (numberOfNights < 1) {
        throw new ConflictError('Minimum stay is 1 night')
      }

      // Validate room if provided
      if (input.roomId) {
        const room = requireEntity(
          await this.roomRepository.findById(input.roomId),
          'Room'
        )
        if (room.serviceId !== input.serviceId) {
          throw new ConflictError('Room does not belong to the specified service')
        }

        // Check room status - only AVAILABLE rooms can be booked
        if (room.status !== 'AVAILABLE') {
          throw new ConflictError(`Room is ${room.status} and cannot be booked`)
        }

        // Check if room is available for the period (no conflicting bookings)
        const availableRooms = await this.roomRepository.findAvailableRooms(
          input.serviceId,
          checkInDate,
          checkOutDate
        )

        if (!availableRooms.find((r) => r.id === input.roomId)) {
          throw new ConflictError('Room is not available for the selected dates')
        }

        roomId = input.roomId
      } else {
        // Find available room automatically
        const availableRooms = await this.roomRepository.findAvailableRooms(
          input.serviceId,
          checkInDate,
          checkOutDate
        )

        if (availableRooms.length === 0) {
          throw new ConflictError('No rooms available for the selected dates')
        }
        // Use first available room
        roomId = availableRooms[0].id
      }
    }

    // Check capacity (for non-hotel bookings)
    if (!isHotelBooking && availability.capacity < input.quantity) {
      throw new ConflictError('No available capacity for the requested quantity')
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

    // Process extras
    const extrasData: BookingExtraItemData[] = []
    if (input.extras && input.extras.length > 0) {
      for (const extra of input.extras) {
        const extraItem = await this.extraItemRepository.findById(extra.extraItemId)
        if (!extraItem || !extraItem.active) {
          throw new NotFoundError(`ExtraItem ${extra.extraItemId}`)
        }

        // Ensure extra belongs to the service
        if (extraItem.serviceId !== input.serviceId) {
          throw new ConflictError(`Extra item ${extra.extraItemId} does not belong to the service`)
        }

        // Validate quantity doesn't exceed max
        if (extra.quantity > extraItem.maxQuantity) {
          throw new ConflictError(
            `Extra item ${extraItem.name} quantity exceeds maximum of ${extraItem.maxQuantity}`
          )
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

    // Execute transaction using Unit of Work
    return this.unitOfWork.execute(async (ctx) => {
      // Decrement capacity
      await ctx.availabilityRepository.decrementCapacity(input.availabilityId, input.quantity)

      // For hotel bookings, mark room as OCCUPIED
      if (isHotelBooking && roomId) {
        await ctx.roomRepository.updateStatus(roomId, 'OCCUPIED')
      }

      // Create booking
      return ctx.bookingRepository.create(
        {
          userId,
          establishmentId: service.establishmentId,
          serviceId: input.serviceId,
          availabilityId: input.availabilityId,
          quantity: input.quantity,
          totalPrice,
          status: 'CONFIRMED',
          // Hotel-specific fields
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
  }

  async findById(id: string, userId: string): Promise<BookingWithDetails> {
    const booking = requireEntity(
      await this.bookingRepository.findById(id),
      'Booking'
    )

    // Check if user is the owner or has role in establishment
    if (booking.userId !== userId) {
      const role = await this.establishmentRepository.getUserRole(userId, booking.establishmentId)
      if (!role) throw new ForbiddenError('You do not have access to this booking')
    }

    return booking
  }

  async findByUser(
    userId: string,
    options: ListBookingsOptions = {}
  ): Promise<PaginatedResult<BookingWithDetails>> {
    return this.bookingRepository.findByUser(userId, options)
  }

  async findByEstablishment(
    establishmentId: string,
    userId: string,
    options: ListBookingsOptions = {}
  ): Promise<PaginatedResult<BookingWithDetails>> {
    // Check if user has role in establishment
    const role = await this.establishmentRepository.getUserRole(userId, establishmentId)
    if (!role) {
      throw new ForbiddenError('You do not have access to this establishment bookings')
    }

    return this.bookingRepository.findByEstablishment(establishmentId, options)
  }

  async cancel(id: string, userId: string): Promise<BookingWithDetails> {
    const ownership = requireEntity(
      await this.bookingRepository.getBookingOwnership(id),
      'Booking'
    )

    // Check if user is the owner or has role in establishment
    if (ownership.userId !== userId) {
      const role = await this.establishmentRepository.getUserRole(userId, ownership.establishmentId)
      if (!role) throw new ForbiddenError('You do not have permission to cancel this booking')
    }

    // Check if booking can be cancelled
    if (ownership.status === 'CANCELLED') {
      throw new ConflictError('Booking is already cancelled')
    }

    // Execute transaction using Unit of Work
    await this.unitOfWork.execute(async (ctx) => {
      // Restore capacity
      await ctx.availabilityRepository.incrementCapacity(
        ownership.availabilityId,
        ownership.quantity
      )

      // For hotel bookings, free the room
      if (ownership.serviceType === 'HOTEL' && ownership.roomId) {
        await ctx.roomRepository.updateStatus(ownership.roomId, 'AVAILABLE')
      }

      // Update booking status
      await ctx.bookingRepository.updateStatus(id, 'CANCELLED')
    })

    return this.bookingRepository.findById(id) as Promise<BookingWithDetails>
  }

  async confirm(id: string, userId: string): Promise<BookingWithDetails> {
    const ownership = requireEntity(
      await this.bookingRepository.getBookingOwnership(id),
      'Booking'
    )

    // Check if user has role in establishment (only staff/owner can confirm)
    const role = await this.establishmentRepository.getUserRole(userId, ownership.establishmentId)
    if (!role) {
      throw new ForbiddenError('You do not have permission to confirm this booking')
    }

    // Check if booking can be confirmed
    if (ownership.status === 'CONFIRMED') {
      throw new ConflictError('Booking is already confirmed')
    }

    if (ownership.status === 'CANCELLED') {
      throw new ConflictError('Cannot confirm a cancelled booking')
    }

    // Update booking status
    await this.bookingRepository.updateStatus(id, 'CONFIRMED')

    return this.bookingRepository.findById(id) as Promise<BookingWithDetails>
  }

  async checkIn(id: string, userId: string): Promise<BookingWithDetails> {
    const booking = requireEntity(
      await this.bookingRepository.findById(id),
      'Booking'
    )

    // Check if user has role in establishment (only staff/owner can check in)
    const role = await this.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (!role) {
      throw new ForbiddenError('You do not have permission to check in this booking')
    }

    // Validate booking is for hotel service
    const service = await this.serviceRepository.findById(booking.serviceId)
    if (service?.type !== 'HOTEL') {
      throw new ConflictError('Check-in is only available for hotel bookings')
    }

    // Check if booking can be checked in
    if (booking.status === 'CHECKED_IN') {
      throw new ConflictError('Booking is already checked in')
    }

    if (booking.status === 'CHECKED_OUT') {
      throw new ConflictError('Cannot check in a booking that has already been checked out')
    }

    if (booking.status === 'CANCELLED') {
      throw new ConflictError('Cannot check in a cancelled booking')
    }

    if (booking.status === 'NO_SHOW') {
      throw new ConflictError('Cannot check in a no-show booking')
    }

    // Update booking status to CHECKED_IN
    await this.bookingRepository.updateStatus(id, 'CHECKED_IN')

    return this.bookingRepository.findById(id) as Promise<BookingWithDetails>
  }

  async checkOut(id: string, userId: string): Promise<BookingWithDetails> {
    const booking = requireEntity(
      await this.bookingRepository.findById(id),
      'Booking'
    )

    // Check if user has role in establishment (only staff/owner can check out)
    const role = await this.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (!role) {
      throw new ForbiddenError('You do not have permission to check out this booking')
    }

    // Validate booking is for hotel service
    const service = await this.serviceRepository.findById(booking.serviceId)
    if (service?.type !== 'HOTEL') {
      throw new ConflictError('Check-out is only available for hotel bookings')
    }

    // Check if booking can be checked out
    if (booking.status === 'CHECKED_OUT') {
      throw new ConflictError('Booking is already checked out')
    }

    if (booking.status === 'CANCELLED') {
      throw new ConflictError('Cannot check out a cancelled booking')
    }

    if (booking.status === 'NO_SHOW') {
      throw new ConflictError('Cannot check out a no-show booking')
    }

    // Execute transaction to update booking status and free the room
    await this.unitOfWork.execute(async (ctx) => {
      // Update booking status to CHECKED_OUT
      await ctx.bookingRepository.updateStatus(id, 'CHECKED_OUT')

      // Free the room (set to AVAILABLE)
      if (booking.roomId) {
        await ctx.roomRepository.updateStatus(booking.roomId, 'AVAILABLE')
      }
    })

    return this.bookingRepository.findById(id) as Promise<BookingWithDetails>
  }

  async markNoShow(id: string, userId: string): Promise<BookingWithDetails> {
    const booking = requireEntity(
      await this.bookingRepository.findById(id),
      'Booking'
    )

    // Check if user has role in establishment (only staff/owner can mark no-show)
    const role = await this.establishmentRepository.getUserRole(userId, booking.establishmentId)
    if (!role) {
      throw new ForbiddenError('You do not have permission to mark this booking as no-show')
    }

    // Validate booking is for hotel service
    const service = await this.serviceRepository.findById(booking.serviceId)
    if (service?.type !== 'HOTEL') {
      throw new ConflictError('No-show is only available for hotel bookings')
    }

    // Check if booking can be marked as no-show
    if (booking.status === 'CHECKED_IN') {
      throw new ConflictError('Cannot mark a checked-in booking as no-show')
    }

    if (booking.status === 'CHECKED_OUT') {
      throw new ConflictError('Cannot mark a checked-out booking as no-show')
    }

    if (booking.status === 'NO_SHOW') {
      throw new ConflictError('Booking is already marked as no-show')
    }

    if (booking.status === 'CANCELLED') {
      throw new ConflictError('Cannot mark a cancelled booking as no-show')
    }

    // Execute transaction to update booking status and free the room
    await this.unitOfWork.execute(async (ctx) => {
      // Update booking status to NO_SHOW
      await ctx.bookingRepository.updateStatus(id, 'NO_SHOW')

      // Free the room (set to AVAILABLE)
      if (booking.roomId) {
        await ctx.roomRepository.updateStatus(booking.roomId, 'AVAILABLE')
      }
    })

    return this.bookingRepository.findById(id) as Promise<BookingWithDetails>
  }
}

