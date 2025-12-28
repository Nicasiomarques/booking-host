import { NotFoundError, Either, left, right, isLeft } from '#shared/domain/index.js'

export { isLeft }

/**
 * Ensures an entity exists, returning Either<NotFoundError, T>
 * Returns Left with NotFoundError if null, Right with entity if it exists
 */
export function requireEntity<T>(
  entity: T | null,
  entityName: string
): Either<NotFoundError, T> {
  if (!entity) {
    return left(new NotFoundError(entityName))
  }
  return right(entity)
}

