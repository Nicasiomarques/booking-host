import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'

export const isLeft = DomainValues.isLeft

/**
 * Ensures an entity exists, returning Either<NotFoundError, T>
 * Returns Left with NotFoundError if null, Right with entity if it exists
 */
export function requireEntity<T>(
  entity: T | null,
  entityName: string
): Domain.Either<DomainValues.NotFoundError, T> {
  if (!entity) {
    return DomainValues.left(new DomainValues.NotFoundError(entityName))
  }
  return DomainValues.right(entity)
}

