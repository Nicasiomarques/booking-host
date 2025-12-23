import { PrismaClient, Prisma, Booking as PrismaBooking } from '@prisma/client'
import type {
  UnitOfWorkPort,
  UnitOfWorkContext,
  TransactionalBookingRepository,
  TransactionalAvailabilityRepository,
} from '#application/ports/index.js'
import type {
  Booking,
  CreateBookingData,
  BookingExtraItemData,
  BookingStatus,
  Availability,
} from '#domain/index.js'

function toBooking(prismaBooking: PrismaBooking): Booking {
  return {
    ...prismaBooking,
    totalPrice: prismaBooking.totalPrice.toString(),
    status: prismaBooking.status as BookingStatus,
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
      }
      return work(context)
    })
  }
}
