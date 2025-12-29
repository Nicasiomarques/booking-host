import { PrismaClient, Service as PrismaService, Prisma } from '@prisma/client'
import type * as ServiceDomain from '../domain/index.js'
import type * as ExtraItemDomain from '#features/extra-item/domain/index.js'
import { toDecimal, handleArrayFieldForCreate, createSoftDeleteData, processUpdateData } from '#shared/adapters/outbound/prisma/base-repository.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type { Service, CreateServiceData, UpdateServiceData } from '../domain/index.js'

function toService(prismaService: PrismaService): ServiceDomain.Service {
  return {
    ...prismaService,
    basePrice: prismaService.basePrice.toString(),
    type: prismaService.type as ServiceDomain.Service['type'],
    images: prismaService.images ? (prismaService.images as string[]) : null,
  }
}

function toExtraItem(prismaExtraItem: { id: string; serviceId: string; name: string; description: string | null; price: Prisma.Decimal; image: string | null; maxQuantity: number; active: boolean; createdAt: Date; updatedAt: Date }): ExtraItemDomain.ExtraItem {
  return {
    ...prismaExtraItem,
    price: prismaExtraItem.price.toString(),
  }
}

export interface ServiceWithExtras extends ServiceDomain.Service {
  extraItems: ExtraItemDomain.ExtraItem[]
}

export const createServiceRepository = (
  prisma: PrismaClient,
  errorHandler: Ports.RepositoryErrorHandlerPort
) => ({
  async create(data: ServiceDomain.CreateServiceData): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service>> {
    return DomainValues.fromPromise(
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
          return new DomainValues.ConflictError('Service with this data already exists')
        }
        if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
          return new DomainValues.ConflictError('Invalid establishment reference')
        }
        return new DomainValues.ConflictError('Failed to create service')
      }
    ).then((either) => either.map(toService))
  },

  async findById(id: string): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service | null>> {
    try {
      const result = await prisma.service.findUnique({
        where: { id },
      })
      return DomainValues.right(result ? toService(result) : null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find service'))
    }
  },

  async findByIdWithExtras(id: string): Promise<Domain.Either<Domain.DomainError, ServiceWithExtras | null>> {
    try {
      const result = await prisma.service.findUnique({
        where: { id },
        include: {
          extraItems: {
            where: { active: true },
          },
        },
      })
      if (!result) return DomainValues.right(null)
      return DomainValues.right({
        ...toService(result),
        extraItems: result.extraItems.map(toExtraItem),
      })
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find service'))
    }
  },

  async findByEstablishment(
    establishmentId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service[]>> {
    try {
      const results = await prisma.service.findMany({
        where: {
          establishmentId,
          ...(options.activeOnly ? { active: true } : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
      return DomainValues.right(results.map(toService))
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find services'))
    }
  },

  async update(id: string, data: ServiceDomain.UpdateServiceData): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service>> {
    const updateData = processUpdateData(data, {
      decimalFields: ['basePrice'],
      arrayFields: ['images'],
    })
    
    return DomainValues.fromPromise(
      prisma.service.update({
        where: { id },
        data: updateData,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.ConflictError('Service not found')
        }
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new DomainValues.ConflictError('Service with this data already exists')
        }
        return new DomainValues.ConflictError('Failed to update service')
      }
    ).then((either) => either.map(toService))
  },

  async softDelete(id: string): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service>> {
    return DomainValues.fromPromise(
      prisma.service.update({
        where: { id },
        data: createSoftDeleteData(),
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.ConflictError('Service not found')
        }
        return new DomainValues.ConflictError('Failed to delete service')
      }
    ).then((either) => either.map(toService))
  },

  async hasActiveBookings(serviceId: string): Promise<Domain.Either<Domain.DomainError, boolean>> {
    try {
      const count = await prisma.booking.count({
        where: {
          serviceId,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      })
      return DomainValues.right(count > 0)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to check active bookings'))
    }
  },

  async getEstablishmentId(serviceId: string): Promise<Domain.Either<Domain.DomainError, string | null>> {
    try {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { establishmentId: true },
      })
      return DomainValues.right(service?.establishmentId ?? null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to get establishment ID'))
    }
  },
})
