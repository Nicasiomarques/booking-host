import { PrismaClient, Availability as PrismaAvailability, Prisma } from '@prisma/client'
import type { Availability, CreateAvailabilityData, UpdateAvailabilityData } from '../../domain/index.js'
import type { DomainError, Either } from '#shared/domain/index.js'
import { right, left, fromPromise } from '#shared/domain/index.js'
import { ConflictError, NotFoundError } from '#shared/domain/index.js'
import type { RepositoryErrorHandlerPort } from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

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

export const createAvailabilityRepository = (
  prisma: PrismaClient,
  errorHandler: RepositoryErrorHandlerPort
) => ({
  async create(data: CreateAvailabilityData): Promise<Either<DomainError, Availability>> {
    return fromPromise(
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
          return new ConflictError('Availability with this data already exists')
        }
        if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
          return new ConflictError('Invalid service reference')
        }
        return new ConflictError('Failed to create availability')
      }
    ).then((either) => either.map(toAvailability))
  },

  async findById(id: string): Promise<Either<DomainError, Availability | null>> {
    try {
      const result = await prisma.availability.findUnique({
        where: { id },
      })
      return right(result ? toAvailability(result) : null)
    } catch (error) {
      return left(new ConflictError('Failed to find availability'))
    }
  },

  async findByIdWithService(id: string): Promise<Either<DomainError, AvailabilityWithEstablishment | null>> {
    try {
      const result = await prisma.availability.findUnique({
        where: { id },
        include: {
          service: {
            select: { establishmentId: true },
          },
        },
      })
      if (!result) return right(null)
      return right({
        ...toAvailability(result),
        service: result.service,
      })
    } catch (error) {
      return left(new ConflictError('Failed to find availability'))
    }
  },

  async findByService(
    serviceId: string,
    options: { startDate?: Date; endDate?: Date } = {}
  ): Promise<Either<DomainError, Availability[]>> {
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
      return right(results.map(toAvailability))
    } catch (error) {
      return left(new ConflictError('Failed to find availabilities'))
    }
  },

  async findByDateRange(
    serviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Either<DomainError, Availability[]>> {
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
      return right(results.map(toAvailability))
    } catch (error) {
      return left(new ConflictError('Failed to find availabilities'))
    }
  },

  async update(id: string, data: UpdateAvailabilityData): Promise<Either<DomainError, Availability>> {
    const updateData: any = { ...data }
    
    if (data.price !== undefined) {
      updateData.price = data.price !== null ? new Prisma.Decimal(data.price) : null
    }
    
    return fromPromise(
      prisma.availability.update({
        where: { id },
        data: updateData,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new NotFoundError('Availability')
        }
        return new ConflictError('Failed to update availability')
      }
    ).then((either) => either.map(toAvailability))
  },

  async delete(id: string): Promise<Either<DomainError, Availability>> {
    return fromPromise(
      prisma.availability.delete({
        where: { id },
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new NotFoundError('Availability')
        }
        return new ConflictError('Failed to delete availability')
      }
    ).then((either) => either.map(toAvailability))
  },

  async checkOverlap(
    serviceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<Either<DomainError, boolean>> {
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
      return right(overlapping !== null)
    } catch (error) {
      return left(new ConflictError('Failed to check overlap'))
    }
  },

  async hasActiveBookings(availabilityId: string): Promise<Either<DomainError, boolean>> {
    try {
      const count = await prisma.booking.count({
        where: {
          availabilityId,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      })
      return right(count > 0)
    } catch (error) {
      return left(new ConflictError('Failed to check active bookings'))
    }
  },

  async getServiceId(availabilityId: string): Promise<Either<DomainError, string | null>> {
    try {
      const availability = await prisma.availability.findUnique({
        where: { id: availabilityId },
        select: { serviceId: true },
      })
      return right(availability?.serviceId ?? null)
    } catch (error) {
      return left(new ConflictError('Failed to get service ID'))
    }
  },

  async decrementCapacity(id: string, quantity: number): Promise<Either<DomainError, Availability>> {
    return fromPromise(
      prisma.availability.update({
        where: { id },
        data: {
          capacity: { decrement: quantity },
        },
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new NotFoundError('Availability')
        }
        return new ConflictError('Failed to decrement capacity')
      }
    ).then((either) => either.map(toAvailability))
  },

  async incrementCapacity(id: string, quantity: number): Promise<Either<DomainError, Availability>> {
    return fromPromise(
      prisma.availability.update({
        where: { id },
        data: {
          capacity: { increment: quantity },
        },
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new NotFoundError('Availability')
        }
        return new ConflictError('Failed to increment capacity')
      }
    ).then((either) => either.map(toAvailability))
  },
})

