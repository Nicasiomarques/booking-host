import { PrismaClient } from '@prisma/client'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type { CreateUserData, UserWithRoles } from '#shared/domain/index.js'

function toUserWithRoles(user: any): Domain.UserWithRoles {
  return {
    ...user,
    establishmentRoles: user.establishmentUsers.map((eu: any) => ({
      establishmentId: eu.establishmentId,
      role: eu.role,
    })),
  }
}

export const createUserRepository = (
  prisma: PrismaClient,
  errorHandler: Ports.RepositoryErrorHandlerPort
) => ({
  async findById(id: string): Promise<Domain.Either<Domain.DomainError, Domain.UserWithRoles | null>> {
    try {
      const user = await prisma.user.findUnique({
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

      return DomainValues.right(user ? toUserWithRoles(user) : null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find user'))
    }
  },

  async findByEmail(email: string): Promise<Domain.Either<Domain.DomainError, Domain.UserWithRoles | null>> {
    try {
      const user = await prisma.user.findUnique({
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

      return DomainValues.right(user ? toUserWithRoles(user) : null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find user'))
    }
  },

  async create(data: Domain.CreateUserData): Promise<Domain.Either<Domain.DomainError, Domain.UserWithRoles>> {
    return DomainValues.fromPromise(
      prisma.user.create({
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
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new DomainValues.ConflictError('User with this email already exists')
        }
        return new DomainValues.ConflictError('Failed to create user')
      }
    ).then((either) => either.map(toUserWithRoles))
  },

  async update(id: string, data: Partial<{ name: string; passwordHash: string }>): Promise<Domain.Either<Domain.DomainError, Domain.UserWithRoles | null>> {
    return DomainValues.fromPromise(
      prisma.user.update({
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
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.NotFoundError('User')
        }
        return new DomainValues.ConflictError('Failed to update user')
      }
    ).then((either) => either.map(toUserWithRoles))
  },
})
