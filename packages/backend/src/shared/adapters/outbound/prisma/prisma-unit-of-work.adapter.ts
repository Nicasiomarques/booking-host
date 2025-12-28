import { PrismaClient, Prisma, Booking as PrismaBooking, Room as PrismaRoom, RoomStatus, Availability as PrismaAvailability } from '@prisma/client'
import type {
  UnitOfWorkPort,
  UnitOfWorkContext,
  TransactionalBookingRepository,
  TransactionalAvailabilityRepository,
  TransactionalRoomRepository,
} from '#shared/application/ports/index.js'
import type {
  Booking,
  CreateBookingData,
  BookingExtraItemData,
} from '#features/booking/domain/index.js'
import type { BookingStatus, DomainError, Either } from '#shared/domain/index.js'
import { fromPromise } from '#shared/domain/index.js'
import { ConflictError, NotFoundError } from '#shared/domain/index.js'
import type { Availability } from '#features/availability/domain/index.js'
import type { Room } from '#features/room/domain/index.js'
import type { RoomType } from '#shared/domain/index.js'

function toBooking(prismaBooking: PrismaBooking): Booking {
  return {
    ...prismaBooking,
    totalPrice: prismaBooking.totalPrice.toString(),
    status: prismaBooking.status as BookingStatus,
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
      data: CreateBookingData,
      extras: BookingExtraItemData[]
    ): Promise<Either<DomainError, Booking>> {
      return fromPromise(
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
        () => new ConflictError('Failed to create booking')
      ).then((either) => either.map(toBooking))
    },

    async updateStatus(id: string, status: BookingStatus, cancellationReason?: string | null): Promise<Either<DomainError, Booking>> {
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
      
      return fromPromise(
        tx.booking.update({
          where: { id },
          data: updateData,
        }),
        () => new NotFoundError('Booking')
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
  function toAvailability(prismaAvailability: PrismaAvailability): Availability {
    return {
      ...prismaAvailability,
      price: prismaAvailability.price ? prismaAvailability.price.toString() : null,
    }
  }
  
  return {
    async decrementCapacity(id: string, quantity: number): Promise<Either<DomainError, Availability>> {
      return fromPromise(
        tx.availability.update({
          where: { id },
          data: { capacity: { decrement: quantity } },
        }),
        () => new NotFoundError('Availability')
      ).then((either) => either.map(toAvailability))
    },

    async incrementCapacity(id: string, quantity: number): Promise<Either<DomainError, Availability>> {
      return fromPromise(
        tx.availability.update({
          where: { id },
          data: { capacity: { increment: quantity } },
        }),
        () => new NotFoundError('Availability')
      ).then((either) => either.map(toAvailability))
    },
  }
}

function toRoom(prismaRoom: PrismaRoom): Room {
  return {
    ...prismaRoom,
    status: prismaRoom.status as RoomStatus,
    roomType: prismaRoom.roomType as RoomType | null,
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
    async updateStatus(id: string, status: RoomStatus): Promise<Either<DomainError, Room>> {
      return fromPromise(
        tx.room.update({
          where: { id },
          data: { status },
        }),
        () => new NotFoundError('Room')
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
