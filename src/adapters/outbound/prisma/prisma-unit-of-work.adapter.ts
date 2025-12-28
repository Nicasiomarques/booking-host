import { PrismaClient, Prisma, Booking as PrismaBooking, Room as PrismaRoom, RoomStatus, Availability as PrismaAvailability } from '@prisma/client'
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
  RoomType,
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
      })
      return toBooking(result)
    },

    async updateStatus(id: string, status: BookingStatus, cancellationReason?: string | null): Promise<Booking> {
      const updateData: any = { status }
      
      // Automatically set confirmedAt when status changes to CONFIRMED
      if (status === 'CONFIRMED') {
        updateData.confirmedAt = new Date()
      }
      
      // Automatically set cancelledAt when status changes to CANCELLED
      if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date()
        if (cancellationReason !== undefined) {
          updateData.cancellationReason = cancellationReason
        }
      }
      
      // Automatically set checkedInAt when status changes to CHECKED_IN
      if (status === 'CHECKED_IN') {
        updateData.checkedInAt = new Date()
      }
      
      // Automatically set checkedOutAt when status changes to CHECKED_OUT
      if (status === 'CHECKED_OUT') {
        updateData.checkedOutAt = new Date()
      }
      
      const result = await tx.booking.update({
        where: { id },
        data: updateData,
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
  function toAvailability(prismaAvailability: PrismaAvailability): Availability {
    return {
      ...prismaAvailability,
      price: prismaAvailability.price ? prismaAvailability.price.toString() : null,
    }
  }
  
  return {
    async decrementCapacity(id: string, quantity: number): Promise<Availability> {
      const result = await tx.availability.update({
        where: { id },
        data: { capacity: { decrement: quantity } },
      })
      return toAvailability(result)
    },

    async incrementCapacity(id: string, quantity: number): Promise<Availability> {
      const result = await tx.availability.update({
        where: { id },
        data: { capacity: { increment: quantity } },
      })
      return toAvailability(result)
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
