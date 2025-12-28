import type { Role, DomainError, Either } from '#shared/domain/index.js'
import { ConflictError } from '#shared/domain/index.js'
import { requireOwnerRole } from '../utils/authorization.helper.js'
import { requireEntity } from '../utils/validation.helper.js'
import { isLeft, left } from '#shared/domain/index.js'

/**
 * Helper for create operations that require service validation and authorization
 * Pattern: find service → check permissions → (validate business rules) → create
 */
export async function createWithServiceAuthorization<TEntity, TCreateData, TService>(
  serviceId: string,
  createData: TCreateData,
  userId: string,
  options: {
    serviceRepository: {
      findById: (id: string) => Promise<Either<DomainError, TService | null>>
    }
    entityRepository: {
      create: (data: TCreateData & { serviceId: string }) => Promise<Either<DomainError, TEntity>>
    }
    getUserRole: (userId: string, establishmentId: string) => Promise<Either<DomainError, Role | null>>
    getEstablishmentId: (service: TService) => string
    entityName: string
    action?: string
    validateBeforeCreate?: (service: TService, data: TCreateData) => Promise<Either<DomainError, void>>
  }
): Promise<Either<DomainError, TEntity>> {
  const serviceResult = await options.serviceRepository.findById(serviceId)
  if (isLeft(serviceResult)) return serviceResult;
  const serviceEither = requireEntity(serviceResult.value, 'Service')
  if (isLeft(serviceEither)) return serviceEither;
  const service = serviceEither.value

  const roleCheck = await requireOwnerRole(
    options.getUserRole,
    userId,
    options.getEstablishmentId(service),
    options.action || `create ${options.entityName.toLowerCase()}`
  )
  if (isLeft(roleCheck)) return roleCheck;

  if (options.validateBeforeCreate) {
    const validationResult = await options.validateBeforeCreate(service, createData)
    if (isLeft(validationResult)) return validationResult;
  }

  return options.entityRepository.create({
    ...createData,
    serviceId,
  } as TCreateData & { serviceId: string })
}

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
      findById?: (id: string) => Promise<Either<DomainError, TEntity | null>>
      findByIdWithService?: (id: string) => Promise<Either<DomainError, TEntity | null>>
      update: (id: string, data: TUpdateData) => Promise<Either<DomainError, TEntity>>
    }
    entityName: string
    getEstablishmentId: (entity: TEntity) => string | Promise<string> | Either<DomainError, string> | Promise<Either<DomainError, string>>
    getUserRole: (userId: string, establishmentId: string) => Promise<Either<DomainError, Role | null>>
    action?: string
  }
): Promise<Either<DomainError, TEntity>> {
  const findMethod = options.repository.findByIdWithService || options.repository.findById
  if (!findMethod) {
    return left(new ConflictError(`No find method available for ${options.entityName}`))
  }

  const entityResult = await findMethod(entityId)
  if (isLeft(entityResult)) {
    return entityResult
  }
  const entityEither = requireEntity(entityResult.value, options.entityName)
  if (isLeft(entityEither)) return entityEither;
  
  const entity = entityEither.value

  const establishmentIdRaw = await Promise.resolve(options.getEstablishmentId(entity))
  let establishmentId: string
  if (typeof establishmentIdRaw === 'string') {
    establishmentId = establishmentIdRaw
  } else if (establishmentIdRaw && typeof establishmentIdRaw === 'object' && '_tag' in establishmentIdRaw) {
    if (isLeft(establishmentIdRaw)) return establishmentIdRaw;
    establishmentId = establishmentIdRaw.value;
  } else {
    return left(new ConflictError('Invalid establishment ID result'));
  }

  const roleCheck = await requireOwnerRole(
    options.getUserRole,
    userId,
    establishmentId,
    options.action || `update ${options.entityName.toLowerCase()}`
  )
  if (isLeft(roleCheck)) return roleCheck;

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
      findById?: (id: string) => Promise<Either<DomainError, TEntity | null>>
      findByIdWithService?: (id: string) => Promise<Either<DomainError, TEntity | null>>
      softDelete?: (id: string) => Promise<Either<DomainError, TEntity>>
      delete?: (id: string) => Promise<Either<DomainError, TEntity>>
      hasActiveBookings?: (id: string) => Promise<Either<DomainError, boolean>>
    }
    entityName: string
    getEstablishmentId: (entity: TEntity) => string | Promise<string> | Either<DomainError, string> | Promise<Either<DomainError, string>>
    getUserRole: (userId: string, establishmentId: string) => Promise<Either<DomainError, Role | null>>
    action?: string
    checkDependencies?: boolean
    dependencyErrorMessage?: string
  }
): Promise<Either<DomainError, TEntity>> {
  const findMethod = options.repository.findByIdWithService || options.repository.findById
  if (!findMethod) {
    return left(new ConflictError(`No find method available for ${options.entityName}`))
  }

  const entityResult = await findMethod(entityId)
  if (isLeft(entityResult)) {
    return entityResult
  }
  const entityEither = requireEntity(entityResult.value, options.entityName)
  if (isLeft(entityEither)) return entityEither;
  const entity = entityEither.value

  const establishmentIdRaw = await Promise.resolve(options.getEstablishmentId(entity))
  let establishmentId: string
  if (typeof establishmentIdRaw === 'string') {
    establishmentId = establishmentIdRaw
  } else if (establishmentIdRaw && typeof establishmentIdRaw === 'object' && '_tag' in establishmentIdRaw) {
    if (isLeft(establishmentIdRaw)) return establishmentIdRaw;
    establishmentId = establishmentIdRaw.value
  } else {
    return left(new ConflictError('Invalid establishment ID result'))
  }

  const roleCheck = await requireOwnerRole(
    options.getUserRole,
    userId,
    establishmentId,
    options.action || `delete ${options.entityName.toLowerCase()}`
  )
  if (isLeft(roleCheck)) return roleCheck;

  if (options.checkDependencies && options.repository.hasActiveBookings) {
    const bookingsResult = await options.repository.hasActiveBookings(entityId)
    if (isLeft(bookingsResult)) return bookingsResult;
    if (bookingsResult.value) {
      return left(new ConflictError(options.dependencyErrorMessage || `Cannot delete ${options.entityName.toLowerCase()} with active bookings`))
    }
  }

  if (options.repository.softDelete) return options.repository.softDelete(entityId)
  
  if (options.repository.delete) return options.repository.delete(entityId)
  return left(new ConflictError(`No delete method available for ${options.entityName}`))
}

