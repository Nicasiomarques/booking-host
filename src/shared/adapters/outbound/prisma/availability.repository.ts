import { PrismaClient, Availability as PrismaAvailability, Prisma } from '@prisma/client'
import type { Availability, CreateAvailabilityData, UpdateAvailabilityData } from '#features/availability/domain/index.js'

export type { Availability, CreateAvailabilityData, UpdateAvailabilityData }

function toAvailability(prismaAvailability: PrismaAvailability): Availability {
  return {
    ...prismaAvailability,
    price: prismaAvailability.price ? prismaAvailability.price.toString() : null,
  }
}

export interface AvailabilityWithEstablishment extends Availability {
  service: { establishmentId: string }
}

export class AvailabilityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateAvailabilityData): Promise<Availability> {
    const result = await this.prisma.availability.create({
      data: {
        serviceId: data.serviceId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        capacity: data.capacity,
        price: data.price !== undefined ? new Prisma.Decimal(data.price) : null,
        notes: data.notes ?? null,
        isRecurring: data.isRecurring ?? false,
      },
    })
    return toAvailability(result)
  }

  async findById(id: string): Promise<Availability | null> {
    const result = await this.prisma.availability.findUnique({
      where: { id },
    })
    return result ? toAvailability(result) : null
  }

  async findByIdWithService(id: string): Promise<AvailabilityWithEstablishment | null> {
    const result = await this.prisma.availability.findUnique({
      where: { id },
      include: {
        service: {
          select: { establishmentId: true },
        },
      },
    })
    if (!result) return null
    return {
      ...toAvailability(result),
      service: result.service,
    }
  }

  async findByService(
    serviceId: string,
    options: { startDate?: Date; endDate?: Date } = {}
  ): Promise<Availability[]> {
    const results = await this.prisma.availability.findMany({
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
    return results.map(toAvailability)
  }

  async findByDateRange(
    serviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Availability[]> {
    const results = await this.prisma.availability.findMany({
      where: {
        serviceId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
    return results.map(toAvailability)
  }

  async update(id: string, data: UpdateAvailabilityData): Promise<Availability> {
    const updateData: any = { ...data }
    
    if (data.price !== undefined) {
      updateData.price = data.price !== null ? new Prisma.Decimal(data.price) : null
    }
    
    const result = await this.prisma.availability.update({
      where: { id },
      data: updateData,
    })
    return toAvailability(result)
  }

  async delete(id: string): Promise<Availability> {
    const result = await this.prisma.availability.delete({
      where: { id },
    })
    return toAvailability(result)
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
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
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
    const result = await this.prisma.availability.update({
      where: { id },
      data: {
        capacity: { decrement: quantity },
      },
    })
    return toAvailability(result)
  }

  async incrementCapacity(id: string, quantity: number): Promise<Availability> {
    const result = await this.prisma.availability.update({
      where: { id },
      data: {
        capacity: { increment: quantity },
      },
    })
    return toAvailability(result)
  }
}
