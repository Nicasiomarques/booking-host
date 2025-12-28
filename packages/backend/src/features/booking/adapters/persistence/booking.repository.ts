import { PrismaClient, Booking as PrismaBooking, Prisma } from '@prisma/client'
import type {
  Booking,
  CreateBookingData,
  BookingExtraItemData,
  BookingWithDetails,
  ListBookingsOptions,
} from '../../domain/index.js'
import type { PaginatedResult, BookingStatus, DomainError, Either } from '#shared/domain/index.js'
import { right, left, fromPromise } from '#shared/domain/index.js'
import { ConflictError, NotFoundError } from '#shared/domain/index.js'
import type { RepositoryErrorHandlerPort } from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type {
  Booking,
  CreateBookingData,
  BookingExtraItemData,
  BookingWithDetails,
  ListBookingsOptions,
  PaginatedResult,
}

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

function toBookingWithDetails(prismaBooking: PrismaBooking & {
  user?: { id: string; name: string; email: string }
  service: { id: string; name: string; basePrice: Prisma.Decimal; durationMinutes: number }
  availability: { id: string; date: Date; startTime: string; endTime: string }
  extraItems: Array<{
    quantity: number
    priceAtBooking: Prisma.Decimal
    extraItem: { id: string; name: string }
  }>
}): BookingWithDetails {
  return {
    ...prismaBooking,
    totalPrice: prismaBooking.totalPrice.toString(),
    status: prismaBooking.status as BookingStatus,
    service: {
      ...prismaBooking.service,
      basePrice: prismaBooking.service.basePrice.toString(),
    },
    extraItems: prismaBooking.extraItems.map((item) => ({
      ...item,
      priceAtBooking: item.priceAtBooking.toString(),
    })),
  }
}

export const createBookingRepository = (
  prisma: PrismaClient,
  errorHandler: RepositoryErrorHandlerPort
) => ({
  async findById(id: string): Promise<Either<DomainError, BookingWithDetails | null>> {
    try {
      const result = await prisma.booking.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              basePrice: true,
              durationMinutes: true,
            },
          },
          availability: {
            select: {
              id: true,
              date: true,
              startTime: true,
              endTime: true,
            },
          },
          extraItems: {
            include: {
              extraItem: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
      return right(result ? toBookingWithDetails(result) : null)
    } catch (error) {
      return left(new ConflictError('Failed to find booking'))
    }
  },

  async findByUser(
    userId: string,
    options: ListBookingsOptions = {}
  ): Promise<Either<DomainError, PaginatedResult<BookingWithDetails>>> {
    try {
      const { page = 1, limit = 10, status } = options
      const skip = (page - 1) * limit

      const where: Prisma.BookingWhereInput = {
        userId,
        ...(status ? { status } : {}),
      }

      const [data, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                durationMinutes: true,
              },
            },
            availability: {
              select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
              },
            },
            extraItems: {
              include: {
                extraItem: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        prisma.booking.count({ where }),
      ])

      return right({
        data: data.map(toBookingWithDetails),
        total,
        page,
        limit,
      })
    } catch (error) {
      return left(new ConflictError('Failed to find bookings'))
    }
  },

  async findByEstablishment(
    establishmentId: string,
    options: ListBookingsOptions = {}
  ): Promise<Either<DomainError, PaginatedResult<BookingWithDetails>>> {
    try {
      const { page = 1, limit = 10, status } = options
      const skip = (page - 1) * limit

      const where: Prisma.BookingWhereInput = {
        establishmentId,
        ...(status ? { status } : {}),
      }

      const [data, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                durationMinutes: true,
              },
            },
            availability: {
              select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
              },
            },
            extraItems: {
              include: {
                extraItem: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        prisma.booking.count({ where }),
      ])

      return right({
        data: data.map(toBookingWithDetails),
        total,
        page,
        limit,
      })
    } catch (error) {
      return left(new ConflictError('Failed to find bookings'))
    }
  },

  async updateStatus(
    id: string,
    status: BookingStatus,
    cancellationReason?: string | null
  ): Promise<Either<DomainError, Booking>> {
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
      prisma.booking.update({
        where: { id },
        data: updateData,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new NotFoundError('Booking')
        }
        return new ConflictError('Failed to update booking status')
      }
    ).then((either) => either.map(toBooking))
  },

  async getBookingOwnership(id: string): Promise<Either<DomainError, {
    userId: string
    establishmentId: string
    quantity: number
    availabilityId: string
    status: BookingStatus
    roomId: string | null
    serviceType: string | null
  } | null>> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id },
        select: {
          userId: true,
          establishmentId: true,
          quantity: true,
          availabilityId: true,
          status: true,
          roomId: true,
          service: {
            select: {
              type: true,
            },
          },
        },
      })

      if (!booking) return right(null)

      return right({
        userId: booking.userId,
        establishmentId: booking.establishmentId,
        quantity: booking.quantity,
        availabilityId: booking.availabilityId,
        status: booking.status,
        roomId: booking.roomId,
        serviceType: booking.service.type,
      })
    } catch (error) {
      return left(new ConflictError('Failed to get booking ownership'))
    }
  },
})

