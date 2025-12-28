import { PrismaClient, Establishment as PrismaEstablishment } from '@prisma/client'
import type {
  Establishment,
  CreateEstablishmentData,
  UpdateEstablishmentData,
  EstablishmentWithRole,
} from '../../domain/index.js'
import type { Role, DomainError, Either } from '#shared/domain/index.js'
import { left, right, fromPromise } from '#shared/domain/index.js'
import { ConflictError, NotFoundError } from '#shared/domain/index.js'
import type { RepositoryErrorHandlerPort } from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type { Establishment, CreateEstablishmentData, UpdateEstablishmentData, EstablishmentWithRole }

function toEstablishment(prismaEstablishment: PrismaEstablishment): Establishment {
  return { ...prismaEstablishment }
}

function toEstablishmentWithRole(prismaEstablishment: PrismaEstablishment, role: Role): EstablishmentWithRole {
  return { ...prismaEstablishment, role }
}

export const createEstablishmentRepository = (
  prisma: PrismaClient,
  errorHandler: RepositoryErrorHandlerPort
) => ({
  async create(
    data: CreateEstablishmentData,
    ownerId: string
  ): Promise<Either<DomainError, Establishment>> {
    return fromPromise(
      prisma.establishment.create({
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
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new ConflictError('Establishment with this data already exists')
        }
        if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
          return new ConflictError('Invalid reference')
        }
        return new ConflictError('Failed to create establishment')
      }
    ).then((either) => either.map(toEstablishment))
  },

  async findById(id: string): Promise<Either<DomainError, Establishment | null>> {
    try {
      const result = await prisma.establishment.findUnique({
        where: { id },
      })
      return right(result ? toEstablishment(result) : null)
    } catch (error) {
      const dbError = errorHandler.analyze(error)
      if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
        return right(null)
      }
      return left(new ConflictError('Failed to find establishment'))
    }
  },

  async findByUserId(userId: string): Promise<Either<DomainError, EstablishmentWithRole[]>> {
    try {
      const establishmentUsers = await prisma.establishmentUser.findMany({
        where: { userId },
        include: {
          establishment: true,
        },
      })

      const result = establishmentUsers.map((eu) =>
        toEstablishmentWithRole(eu.establishment, eu.role as Role)
      )
      return right(result)
    } catch (error) {
      return left(new ConflictError('Failed to find establishments'))
    }
  },

  async update(
    id: string,
    data: UpdateEstablishmentData
  ): Promise<Either<DomainError, Establishment>> {
    return fromPromise(
      prisma.establishment.update({
        where: { id },
        data,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new NotFoundError('Establishment')
        }
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new ConflictError('Establishment with this data already exists')
        }
        return new ConflictError('Failed to update establishment')
      }
    ).then((either) => either.map(toEstablishment))
  },

  async getUserRole(
    userId: string,
    establishmentId: string
  ): Promise<Either<DomainError, Role | null>> {
    try {
      const establishmentUser = await prisma.establishmentUser.findUnique({
        where: {
          userId_establishmentId: {
            userId,
            establishmentId,
          },
        },
      })

      return right((establishmentUser?.role as Role) ?? null)
    } catch (error) {
      return left(new ConflictError('Failed to get user role'))
    }
  },
})

