import { PrismaClient, Prisma, Booking as PrismaBooking, Room as PrismaRoom, RoomStatus } from '@prisma/client'
import type {
  UnitOfWorkPort,
  UnitOfWorkContext,
  TransactionalBookingRepository,
  TransactionalAvailabilityRepository,
  TransactionalRoomRepository,
} from '#application/ports/index.js'
import type {
  Booking,
  CreateBookingData,
  BookingExtraItemData,
  BookingStatus,
  Availability,
  Room,
} from '#domain/index.js'

function toBooking(prismaBooking: PrismaBooking): Booking {
  return {
    ...prismaBooking,
    totalPrice: prismaBooking.totalPrice.toString(),
    status: prismaBooking.status as BookingStatus,
    checkInDate: prismaBooking.checkInDate,
    checkOutDate: prismaBooking.checkOutDate,
    roomId: prismaBooking.roomId,
    numberOfNights: prismaBooking.numberOfNights,
    guestName: prismaBooking.guestName,
    guestEmail: prismaBooking.guestEmail,
    guestDocument: prismaBooking.guestDocument,
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
    ): Promise<Booking> {
      const result = await tx.booking.create({
        data: {
          userId: data.userId,
          establishmentId: data.establishmentId,
          serviceId: data.serviceId,
          availabilityId: data.availabilityId,
          quantity: data.quantity,
          totalPrice: new Prisma.Decimal(data.totalPrice),
          status: data.status ?? 'CONFIRMED',
          // Hotel-specific fields
          checkInDate: data.checkInDate ?? null,
          checkOutDate: data.checkOutDate ?? null,
          roomId: data.roomId ?? null,
          numberOfNights: data.numberOfNights ?? null,
          guestName: data.guestName ?? null,
          guestEmail: data.guestEmail ?? null,
          guestDocument: data.guestDocument ?? null,
          extraItems: {
            create: extras.map((e) => ({
              extraItemId: e.extraItemId,
              quantity: e.quantity,
              priceAtBooking: new Prisma.Decimal(e.priceAtBooking),
            })),
          },
        },
      })
      return toBooking(result)
    },

    async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
      const result = await tx.booking.update({
        where: { id },
        data: { status },
      })
      return toBooking(result)
    },
  }
}

/**
 * Creates transactional availability repository bound to a transaction client
 */
function createTransactionalAvailabilityRepository(
  tx: Prisma.TransactionClient
): TransactionalAvailabilityRepository {
  return {
    async decrementCapacity(id: string, quantity: number): Promise<Availability> {
      return tx.availability.update({
        where: { id },
        data: { capacity: { decrement: quantity } },
      })
    },

    async incrementCapacity(id: string, quantity: number): Promise<Availability> {
      return tx.availability.update({
        where: { id },
        data: { capacity: { increment: quantity } },
      })
    },
  }
}

function toRoom(prismaRoom: PrismaRoom): Room {
  return {
    ...prismaRoom,
    status: prismaRoom.status as RoomStatus,
  }
}

/**
 * Creates transactional room repository bound to a transaction client
 */
function createTransactionalRoomRepository(
  tx: Prisma.TransactionClient
): TransactionalRoomRepository {
  return {
    async updateStatus(id: string, status: RoomStatus): Promise<Room> {
      const result = await tx.room.update({
        where: { id },
        data: { status },
      })
      return toRoom(result)
    },
  }
}

/**
 * Prisma implementation of the UnitOfWorkPort.
 * Wraps Prisma interactive transactions.
 */
export class PrismaUnitOfWorkAdapter implements UnitOfWorkPort {
  constructor(private readonly prisma: PrismaClient) {}

  async execute<T>(work: (context: UnitOfWorkContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const context: UnitOfWorkContext = {
        bookingRepository: createTransactionalBookingRepository(tx),
        availabilityRepository: createTransactionalAvailabilityRepository(tx),
        roomRepository: createTransactionalRoomRepository(tx),
      }
      return work(context)
    })
  }
}
