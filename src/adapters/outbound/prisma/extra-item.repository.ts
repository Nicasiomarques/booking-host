import { PrismaClient, ExtraItem as PrismaExtraItem, Prisma } from '@prisma/client'
import type { ExtraItem, CreateExtraItemData, UpdateExtraItemData } from '#domain/entities/index.js'

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

export class ExtraItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateExtraItemData): Promise<ExtraItem> {
    const result = await this.prisma.extraItem.create({
      data: {
        serviceId: data.serviceId,
        name: data.name,
        price: new Prisma.Decimal(data.price),
        maxQuantity: data.maxQuantity ?? 1,
      },
    })
    return toExtraItem(result)
  }

  async findById(id: string): Promise<ExtraItem | null> {
    const result = await this.prisma.extraItem.findUnique({
      where: { id },
    })
    return result ? toExtraItem(result) : null
  }

  async findByIdWithService(id: string): Promise<ExtraItemWithEstablishment | null> {
    const result = await this.prisma.extraItem.findUnique({
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
  }

  async findByService(
    serviceId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<ExtraItem[]> {
    const results = await this.prisma.extraItem.findMany({
      where: {
        serviceId,
        ...(options.activeOnly ? { active: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    return results.map(toExtraItem)
  }

  async update(id: string, data: UpdateExtraItemData): Promise<ExtraItem> {
    const result = await this.prisma.extraItem.update({
      where: { id },
      data: {
        ...data,
        price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
      },
    })
    return toExtraItem(result)
  }

  async softDelete(id: string): Promise<ExtraItem> {
    const result = await this.prisma.extraItem.update({
      where: { id },
      data: { active: false },
    })
    return toExtraItem(result)
  }

  async getServiceId(extraItemId: string): Promise<string | null> {
    const extraItem = await this.prisma.extraItem.findUnique({
      where: { id: extraItemId },
      select: { serviceId: true },
    })
    return extraItem?.serviceId ?? null
  }
}
