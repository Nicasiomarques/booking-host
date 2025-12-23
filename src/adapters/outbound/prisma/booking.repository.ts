import { PrismaClient, Booking, BookingStatus, Prisma } from '@prisma/client'

export interface CreateBookingData {
  userId: string
  establishmentId: string
  serviceId: string
  availabilityId: string
  quantity: number
  totalPrice: number
  status?: BookingStatus
}

export interface BookingExtraItemData {
  extraItemId: string
  quantity: number
  priceAtBooking: number
}

export interface BookingWithDetails extends Booking {
  service: {
    id: string
    name: string
    basePrice: Prisma.Decimal
    durationMinutes: number
  }
  availability: {
    id: string
    date: Date
    startTime: string
    endTime: string
  }
  extraItems: Array<{
    quantity: number
    priceAtBooking: Prisma.Decimal
    extraItem: {
      id: string
      name: string
    }
  }>
}

export interface ListBookingsOptions {
  page?: number
  limit?: number
  status?: BookingStatus
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export class BookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: CreateBookingData,
    extras: BookingExtraItemData[],
    tx?: Prisma.TransactionClient
  ): Promise<Booking> {
    const client = tx ?? this.prisma
    return client.booking.create({
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
  }

  async findById(id: string): Promise<BookingWithDetails | null> {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
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
    }) as Promise<BookingWithDetails | null>
  }

  async findByUser(
    userId: string,
    options: ListBookingsOptions = {}
  ): Promise<PaginatedResult<BookingWithDetails>> {
    const { page = 1, limit = 10, status } = options
    const skip = (page - 1) * limit

    const where: Prisma.BookingWhereInput = {
      userId,
      ...(status ? { status } : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
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
      this.prisma.booking.count({ where }),
    ])

    return {
      data: data as BookingWithDetails[],
      total,
      page,
      limit,
    }
  }

  async findByEstablishment(
    establishmentId: string,
    options: ListBookingsOptions = {}
  ): Promise<PaginatedResult<BookingWithDetails>> {
    const { page = 1, limit = 10, status } = options
    const skip = (page - 1) * limit

    const where: Prisma.BookingWhereInput = {
      establishmentId,
      ...(status ? { status } : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
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
      this.prisma.booking.count({ where }),
    ])

    return {
      data: data as BookingWithDetails[],
      total,
      page,
      limit,
    }
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    tx?: Prisma.TransactionClient
  ): Promise<Booking> {
    const client = tx ?? this.prisma
    return client.booking.update({
      where: { id },
      data: { status },
    })
  }

  async getBookingOwnership(id: string): Promise<{
    userId: string
    establishmentId: string
    quantity: number
    availabilityId: string
    status: BookingStatus
  } | null> {
    return this.prisma.booking.findUnique({
      where: { id },
      select: {
        userId: true,
        establishmentId: true,
        quantity: true,
        availabilityId: true,
        status: true,
      },
    })
  }
}
