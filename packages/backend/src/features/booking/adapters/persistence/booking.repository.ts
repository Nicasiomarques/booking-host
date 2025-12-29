import { PrismaClient, Booking as PrismaBooking, Prisma } from '@prisma/client'
import type * as BookingDomain from '../../domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type {
  Booking,
  CreateBookingData,
  BookingExtraItemData,
  BookingWithDetails,
  ListBookingsOptions,
} from '../../domain/index.js'
export type { PaginatedResult } from '#shared/domain/index.js'

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

function toBookingWithDetails(prismaBooking: PrismaBooking & {
  user?: { id: string; name: string; email: string }
  service: { id: string; name: string; basePrice: Prisma.Decimal; durationMinutes: number }
  availability: { id: string; date: Date; startTime: string; endTime: string }
  extraItems: Array<{
    quantity: number
    priceAtBooking: Prisma.Decimal
    extraItem: { id: string; name: string }
  }>
}): BookingDomain.BookingWithDetails {
  return {
    ...prismaBooking,
    totalPrice: prismaBooking.totalPrice.toString(),
    status: prismaBooking.status as Domain.BookingStatus,
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
  errorHandler: Ports.RepositoryErrorHandlerPort
) => ({
  async findById(id: string): Promise<Domain.Either<Domain.DomainError, BookingDomain.BookingWithDetails | null>> {
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
      return DomainValues.right(result ? toBookingWithDetails(result) : null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find booking'))
    }
  },

  async findByUser(
    userId: string,
    options: BookingDomain.ListBookingsOptions = {}
  ): Promise<Domain.Either<Domain.DomainError, Domain.PaginatedResult<BookingDomain.BookingWithDetails>>> {
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

      return DomainValues.right({
        data: data.map(toBookingWithDetails),
        total,
        page,
        limit,
      })
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find bookings'))
    }
  },

  async findByEstablishment(
    establishmentId: string,
    options: BookingDomain.ListBookingsOptions = {}
  ): Promise<Domain.Either<Domain.DomainError, Domain.PaginatedResult<BookingDomain.BookingWithDetails>>> {
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

      return DomainValues.right({
        data: data.map(toBookingWithDetails),
        total,
        page,
        limit,
      })
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find bookings'))
    }
  },

  async updateStatus(
    id: string,
    status: Domain.BookingStatus,
    cancellationReason?: string | null
  ): Promise<Domain.Either<Domain.DomainError, BookingDomain.Booking>> {
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
      prisma.booking.update({
        where: { id },
        data: updateData,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.NotFoundError('Booking')
        }
        return new DomainValues.ConflictError('Failed to update booking status')
      }
    ).then((either) => either.map(toBooking))
  },

  async getBookingOwnership(id: string): Promise<Domain.Either<Domain.DomainError, {
    userId: string
    establishmentId: string
    quantity: number
    availabilityId: string
    status: Domain.BookingStatus
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

      if (!booking) return DomainValues.right(null)

      return DomainValues.right({
        userId: booking.userId,
        establishmentId: booking.establishmentId,
        quantity: booking.quantity,
        availabilityId: booking.availabilityId,
        status: booking.status,
        roomId: booking.roomId,
        serviceType: booking.service.type,
      })
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to get booking ownership'))
    }
  },
})

