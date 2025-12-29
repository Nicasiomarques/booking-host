import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

/**
 * Helper to convert Prisma errors to DomainError
 */
export function mapPrismaError(
  error: unknown,
  errorHandler: Ports.RepositoryErrorHandlerPort,
  entityName: string,
  defaultMessage?: string
): Domain.DomainError {
  const dbError = errorHandler.analyze(error)
  if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
    return new DomainValues.NotFoundError(entityName)
  }
  if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
    return new DomainValues.ConflictError(`${entityName} with this data already exists`)
  }
  if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
    return new DomainValues.ConflictError('Invalid reference')
  }
  return new DomainValues.ConflictError(defaultMessage || `Failed to operate on ${entityName}`)
}

/**
 * Helper to wrap Prisma operations with Either
 */
export async function wrapPrismaOperation<T, R>(
  operation: () => Promise<T>,
  mapper: (value: T) => R,
  errorHandler: Ports.RepositoryErrorHandlerPort,
  entityName: string,
  defaultMessage?: string
) {
  return DomainValues.fromPromise(operation(), (error) =>
    mapPrismaError(error, errorHandler, entityName, defaultMessage)
  ).then((either) => either.map(mapper))
}

