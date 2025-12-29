import { PrismaClient, ExtraItem as PrismaExtraItem } from '@prisma/client'
import type * as ExtraItemDomain from '../../domain/index.js'
import { toDecimal, createSoftDeleteData, processUpdateData } from '#shared/adapters/outbound/prisma/base-repository.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type { ExtraItem, CreateExtraItemData, UpdateExtraItemData } from '../../domain/index.js'

function toExtraItem(prismaExtraItem: PrismaExtraItem): ExtraItemDomain.ExtraItem {
  return {
    ...prismaExtraItem,
    price: prismaExtraItem.price.toString(),
  }
}

export interface ExtraItemWithEstablishment extends ExtraItemDomain.ExtraItem {
  service: { establishmentId: string }
}

export const createExtraItemRepository = (
  prisma: PrismaClient,
  errorHandler: Ports.RepositoryErrorHandlerPort
) => ({
  async create(data: ExtraItemDomain.CreateExtraItemData): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem>> {
    return DomainValues.fromPromise(
      prisma.extraItem.create({
        data: {
          serviceId: data.serviceId,
          name: data.name,
          price: toDecimal(data.price)!,
          maxQuantity: data.maxQuantity ?? 1,
          description: data.description ?? null,
          image: data.image ?? null,
        },
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new DomainValues.ConflictError('Extra item with this data already exists')
        }
        if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
          return new DomainValues.ConflictError('Invalid service reference')
        }
        return new DomainValues.ConflictError('Failed to create extra item')
      }
    ).then((either) => either.map(toExtraItem))
  },

  async findById(id: string): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem | null>> {
    try {
      const result = await prisma.extraItem.findUnique({
        where: { id },
      })
      return DomainValues.right(result ? toExtraItem(result) : null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find extra item'))
    }
  },

  async findByIdWithService(id: string): Promise<Domain.Either<Domain.DomainError, ExtraItemWithEstablishment | null>> {
    try {
      const result = await prisma.extraItem.findUnique({
        where: { id },
        include: {
          service: {
            select: { establishmentId: true },
          },
        },
      })
      if (!result) return DomainValues.right(null)
      return DomainValues.right({
        ...toExtraItem(result),
        service: result.service,
      })
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find extra item'))
    }
  },

  async findByService(
    serviceId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem[]>> {
    try {
      const results = await prisma.extraItem.findMany({
        where: {
          serviceId,
          ...(options.activeOnly ? { active: true } : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
      return DomainValues.right(results.map(toExtraItem))
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find extra items'))
    }
  },

  async update(id: string, data: ExtraItemDomain.UpdateExtraItemData): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem>> {
    const updateData = processUpdateData(data, {
      decimalFields: ['price'],
    })
    
    return DomainValues.fromPromise(
      prisma.extraItem.update({
        where: { id },
        data: updateData,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.NotFoundError('ExtraItem')
        }
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new DomainValues.ConflictError('Extra item with this data already exists')
        }
        return new DomainValues.ConflictError('Failed to update extra item')
      }
    ).then((either) => either.map(toExtraItem))
  },

  async softDelete(id: string): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem>> {
    return DomainValues.fromPromise(
      prisma.extraItem.update({
        where: { id },
        data: createSoftDeleteData(),
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.NotFoundError('ExtraItem')
        }
        return new DomainValues.ConflictError('Failed to delete extra item')
      }
    ).then((either) => either.map(toExtraItem))
  },

  async getServiceId(extraItemId: string): Promise<Domain.Either<Domain.DomainError, string | null>> {
    try {
      const extraItem = await prisma.extraItem.findUnique({
        where: { id: extraItemId },
        select: { serviceId: true },
      })
      return DomainValues.right(extraItem?.serviceId ?? null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to get service ID'))
    }
  },
})

