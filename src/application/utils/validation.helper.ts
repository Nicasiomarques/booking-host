import { NotFoundError } from '#domain/index.js'

/**
 * Ensures an entity exists, throwing NotFoundError if null
 * Returns the entity if it exists
 */
export function requireEntity<T>(
  entity: T | null,
  entityName: string
): T {
  if (!entity) {
    throw new NotFoundError(entityName)
  }
  return entity
}

