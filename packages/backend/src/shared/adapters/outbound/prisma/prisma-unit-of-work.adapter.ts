import { PrismaClient, Prisma, Booking as PrismaBooking, Room as PrismaRoom, Availability as PrismaAvailability } from '@prisma/client'
import type {
  UnitOfWorkPort,
  UnitOfWorkContext,
  TransactionalBookingRepository,
  TransactionalAvailabilityRepository,
  TransactionalRoomRepository,
} from '#shared/application/ports/index.js'
import type * as BookingDomain from '#features/booking/domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as AvailabilityDomain from '#features/availability/domain/index.js'
import type * as RoomDomain from '#features/room/domain/index.js'

function toBooking(prismaBooking: PrismaBooking): BookingDomain.Booking {
  return {
    ...prismaBooking,
    totalPrice: prismaBooking.totalPrice.toString(),
    status: prismaBooking.status as Domain.BookingStatus,
    checkInDate: prismaBooking.checkInDate,
    checkOutDate: prismaBooking.checkOutDate,
    roomId: prismaBooking.roomId,
    numberOfNights: prismaBooking.numberOfNights,
    numberOfGuests: prismaBooking.numberOfGuests,
    guestName: prismaBooking.guestName,
    guestEmail: prismaBooking.guestEmail,
    guestPhone: prismaBooking.guestPhone,
    guestDocument: prismaBooking.guestDocument,
    notes: prismaBooking.notes,
    confirmedAt: prismaBooking.confirmedAt,
    cancelledAt: prismaBooking.cancelledAt,
    cancellationReason: prismaBooking.cancellationReason,
    checkedInAt: prismaBooking.checkedInAt,
    checkedOutAt: prismaBooking.checkedOutAt,
  }
}

/**
 * Creates transactional booking repository bound to a transaction client
 */
function createTransactionalBookingRepository(
  tx: Prisma.TransactionClient
): TransactionalBookingRepository {
  return {
    async create(
      data: BookingDomain.CreateBookingData,
      extras: BookingDomain.BookingExtraItemData[]
    ): Promise<Domain.Either<Domain.DomainError, BookingDomain.Booking>> {
      return DomainValues.fromPromise(
        tx.booking.create({
          data: {
            userId: data.userId,
            establishmentId: data.establishmentId,
            serviceId: data.serviceId,
            availabilityId: data.availabilityId,
            quantity: data.quantity,
            totalPrice: new Prisma.Decimal(data.totalPrice),
            status: data.status ?? 'CONFIRMED',
            checkInDate: data.checkInDate ?? null,
            checkOutDate: data.checkOutDate ?? null,
            roomId: data.roomId ?? null,
            numberOfNights: data.numberOfNights ?? null,
            numberOfGuests: data.numberOfGuests ?? null,
            guestName: data.guestName ?? null,
            guestEmail: data.guestEmail ?? null,
            guestPhone: data.guestPhone ?? null,
            guestDocument: data.guestDocument ?? null,
            notes: data.notes ?? null,
            confirmedAt: data.status === 'CONFIRMED' ? new Date() : null,
            extraItems: {
              create: extras.map((e) => ({
                extraItemId: e.extraItemId,
                quantity: e.quantity,
                priceAtBooking: new Prisma.Decimal(e.priceAtBooking),
              })),
            },
          },
        }),
        () => new DomainValues.ConflictError('Failed to create booking')
      ).then((either) => either.map(toBooking))
    },

    async updateStatus(id: string, status: Domain.BookingStatus, cancellationReason?: string | null): Promise<Domain.Either<Domain.DomainError, BookingDomain.Booking>> {
      const updateData: any = { status }
      
      if (status === 'CONFIRMED') {
        updateData.confirmedAt = new Date()
      }
      
      if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date()
        if (cancellationReason !== undefined) {
          updateData.cancellationReason = cancellationReason
        }
      }
      
      if (status === 'CHECKED_IN') {
        updateData.checkedInAt = new Date()
      }
      
      if (status === 'CHECKED_OUT') {
        updateData.checkedOutAt = new Date()
      }
      
      return DomainValues.fromPromise(
        tx.booking.update({
          where: { id },
          data: updateData,
        }),
        () => new DomainValues.NotFoundError('Booking')
      ).then((either) => either.map(toBooking))
    },
  }
}

/**
 * Creates transactional availability repository bound to a transaction client
 */
function createTransactionalAvailabilityRepository(
  tx: Prisma.TransactionClient
): TransactionalAvailabilityRepository {
  function toAvailability(prismaAvailability: PrismaAvailability): AvailabilityDomain.Availability {
    return {
      ...prismaAvailability,
      price: prismaAvailability.price ? prismaAvailability.price.toString() : null,
    }
  }
  
  return {
    async decrementCapacity(id: string, quantity: number): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>> {
      return DomainValues.fromPromise(
        tx.availability.update({
          where: { id },
          data: { capacity: { decrement: quantity } },
        }),
        () => new DomainValues.NotFoundError('Availability')
      ).then((either) => either.map(toAvailability))
    },

    async incrementCapacity(id: string, quantity: number): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>> {
      return DomainValues.fromPromise(
        tx.availability.update({
          where: { id },
          data: { capacity: { increment: quantity } },
        }),
        () => new DomainValues.NotFoundError('Availability')
      ).then((either) => either.map(toAvailability))
    },
  }
}

function toRoom(prismaRoom: PrismaRoom): RoomDomain.Room {
  return {
    ...prismaRoom,
    status: prismaRoom.status as Domain.RoomStatus,
    roomType: prismaRoom.roomType as Domain.RoomType | null,
    amenities: prismaRoom.amenities ? (prismaRoom.amenities as string[]) : null,
  }
}

/**
 * Creates transactional room repository bound to a transaction client
 */
function createTransactionalRoomRepository(
  tx: Prisma.TransactionClient
): TransactionalRoomRepository {
  return {
    async updateStatus(id: string, status: Domain.RoomStatus): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>> {
      return DomainValues.fromPromise(
        tx.room.update({
          where: { id },
          data: { status },
        }),
        () => new DomainValues.NotFoundError('Room')
      ).then((either) => either.map(toRoom))
    },
  }
}

/**
 * Prisma implementation of the UnitOfWorkPort.
 * Wraps Prisma interactive transactions.
 */
export const createUnitOfWork = (prisma: PrismaClient): UnitOfWorkPort => ({
  async execute<T>(work: (context: UnitOfWorkContext) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => {
      const context: UnitOfWorkContext = {
        bookingRepository: createTransactionalBookingRepository(tx),
        availabilityRepository: createTransactionalAvailabilityRepository(tx),
        roomRepository: createTransactionalRoomRepository(tx),
      }
      return work(context)
    })
  },
})
