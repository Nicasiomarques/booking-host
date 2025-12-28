import type { DomainError } from '#shared/domain/index.js'
import { ConflictError, NotFoundError } from '#shared/domain/index.js'
import type { RepositoryErrorHandlerPort } from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'
import { fromPromise } from '#shared/domain/index.js'

/**
 * Helper to convert Prisma errors to DomainError
 */
export function mapPrismaError(
  error: unknown,
  errorHandler: RepositoryErrorHandlerPort,
  entityName: string,
  defaultMessage?: string
): DomainError {
  const dbError = errorHandler.analyze(error)
  if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
    return new NotFoundError(entityName)
  }
  if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
    return new ConflictError(`${entityName} with this data already exists`)
  }
  if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
    return new ConflictError('Invalid reference')
  }
  return new ConflictError(defaultMessage || `Failed to operate on ${entityName}`)
}

/**
 * Helper to wrap Prisma operations with Either
 */
export async function wrapPrismaOperation<T, R>(
  operation: () => Promise<T>,
  mapper: (value: T) => R,
  errorHandler: RepositoryErrorHandlerPort,
  entityName: string,
  defaultMessage?: string
) {
  return fromPromise(operation(), (error) =>
    mapPrismaError(error, errorHandler, entityName, defaultMessage)
  ).then((either) => either.map(mapper))
}

