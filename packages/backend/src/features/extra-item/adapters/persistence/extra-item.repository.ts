import { PrismaClient, ExtraItem as PrismaExtraItem } from '@prisma/client'
import type { ExtraItem, CreateExtraItemData, UpdateExtraItemData } from '../../domain/index.js'
import { toDecimal, createSoftDeleteData, processUpdateData } from '#shared/adapters/outbound/prisma/base-repository.js'

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

export const createExtraItemRepository = (prisma: PrismaClient) => ({
  async create(data: CreateExtraItemData): Promise<ExtraItem> {
    const result = await prisma.extraItem.create({
      data: {
        serviceId: data.serviceId,
        name: data.name,
        price: toDecimal(data.price)!,
        maxQuantity: data.maxQuantity ?? 1,
        description: data.description ?? null,
        image: data.image ?? null,
      },
    })
    return toExtraItem(result)
  },

  async findById(id: string): Promise<ExtraItem | null> {
    const result = await prisma.extraItem.findUnique({
      where: { id },
    })
    return result ? toExtraItem(result) : null
  },

  async findByIdWithService(id: string): Promise<ExtraItemWithEstablishment | null> {
    const result = await prisma.extraItem.findUnique({
      where: { id },
      include: {
        service: {
          select: { establishmentId: true },
        },
      },
    })
    if (!result) return null
    return {
      ...toExtraItem(result),
      service: result.service,
    }
  },

  async findByService(
    serviceId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<ExtraItem[]> {
    const results = await prisma.extraItem.findMany({
      where: {
        serviceId,
        ...(options.activeOnly ? { active: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    return results.map(toExtraItem)
  },

  async update(id: string, data: UpdateExtraItemData): Promise<ExtraItem> {
    const updateData = processUpdateData(data, {
      decimalFields: ['price'],
    })
    
    const result = await prisma.extraItem.update({
      where: { id },
      data: updateData,
    })
    return toExtraItem(result)
  },

  async softDelete(id: string): Promise<ExtraItem> {
    const result = await prisma.extraItem.update({
      where: { id },
      data: createSoftDeleteData(),
    })
    return toExtraItem(result)
  },

  async getServiceId(extraItemId: string): Promise<string | null> {
    const extraItem = await prisma.extraItem.findUnique({
      where: { id: extraItemId },
      select: { serviceId: true },
    })
    return extraItem?.serviceId ?? null
  },
})

