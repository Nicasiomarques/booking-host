import type { Role } from '#shared/domain/index.js'
import { ConflictError } from '#shared/domain/index.js'
import { requireOwnerRole } from '../utils/authorization.helper.js'
import { requireEntity } from '../utils/validation.helper.js'

/**
 * Helper for update operations with authorization
 * Pattern: find entity → check permissions → update
 */
export async function updateWithAuthorization<TEntity, TUpdateData>(
  entityId: string,
  updateData: TUpdateData,
  userId: string,
  options: {
    repository: {
      findById?: (id: string) => Promise<TEntity | null>
      findByIdWithService?: (id: string) => Promise<TEntity | null>
      update: (id: string, data: TUpdateData) => Promise<TEntity>
    }
    entityName: string
    getEstablishmentId: (entity: TEntity) => string
    getUserRole: (userId: string, establishmentId: string) => Promise<Role | null>
    action?: string
  }
): Promise<TEntity> {
  // Use findByIdWithService if available, otherwise use findById
  const findMethod = options.repository.findByIdWithService || options.repository.findById
  if (!findMethod) {
    throw new Error(`No find method available for ${options.entityName}`)
  }

  const entity = requireEntity(
    await findMethod(entityId),
    options.entityName
  )

  await requireOwnerRole(
    options.getUserRole,
    userId,
    options.getEstablishmentId(entity),
    options.action || `update ${options.entityName.toLowerCase()}`
  )

  return options.repository.update(entityId, updateData)
}

/**
 * Helper for delete operations with authorization and optional dependency check
 * Pattern: find entity → check permissions → (check dependencies) → delete
 */
export async function deleteWithAuthorization<TEntity>(
  entityId: string,
  userId: string,
  options: {
    repository: {
      findById?: (id: string) => Promise<TEntity | null>
      findByIdWithService?: (id: string) => Promise<TEntity | null>
      softDelete?: (id: string) => Promise<TEntity>
      delete?: (id: string) => Promise<TEntity>
      hasActiveBookings?: (id: string) => Promise<boolean>
    }
    entityName: string
    getEstablishmentId: (entity: TEntity) => string
    getUserRole: (userId: string, establishmentId: string) => Promise<Role | null>
    action?: string
    checkDependencies?: boolean
    dependencyErrorMessage?: string
  }
): Promise<TEntity> {
  // Use findByIdWithService if available, otherwise use findById
  const findMethod = options.repository.findByIdWithService || options.repository.findById
  if (!findMethod) {
    throw new Error(`No find method available for ${options.entityName}`)
  }

  const entity = requireEntity(
    await findMethod(entityId),
    options.entityName
  )

  await requireOwnerRole(
    options.getUserRole,
    userId,
    options.getEstablishmentId(entity),
    options.action || `delete ${options.entityName.toLowerCase()}`
  )

  // Check dependencies if needed
  if (options.checkDependencies && options.repository.hasActiveBookings) {
    const hasBookings = await options.repository.hasActiveBookings(entityId)
    if (hasBookings) {
      throw new ConflictError(
        options.dependencyErrorMessage || `Cannot delete ${options.entityName.toLowerCase()} with active bookings`
      )
    }
  }

  // Use softDelete if available, otherwise use delete
  if (options.repository.softDelete) {
    return options.repository.softDelete(entityId)
  }
  if (options.repository.delete) {
    return options.repository.delete(entityId)
  }
  throw new Error(`No delete method available for ${options.entityName}`)
}

