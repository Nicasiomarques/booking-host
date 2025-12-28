import { PrismaClient } from '@prisma/client'
import type { CreateUserData, UserWithRoles } from '#shared/domain/index.js'

export type { CreateUserData, UserWithRoles }

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<UserWithRoles | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        establishmentUsers: {
          select: {
            establishmentId: true,
            role: true,
          },
        },
      },
    })

    if (!user) return null

    return {
      ...user,
      establishmentRoles: user.establishmentUsers.map(eu => ({
        establishmentId: eu.establishmentId,
        role: eu.role,
      })),
    }
  }

  async findByEmail(email: string): Promise<UserWithRoles | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        establishmentUsers: {
          select: {
            establishmentId: true,
            role: true,
          },
        },
      },
    })

    if (!user) return null

    return {
      ...user,
      establishmentRoles: user.establishmentUsers.map(eu => ({
        establishmentId: eu.establishmentId,
        role: eu.role,
      })),
    }
  }

  async create(data: CreateUserData): Promise<UserWithRoles> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        name: data.name,
        phone: data.phone ?? null,
        birthDate: data.birthDate ?? null,
        address: data.address ?? null,
      },
      include: {
        establishmentUsers: {
          select: {
            establishmentId: true,
            role: true,
          },
        },
      },
    })

    return {
      ...user,
      establishmentRoles: user.establishmentUsers.map(eu => ({
        establishmentId: eu.establishmentId,
        role: eu.role,
      })),
    }
  }

  async update(id: string, data: Partial<{ name: string; passwordHash: string }>): Promise<UserWithRoles | null> {
    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        establishmentUsers: {
          select: {
            establishmentId: true,
            role: true,
          },
        },
      },
    })

    return {
      ...user,
      establishmentRoles: user.establishmentUsers.map(eu => ({
        establishmentId: eu.establishmentId,
        role: eu.role,
      })),
    }
  }
}
