import { PrismaClient, Service as PrismaService, Prisma } from '@prisma/client'
import type { Service, CreateServiceData, UpdateServiceData } from '../../domain/index.js'
import type { ExtraItem } from '#features/extra-item/domain/index.js'
import { toDecimal, handleArrayFieldForCreate, createSoftDeleteData, processUpdateData } from '#shared/adapters/outbound/prisma/base-repository.js'
import type { DomainError, Either } from '#shared/domain/index.js'
import { right, left } from '#shared/domain/index.js'
import { ConflictError } from '#shared/domain/index.js'
import type { RepositoryErrorHandlerPort } from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'
import { fromPromise } from '#shared/domain/index.js'

export type { Service, CreateServiceData, UpdateServiceData }

function toService(prismaService: PrismaService): Service {
  return {
    ...prismaService,
    basePrice: prismaService.basePrice.toString(),
    type: prismaService.type as Service['type'],
    images: prismaService.images ? (prismaService.images as string[]) : null,
  }
}

function toExtraItem(prismaExtraItem: { id: string; serviceId: string; name: string; description: string | null; price: Prisma.Decimal; image: string | null; maxQuantity: number; active: boolean; createdAt: Date; updatedAt: Date }): ExtraItem {
  return {
    ...prismaExtraItem,
    price: prismaExtraItem.price.toString(),
  }
}

export interface ServiceWithExtras extends Service {
  extraItems: ExtraItem[]
}

export const createServiceRepository = (
  prisma: PrismaClient,
  errorHandler: RepositoryErrorHandlerPort
) => ({
  async create(data: CreateServiceData): Promise<Either<DomainError, Service>> {
    return fromPromise(
      prisma.service.create({
        data: {
          establishmentId: data.establishmentId,
          name: data.name,
          description: data.description,
          basePrice: toDecimal(data.basePrice)!,
          durationMinutes: data.durationMinutes,
          capacity: data.capacity ?? 1,
          type: data.type ?? 'SERVICE',
          images: handleArrayFieldForCreate(data.images),
          cancellationPolicy: data.cancellationPolicy ?? null,
          minimumAdvanceBooking: data.minimumAdvanceBooking ?? null,
          maximumAdvanceBooking: data.maximumAdvanceBooking ?? null,
          requiresConfirmation: data.requiresConfirmation ?? false,
        },
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new ConflictError('Service with this data already exists')
        }
        if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
          return new ConflictError('Invalid establishment reference')
        }
        return new ConflictError('Failed to create service')
      }
    ).then((either) => either.map(toService))
  },

  async findById(id: string): Promise<Either<DomainError, Service | null>> {
    try {
      const result = await prisma.service.findUnique({
        where: { id },
      })
      return right(result ? toService(result) : null)
    } catch (error) {
      return left(new ConflictError('Failed to find service'))
    }
  },

  async findByIdWithExtras(id: string): Promise<Either<DomainError, ServiceWithExtras | null>> {
    try {
      const result = await prisma.service.findUnique({
        where: { id },
        include: {
          extraItems: {
            where: { active: true },
          },
        },
      })
      if (!result) return right(null)
      return right({
        ...toService(result),
        extraItems: result.extraItems.map(toExtraItem),
      })
    } catch (error) {
      return left(new ConflictError('Failed to find service'))
    }
  },

  async findByEstablishment(
    establishmentId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Either<DomainError, Service[]>> {
    try {
      const results = await prisma.service.findMany({
        where: {
          establishmentId,
          ...(options.activeOnly ? { active: true } : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
      return right(results.map(toService))
    } catch (error) {
      return left(new ConflictError('Failed to find services'))
    }
  },

  async update(id: string, data: UpdateServiceData): Promise<Either<DomainError, Service>> {
    const updateData = processUpdateData(data, {
      decimalFields: ['basePrice'],
      arrayFields: ['images'],
    })
    
    return fromPromise(
      prisma.service.update({
        where: { id },
        data: updateData,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new ConflictError('Service not found')
        }
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new ConflictError('Service with this data already exists')
        }
        return new ConflictError('Failed to update service')
      }
    ).then((either) => either.map(toService))
  },

  async softDelete(id: string): Promise<Either<DomainError, Service>> {
    return fromPromise(
      prisma.service.update({
        where: { id },
        data: createSoftDeleteData(),
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new ConflictError('Service not found')
        }
        return new ConflictError('Failed to delete service')
      }
    ).then((either) => either.map(toService))
  },

  async hasActiveBookings(serviceId: string): Promise<Either<DomainError, boolean>> {
    try {
      const count = await prisma.booking.count({
        where: {
          serviceId,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      })
      return right(count > 0)
    } catch (error) {
      return left(new ConflictError('Failed to check active bookings'))
    }
  },

  async getEstablishmentId(serviceId: string): Promise<Either<DomainError, string | null>> {
    try {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { establishmentId: true },
      })
      return right(service?.establishmentId ?? null)
    } catch (error) {
      return left(new ConflictError('Failed to get establishment ID'))
    }
  },
})

