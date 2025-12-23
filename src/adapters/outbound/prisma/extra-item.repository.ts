import { PrismaClient, ExtraItem, Prisma } from '@prisma/client'

export interface CreateExtraItemData {
  serviceId: string
  name: string
  price: number
  maxQuantity?: number
}

export interface UpdateExtraItemData {
  name?: string
  price?: number
  maxQuantity?: number
  active?: boolean
}

export class ExtraItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateExtraItemData): Promise<ExtraItem> {
    return this.prisma.extraItem.create({
      data: {
        serviceId: data.serviceId,
        name: data.name,
        price: new Prisma.Decimal(data.price),
        maxQuantity: data.maxQuantity ?? 1,
      },
    })
  }

  async findById(id: string): Promise<ExtraItem | null> {
    return this.prisma.extraItem.findUnique({
      where: { id },
    })
  }

  async findByIdWithService(id: string): Promise<(ExtraItem & { service: { establishmentId: string } }) | null> {
    return this.prisma.extraItem.findUnique({
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
    options: { activeOnly?: boolean } = {}
  ): Promise<ExtraItem[]> {
    return this.prisma.extraItem.findMany({
      where: {
        serviceId,
        ...(options.activeOnly ? { active: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async update(id: string, data: UpdateExtraItemData): Promise<ExtraItem> {
    return this.prisma.extraItem.update({
      where: { id },
      data: {
        ...data,
        price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
      },
    })
  }

  async softDelete(id: string): Promise<ExtraItem> {
    return this.prisma.extraItem.update({
      where: { id },
      data: { active: false },
    })
  }

  async getServiceId(extraItemId: string): Promise<string | null> {
    const extraItem = await this.prisma.extraItem.findUnique({
      where: { id: extraItemId },
      select: { serviceId: true },
    })
    return extraItem?.serviceId ?? null
  }
}
