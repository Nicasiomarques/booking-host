import { PrismaClient, Service as PrismaService, Prisma } from '@prisma/client'
import type { Service, CreateServiceData, UpdateServiceData, ExtraItem } from '../../../domain/entities/index.js'

export type { Service, CreateServiceData, UpdateServiceData }

function toService(prismaService: PrismaService): Service {
  return {
    ...prismaService,
    basePrice: prismaService.basePrice.toString(),
  }
}

function toExtraItem(prismaExtraItem: { id: string; serviceId: string; name: string; price: Prisma.Decimal; maxQuantity: number; active: boolean; createdAt: Date; updatedAt: Date }): ExtraItem {
  return {
    ...prismaExtraItem,
    price: prismaExtraItem.price.toString(),
  }
}

export interface ServiceWithExtras extends Service {
  extraItems: ExtraItem[]
}

export class ServiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateServiceData): Promise<Service> {
    const result = await this.prisma.service.create({
      data: {
        establishmentId: data.establishmentId,
        name: data.name,
        description: data.description,
        basePrice: new Prisma.Decimal(data.basePrice),
        durationMinutes: data.durationMinutes,
        capacity: data.capacity ?? 1,
      },
    })
    return toService(result)
  }

  async findById(id: string): Promise<Service | null> {
    const result = await this.prisma.service.findUnique({
      where: { id },
    })
    return result ? toService(result) : null
  }

  async findByIdWithExtras(id: string): Promise<ServiceWithExtras | null> {
    const result = await this.prisma.service.findUnique({
      where: { id },
      include: {
        extraItems: {
          where: { active: true },
        },
      },
    })
    if (!result) return null
    return {
      ...toService(result),
      extraItems: result.extraItems.map(toExtraItem),
    }
  }

  async findByEstablishment(
    establishmentId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Service[]> {
    const results = await this.prisma.service.findMany({
      where: {
        establishmentId,
        ...(options.activeOnly ? { active: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    return results.map(toService)
  }

  async update(id: string, data: UpdateServiceData): Promise<Service> {
    const result = await this.prisma.service.update({
      where: { id },
      data: {
        ...data,
        basePrice: data.basePrice !== undefined ? new Prisma.Decimal(data.basePrice) : undefined,
      },
    })
    return toService(result)
  }

  async softDelete(id: string): Promise<Service> {
    const result = await this.prisma.service.update({
      where: { id },
      data: { active: false },
    })
    return toService(result)
  }

  async hasActiveBookings(serviceId: string): Promise<boolean> {
    const count = await this.prisma.booking.count({
      where: {
        serviceId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })
    return count > 0
  }

  async getEstablishmentId(serviceId: string): Promise<string | null> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { establishmentId: true },
    })
    return service?.establishmentId ?? null
  }
}
