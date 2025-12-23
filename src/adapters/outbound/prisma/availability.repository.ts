import { PrismaClient, Availability } from '@prisma/client'

export interface CreateAvailabilityData {
  serviceId: string
  date: Date
  startTime: string
  endTime: string
  capacity: number
}

export interface UpdateAvailabilityData {
  date?: Date
  startTime?: string
  endTime?: string
  capacity?: number
}

export class AvailabilityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateAvailabilityData): Promise<Availability> {
    return this.prisma.availability.create({
      data: {
        serviceId: data.serviceId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        capacity: data.capacity,
      },
    })
  }

  async findById(id: string): Promise<Availability | null> {
    return this.prisma.availability.findUnique({
      where: { id },
    })
  }

  async findByIdWithService(id: string): Promise<(Availability & { service: { establishmentId: string } }) | null> {
    return this.prisma.availability.findUnique({
      where: { id },
      include: {
        service: {
          select: { establishmentId: true },
        },
      },
    })
  }

  async findByService(
    serviceId: string,
    options: { startDate?: Date; endDate?: Date } = {}
  ): Promise<Availability[]> {
    return this.prisma.availability.findMany({
      where: {
        serviceId,
        ...(options.startDate || options.endDate
          ? {
              date: {
                ...(options.startDate ? { gte: options.startDate } : {}),
                ...(options.endDate ? { lte: options.endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
  }

  async findByDateRange(
    serviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Availability[]> {
    return this.prisma.availability.findMany({
      where: {
        serviceId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
  }

  async update(id: string, data: UpdateAvailabilityData): Promise<Availability> {
    return this.prisma.availability.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<Availability> {
    return this.prisma.availability.delete({
      where: { id },
    })
  }

  async checkOverlap(
    serviceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<boolean> {
    const overlapping = await this.prisma.availability.findFirst({
      where: {
        serviceId,
        date,
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          // New slot starts during existing slot
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // New slot ends during existing slot
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // New slot contains existing slot
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    })
    return overlapping !== null
  }

  async hasActiveBookings(availabilityId: string): Promise<boolean> {
    const count = await this.prisma.booking.count({
      where: {
        availabilityId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })
    return count > 0
  }

  async getServiceId(availabilityId: string): Promise<string | null> {
    const availability = await this.prisma.availability.findUnique({
      where: { id: availabilityId },
      select: { serviceId: true },
    })
    return availability?.serviceId ?? null
  }

  async decrementCapacity(id: string, quantity: number): Promise<Availability> {
    return this.prisma.availability.update({
      where: { id },
      data: {
        capacity: { decrement: quantity },
      },
    })
  }

  async incrementCapacity(id: string, quantity: number): Promise<Availability> {
    return this.prisma.availability.update({
      where: { id },
      data: {
        capacity: { increment: quantity },
      },
    })
  }
}
