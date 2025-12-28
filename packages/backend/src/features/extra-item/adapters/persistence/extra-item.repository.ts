import { PrismaClient, ExtraItem as PrismaExtraItem } from '@prisma/client'
import type { ExtraItem, CreateExtraItemData, UpdateExtraItemData } from '../../domain/index.js'
import { toDecimal, createSoftDeleteData, processUpdateData } from '#shared/adapters/outbound/prisma/base-repository.js'
import type { DomainError, Either } from '#shared/domain/index.js'
import { right, left, fromPromise } from '#shared/domain/index.js'
import { ConflictError, NotFoundError } from '#shared/domain/index.js'
import type { RepositoryErrorHandlerPort } from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type { ExtraItem, CreateExtraItemData, UpdateExtraItemData }

function toExtraItem(prismaExtraItem: PrismaExtraItem): ExtraItem {
  return {
    ...prismaExtraItem,
    price: prismaExtraItem.price.toString(),
  }
}

export interface ExtraItemWithEstablishment extends ExtraItem {
  service: { establishmentId: string }
}

export const createExtraItemRepository = (
  prisma: PrismaClient,
  errorHandler: RepositoryErrorHandlerPort
) => ({
  async create(data: CreateExtraItemData): Promise<Either<DomainError, ExtraItem>> {
    return fromPromise(
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
          return new ConflictError('Extra item with this data already exists')
        }
        if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
          return new ConflictError('Invalid service reference')
        }
        return new ConflictError('Failed to create extra item')
      }
    ).then((either) => either.map(toExtraItem))
  },

  async findById(id: string): Promise<Either<DomainError, ExtraItem | null>> {
    try {
      const result = await prisma.extraItem.findUnique({
        where: { id },
      })
      return right(result ? toExtraItem(result) : null)
    } catch (error) {
      return left(new ConflictError('Failed to find extra item'))
    }
  },

  async findByIdWithService(id: string): Promise<Either<DomainError, ExtraItemWithEstablishment | null>> {
    try {
      const result = await prisma.extraItem.findUnique({
        where: { id },
        include: {
          service: {
            select: { establishmentId: true },
          },
        },
      })
      if (!result) return right(null)
      return right({
        ...toExtraItem(result),
        service: result.service,
      })
    } catch (error) {
      return left(new ConflictError('Failed to find extra item'))
    }
  },

  async findByService(
    serviceId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Either<DomainError, ExtraItem[]>> {
    try {
      const results = await prisma.extraItem.findMany({
        where: {
          serviceId,
          ...(options.activeOnly ? { active: true } : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
      return right(results.map(toExtraItem))
    } catch (error) {
      return left(new ConflictError('Failed to find extra items'))
    }
  },

  async update(id: string, data: UpdateExtraItemData): Promise<Either<DomainError, ExtraItem>> {
    const updateData = processUpdateData(data, {
      decimalFields: ['price'],
    })
    
    return fromPromise(
      prisma.extraItem.update({
        where: { id },
        data: updateData,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new NotFoundError('ExtraItem')
        }
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new ConflictError('Extra item with this data already exists')
        }
        return new ConflictError('Failed to update extra item')
      }
    ).then((either) => either.map(toExtraItem))
  },

  async softDelete(id: string): Promise<Either<DomainError, ExtraItem>> {
    return fromPromise(
      prisma.extraItem.update({
        where: { id },
        data: createSoftDeleteData(),
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new NotFoundError('ExtraItem')
        }
        return new ConflictError('Failed to delete extra item')
      }
    ).then((either) => either.map(toExtraItem))
  },

  async getServiceId(extraItemId: string): Promise<Either<DomainError, string | null>> {
    try {
      const extraItem = await prisma.extraItem.findUnique({
        where: { id: extraItemId },
        select: { serviceId: true },
      })
      return right(extraItem?.serviceId ?? null)
    } catch (error) {
      return left(new ConflictError('Failed to get service ID'))
    }
  },
})

