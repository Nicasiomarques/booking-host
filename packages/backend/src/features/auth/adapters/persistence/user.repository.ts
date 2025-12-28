import { PrismaClient } from '@prisma/client'
import type { CreateUserData, UserWithRoles, DomainError, Either } from '#shared/domain/index.js'
import { left, right, fromPromise } from '#shared/domain/index.js'
import { ConflictError, NotFoundError } from '#shared/domain/index.js'
import type { RepositoryErrorHandlerPort } from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type { CreateUserData, UserWithRoles }

function toUserWithRoles(user: any): UserWithRoles {
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
  errorHandler: RepositoryErrorHandlerPort
) => ({
  async findById(id: string): Promise<Either<DomainError, UserWithRoles | null>> {
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

      return right(user ? toUserWithRoles(user) : null)
    } catch (error) {
      return left(new ConflictError('Failed to find user'))
    }
  },

  async findByEmail(email: string): Promise<Either<DomainError, UserWithRoles | null>> {
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

      return right(user ? toUserWithRoles(user) : null)
    } catch (error) {
      return left(new ConflictError('Failed to find user'))
    }
  },

  async create(data: CreateUserData): Promise<Either<DomainError, UserWithRoles>> {
    return fromPromise(
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
          return new ConflictError('User with this email already exists')
        }
        return new ConflictError('Failed to create user')
      }
    ).then((either) => either.map(toUserWithRoles))
  },

  async update(id: string, data: Partial<{ name: string; passwordHash: string }>): Promise<Either<DomainError, UserWithRoles | null>> {
    return fromPromise(
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
          return new NotFoundError('User')
        }
        return new ConflictError('Failed to update user')
      }
    ).then((either) => either.map(toUserWithRoles))
  },
})

