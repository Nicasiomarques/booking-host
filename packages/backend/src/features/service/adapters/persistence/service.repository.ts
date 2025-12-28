import { PrismaClient, Service as PrismaService, Prisma } from '@prisma/client'
import type { Service, CreateServiceData, UpdateServiceData } from '../../domain/index.js'
import type { ExtraItem } from '#features/extra-item/domain/index.js'
import { toDecimal, handleArrayFieldForCreate, handleArrayFieldForUpdate, createSoftDeleteData } from '#shared/adapters/outbound/prisma/base-repository.js'

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

export class ServiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateServiceData): Promise<Service> {
    const result = await this.prisma.service.create({
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
    const updateData: any = {
      ...data,
      basePrice: data.basePrice !== undefined ? toDecimal(data.basePrice) : undefined,
    }
    
    // Handle images array explicitly
    if (data.images !== undefined) {
      updateData.images = handleArrayFieldForUpdate(data.images)
    }
    
    const result = await this.prisma.service.update({
      where: { id },
      data: updateData,
    })
    return toService(result)
  }

  async softDelete(id: string): Promise<Service> {
    const result = await this.prisma.service.update({
      where: { id },
      data: createSoftDeleteData(),
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

