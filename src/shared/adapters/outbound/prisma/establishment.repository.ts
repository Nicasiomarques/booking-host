import { PrismaClient, Establishment as PrismaEstablishment } from '@prisma/client'
import type {
  Establishment,
  CreateEstablishmentData,
  UpdateEstablishmentData,
  EstablishmentWithRole,
} from '#features/establishment/domain/index.js'
import type { Role } from '#shared/domain/index.js'

export type { Establishment, CreateEstablishmentData, UpdateEstablishmentData, EstablishmentWithRole }

function toEstablishment(prismaEstablishment: PrismaEstablishment): Establishment {
  return { ...prismaEstablishment }
}

function toEstablishmentWithRole(prismaEstablishment: PrismaEstablishment, role: Role): EstablishmentWithRole {
  return { ...prismaEstablishment, role }
}

export class EstablishmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: CreateEstablishmentData,
    ownerId: string
  ): Promise<Establishment> {
    const result = await this.prisma.establishment.create({
      data: {
        name: data.name,
        description: data.description,
        address: data.address,
        timezone: data.timezone ?? 'UTC',
        phone: data.phone ?? null,
        email: data.email ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        website: data.website ?? null,
        taxId: data.taxId ?? null,
        users: {
          create: {
            userId: ownerId,
            role: 'OWNER',
          },
        },
      },
    })
    return toEstablishment(result)
  }

  async findById(id: string): Promise<Establishment | null> {
    const result = await this.prisma.establishment.findUnique({
      where: { id },
    })
    return result ? toEstablishment(result) : null
  }

  async findByUserId(userId: string): Promise<EstablishmentWithRole[]> {
    const establishmentUsers = await this.prisma.establishmentUser.findMany({
      where: { userId },
      include: {
        establishment: true,
      },
    })

    return establishmentUsers.map((eu) =>
      toEstablishmentWithRole(eu.establishment, eu.role as Role)
    )
  }

  async update(
    id: string,
    data: UpdateEstablishmentData
  ): Promise<Establishment> {
    const result = await this.prisma.establishment.update({
      where: { id },
      data,
    })
    return toEstablishment(result)
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

    return (establishmentUser?.role as Role) ?? null
  }
}
