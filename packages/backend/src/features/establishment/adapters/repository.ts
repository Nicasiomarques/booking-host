import { PrismaClient, Establishment as PrismaEstablishment } from '@prisma/client'
import type * as EstablishmentDomain from '../domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type {
  Establishment,
  CreateEstablishmentData,
  UpdateEstablishmentData,
  EstablishmentWithRole,
} from '../domain/index.js'

function toEstablishment(prismaEstablishment: PrismaEstablishment): EstablishmentDomain.Establishment {
  return { ...prismaEstablishment }
}

function toEstablishmentWithRole(prismaEstablishment: PrismaEstablishment, role: Domain.Role): EstablishmentDomain.EstablishmentWithRole {
  return { ...prismaEstablishment, role }
}

export const createEstablishmentRepository = (
  prisma: PrismaClient,
  errorHandler: Ports.RepositoryErrorHandlerPort
) => ({
  async create(
    data: EstablishmentDomain.CreateEstablishmentData,
    ownerId: string
  ): Promise<Domain.Either<Domain.DomainError, EstablishmentDomain.Establishment>> {
    return DomainValues.fromPromise(
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
          return new DomainValues.ConflictError('Establishment with this data already exists')
        }
        if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
          return new DomainValues.ConflictError('Invalid reference')
        }
        return new DomainValues.ConflictError('Failed to create establishment')
      }
    ).then((either) => either.map(toEstablishment))
  },

  async findById(id: string): Promise<Domain.Either<Domain.DomainError, EstablishmentDomain.Establishment | null>> {
    try {
      const result = await prisma.establishment.findUnique({
        where: { id },
      })
      return DomainValues.right(result ? toEstablishment(result) : null)
    } catch (error) {
      const dbError = errorHandler.analyze(error)
      if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
        return DomainValues.right(null)
      }
      return DomainValues.left(new DomainValues.ConflictError('Failed to find establishment'))
    }
  },

  async findByUserId(userId: string): Promise<Domain.Either<Domain.DomainError, EstablishmentDomain.EstablishmentWithRole[]>> {
    try {
      const establishmentUsers = await prisma.establishmentUser.findMany({
        where: { userId },
        include: {
          establishment: true,
        },
      })

      const result = establishmentUsers.map((eu) =>
        toEstablishmentWithRole(eu.establishment, eu.role as Domain.Role)
      )
      return DomainValues.right(result)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find establishments'))
    }
  },

  async update(
    id: string,
    data: EstablishmentDomain.UpdateEstablishmentData
  ): Promise<Domain.Either<Domain.DomainError, EstablishmentDomain.Establishment>> {
    return DomainValues.fromPromise(
      prisma.establishment.update({
        where: { id },
        data,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.NotFoundError('Establishment')
        }
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new DomainValues.ConflictError('Establishment with this data already exists')
        }
        return new DomainValues.ConflictError('Failed to update establishment')
      }
    ).then((either) => either.map(toEstablishment))
  },

  async getUserRole(
    userId: string,
    establishmentId: string
  ): Promise<Domain.Either<Domain.DomainError, Domain.Role | null>> {
    try {
      const establishmentUser = await prisma.establishmentUser.findUnique({
        where: {
          userId_establishmentId: {
            userId,
            establishmentId,
          },
        },
      })

      return DomainValues.right((establishmentUser?.role as Domain.Role) ?? null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to get user role'))
    }
  },
})

