import { PrismaClient } from '@prisma/client'
import type {
  Booking,
  BookingWithDetails,
  BookingExtraItemData,
  ListBookingsOptions,
  PaginatedResult,
} from '#domain/index.js'
import { NotFoundError, ForbiddenError, ConflictError } from '#domain/index.js'
import * as Res from '#adapters/outbound/prisma/index.js'

export interface CreateBookingInput {
  serviceId: string
  availabilityId: string
  quantity: number
  extras?: Array<{
    extraItemId: string
    quantity: number
  }>
}

export class BookingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly bookingRepository: Res.BookingRepository,
    private readonly serviceRepository: Res.ServiceRepository,
    private readonly availabilityRepository: Res.AvailabilityRepository,
    private readonly extraItemRepository: Res.ExtraItemRepository,
    private readonly establishmentRepository: Res.EstablishmentRepository
  ) {}

  async create(input: CreateBookingInput, userId: string): Promise<Booking> {
    // Validate service exists and is active
    const service = await this.serviceRepository.findById(input.serviceId)
    if (!service || !service.active) throw new NotFoundError('Service')

    // Validate availability exists
    const availability = await this.availabilityRepository.findById(input.availabilityId)
    if (!availability) throw new NotFoundError('Availability')

    // Ensure availability belongs to service
    if (availability.serviceId !== input.serviceId) throw new ConflictError('Availability does not belong to the specified service')

    // Check capacity
    if (availability.capacity < input.quantity) throw new ConflictError('No available capacity for the requested quantity')

    // Calculate total price
    let totalPrice = Number(service.basePrice) * input.quantity

    // Process extras
    const extrasData: BookingExtraItemData[] = []
    if (input.extras && input.extras.length > 0) {
      for (const extra of input.extras) {
        const extraItem = await this.extraItemRepository.findById(extra.extraItemId)
        if (!extraItem || !extraItem.active) throw new NotFoundError(`ExtraItem ${extra.extraItemId}`)

        // Ensure extra belongs to the service
        if (extraItem.serviceId !== input.serviceId) throw new ConflictError(`Extra item ${extra.extraItemId} does not belong to the service`)

        // Validate quantity doesn't exceed max
        if (extra.quantity > extraItem.maxQuantity) throw new ConflictError(`Extra item ${extraItem.name} quantity exceeds maximum of ${extraItem.maxQuantity}`)

        const priceAtBooking = Number(extraItem.price)
        totalPrice += priceAtBooking * extra.quantity

        extrasData.push({
          extraItemId: extra.extraItemId,
          quantity: extra.quantity,
          priceAtBooking,
        })
      }
    }

    // Execute transaction: create booking and decrement capacity
    return this.prisma.$transaction(async (tx) => {
      // Decrement capacity
      await tx.availability.update({
        where: { id: input.availabilityId },
        data: {
          capacity: { decrement: input.quantity },
        },
      })

      // Create booking
      return this.bookingRepository.create(
        {
          userId,
          establishmentId: service.establishmentId,
          serviceId: input.serviceId,
          availabilityId: input.availabilityId,
          quantity: input.quantity,
          totalPrice,
          status: 'CONFIRMED',
        },
        extrasData,
        tx
      )
    })
  }

  async findById(id: string, userId: string): Promise<BookingWithDetails> {
    const booking = await this.bookingRepository.findById(id)

    if (!booking) throw new NotFoundError('Booking')

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
    if (!role) throw new ForbiddenError('You do not have access to this establishment bookings')

    return this.bookingRepository.findByEstablishment(establishmentId, options)
  }

  async cancel(id: string, userId: string): Promise<BookingWithDetails> {
    const ownership = await this.bookingRepository.getBookingOwnership(id)

    if (!ownership) throw new NotFoundError('Booking')

    // Check if user is the owner or has role in establishment
    if (ownership.userId !== userId) {
      const role = await this.establishmentRepository.getUserRole(userId, ownership.establishmentId)
      if (!role) throw new ForbiddenError('You do not have permission to cancel this booking')
    }

    // Check if booking can be cancelled
    if (ownership.status === 'CANCELLED') throw new ConflictError('Booking is already cancelled')

    // Execute transaction: cancel booking and restore capacity
    await this.prisma.$transaction(async (tx) => {
      // Restore capacity
      await tx.availability.update({
        where: { id: ownership.availabilityId },
        data: {
          capacity: { increment: ownership.quantity },
        },
      })

      // Update booking status
      await this.bookingRepository.updateStatus(id, 'CANCELLED', tx)
    })

    return this.bookingRepository.findById(id) as Promise<BookingWithDetails>
  }
}
