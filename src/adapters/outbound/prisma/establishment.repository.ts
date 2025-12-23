import { PrismaClient, Establishment, Role } from '@prisma/client'

export interface CreateEstablishmentData {
  name: string
  description?: string
  address: string
  timezone?: string
}

export interface UpdateEstablishmentData {
  name?: string
  description?: string
  address?: string
  timezone?: string
  active?: boolean
}

export interface EstablishmentWithRole extends Establishment {
  role: Role
}

export class EstablishmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: CreateEstablishmentData,
    ownerId: string
  ): Promise<Establishment> {
    return this.prisma.establishment.create({
      data: {
        name: data.name,
        description: data.description,
        address: data.address,
        timezone: data.timezone ?? 'UTC',
        users: {
          create: {
            userId: ownerId,
            role: 'OWNER',
          },
        },
      },
    })
  }

  async findById(id: string): Promise<Establishment | null> {
    return this.prisma.establishment.findUnique({
      where: { id },
    })
  }

  async findByUserId(userId: string): Promise<EstablishmentWithRole[]> {
    const establishmentUsers = await this.prisma.establishmentUser.findMany({
      where: { userId },
      include: {
        establishment: true,
      },
    })

    return establishmentUsers.map((eu) => ({
      ...eu.establishment,
      role: eu.role,
    }))
  }

  async update(
    id: string,
    data: UpdateEstablishmentData
  ): Promise<Establishment> {
    return this.prisma.establishment.update({
      where: { id },
      data,
    })
  }

  async getUserRole(
    userId: string,
    establishmentId: string
  ): Promise<Role | null> {
    const establishmentUser = await this.prisma.establishmentUser.findUnique({
      where: {
        userId_establishmentId: {
          userId,
          establishmentId,
        },
      },
    })

    return establishmentUser?.role ?? null
  }
}
