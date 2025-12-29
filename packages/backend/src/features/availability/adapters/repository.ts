import { PrismaClient, Availability as PrismaAvailability, Prisma } from '@prisma/client'
import type * as AvailabilityDomain from '../domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type { Availability, CreateAvailabilityData, UpdateAvailabilityData } from '../domain/index.js'

function toAvailability(prismaAvailability: PrismaAvailability): AvailabilityDomain.Availability {
  return {
    ...prismaAvailability,
    price: prismaAvailability.price ? prismaAvailability.price.toString() : null,
  }
}

export interface AvailabilityWithEstablishment extends AvailabilityDomain.Availability {
  service: { establishmentId: string }
}

export const createAvailabilityRepository = (
  prisma: PrismaClient,
  errorHandler: Ports.RepositoryErrorHandlerPort
) => ({
  async create(data: AvailabilityDomain.CreateAvailabilityData): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>> {
    return DomainValues.fromPromise(
      prisma.availability.create({
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
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new DomainValues.ConflictError('Availability with this data already exists')
        }
        if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
          return new DomainValues.ConflictError('Invalid service reference')
        }
        return new DomainValues.ConflictError('Failed to create availability')
      }
    ).then((either) => either.map(toAvailability))
  },

  async findById(id: string): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability | null>> {
    try {
      const result = await prisma.availability.findUnique({
        where: { id },
      })
      return DomainValues.right(result ? toAvailability(result) : null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find availability'))
    }
  },

  async findByIdWithService(id: string): Promise<Domain.Either<Domain.DomainError, AvailabilityWithEstablishment | null>> {
    try {
      const result = await prisma.availability.findUnique({
        where: { id },
        include: {
          service: {
            select: { establishmentId: true },
          },
        },
      })
      if (!result) return DomainValues.right(null)
      return DomainValues.right({
        ...toAvailability(result),
        service: result.service,
      })
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find availability'))
    }
  },

  async findByService(
    serviceId: string,
    options: { startDate?: Date; endDate?: Date } = {}
  ): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability[]>> {
    try {
      const results = await prisma.availability.findMany({
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
      return DomainValues.right(results.map(toAvailability))
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find availabilities'))
    }
  },

  async findByDateRange(
    serviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability[]>> {
    try {
      const results = await prisma.availability.findMany({
        where: {
          serviceId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      })
      return DomainValues.right(results.map(toAvailability))
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find availabilities'))
    }
  },

  async update(id: string, data: AvailabilityDomain.UpdateAvailabilityData): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>> {
    const updateData: any = { ...data }
    
    if (data.price !== undefined) {
      updateData.price = data.price !== null ? new Prisma.Decimal(data.price) : null
    }
    
    return DomainValues.fromPromise(
      prisma.availability.update({
        where: { id },
        data: updateData,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.NotFoundError('Availability')
        }
        return new DomainValues.ConflictError('Failed to update availability')
      }
    ).then((either) => either.map(toAvailability))
  },

  async delete(id: string): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>> {
    return DomainValues.fromPromise(
      prisma.availability.delete({
        where: { id },
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.NotFoundError('Availability')
        }
        return new DomainValues.ConflictError('Failed to delete availability')
      }
    ).then((either) => either.map(toAvailability))
  },

  async checkOverlap(
    serviceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<Domain.Either<Domain.DomainError, boolean>> {
    try {
      const overlapping = await prisma.availability.findFirst({
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
      return DomainValues.right(overlapping !== null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to check overlap'))
    }
  },

  async hasActiveBookings(availabilityId: string): Promise<Domain.Either<Domain.DomainError, boolean>> {
    try {
      const count = await prisma.booking.count({
        where: {
          availabilityId,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      })
      return DomainValues.right(count > 0)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to check active bookings'))
    }
  },

  async getServiceId(availabilityId: string): Promise<Domain.Either<Domain.DomainError, string | null>> {
    try {
      const availability = await prisma.availability.findUnique({
        where: { id: availabilityId },
        select: { serviceId: true },
      })
      return DomainValues.right(availability?.serviceId ?? null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to get service ID'))
    }
  },

  async decrementCapacity(id: string, quantity: number): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>> {
    return DomainValues.fromPromise(
      prisma.availability.update({
        where: { id },
        data: {
          capacity: { decrement: quantity },
        },
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.NotFoundError('Availability')
        }
        return new DomainValues.ConflictError('Failed to decrement capacity')
      }
    ).then((either) => either.map(toAvailability))
  },

  async incrementCapacity(id: string, quantity: number): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>> {
    return DomainValues.fromPromise(
      prisma.availability.update({
        where: { id },
        data: {
          capacity: { increment: quantity },
        },
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.NotFoundError('Availability')
        }
        return new DomainValues.ConflictError('Failed to increment capacity')
      }
    ).then((either) => either.map(toAvailability))
  },
})
