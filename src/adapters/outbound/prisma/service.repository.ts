import { PrismaClient, Service, Prisma } from '@prisma/client'

export interface CreateServiceData {
  establishmentId: string
  name: string
  description?: string
  basePrice: number
  durationMinutes: number
  capacity?: number
}

export interface UpdateServiceData {
  name?: string
  description?: string
  basePrice?: number
  durationMinutes?: number
  capacity?: number
  active?: boolean
}

export class ServiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateServiceData): Promise<Service> {
    return this.prisma.service.create({
      data: {
        establishmentId: data.establishmentId,
        name: data.name,
        description: data.description,
        basePrice: new Prisma.Decimal(data.basePrice),
        durationMinutes: data.durationMinutes,
        capacity: data.capacity ?? 1,
      },
    })
  }

  async findById(id: string): Promise<Service | null> {
    return this.prisma.service.findUnique({
      where: { id },
    })
  }

  async findByIdWithExtras(id: string): Promise<(Service & { extraItems: any[] }) | null> {
    return this.prisma.service.findUnique({
      where: { id },
      include: {
        extraItems: {
          where: { active: true },
        },
      },
    })
  }

  async findByEstablishment(
    establishmentId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: {
        establishmentId,
        ...(options.activeOnly ? { active: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async update(id: string, data: UpdateServiceData): Promise<Service> {
    return this.prisma.service.update({
      where: { id },
      data: {
        ...data,
        basePrice: data.basePrice !== undefined ? new Prisma.Decimal(data.basePrice) : undefined,
      },
    })
  }

  async softDelete(id: string): Promise<Service> {
    return this.prisma.service.update({
      where: { id },
      data: { active: false },
    })
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
