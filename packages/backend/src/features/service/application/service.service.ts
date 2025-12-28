import type { Service, CreateServiceData, UpdateServiceData } from '../domain/index.js'
import type { ServiceRepositoryPort, EstablishmentRepositoryPort } from '#shared/application/ports/index.js'
import type { DomainError, Either } from '#shared/domain/index.js'
import { requireOwnerRole } from '#shared/application/utils/authorization.helper.js'
import { requireEntity, isLeft } from '#shared/application/utils/validation.helper.js'
import { updateWithAuthorization, deleteWithAuthorization } from '#shared/application/services/crud-helpers.js'

export const createServiceService = (deps: {
  repository: ServiceRepositoryPort
  establishmentRepository: EstablishmentRepositoryPort
}) => ({
  async create(
    establishmentId: string,
    data: Omit<CreateServiceData, 'establishmentId'>,
    userId: string
  ): Promise<Either<DomainError, Service>> {
    const roleCheck = await requireOwnerRole(
      (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      userId,
      establishmentId,
      'create services'
    )
    if (isLeft(roleCheck)) {
      return roleCheck
    }

    return deps.repository.create({
      ...data,
      establishmentId,
    })
  },

  async findById(id: string): Promise<Either<DomainError, Service>> {
    const result = await deps.repository.findById(id)
    if (isLeft(result)) {
      return result
    }
    return requireEntity(result.value, 'Service')
  },

  async findByEstablishment(
    establishmentId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Either<DomainError, Service[]>> {
    return deps.repository.findByEstablishment(establishmentId, options)
  },

  async update(
    id: string,
    data: UpdateServiceData,
    userId: string
  ): Promise<Either<DomainError, Service>> {
    return updateWithAuthorization(id, data, userId, {
      repository: {
        findById: (id) => deps.repository.findById(id),
        update: (id, data) => deps.repository.update(id, data),
      },
      entityName: 'Service',
      getEstablishmentId: (service) => service.establishmentId,
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'update services',
    })
  },

  async delete(id: string, userId: string): Promise<Either<DomainError, Service>> {
    return deleteWithAuthorization(id, userId, {
      repository: {
        findById: (id) => deps.repository.findById(id),
        softDelete: (id) => deps.repository.softDelete(id),
        hasActiveBookings: (id) => deps.repository.hasActiveBookings(id),
      },
      entityName: 'Service',
      getEstablishmentId: (service) => service.establishmentId,
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'delete services',
      checkDependencies: true,
      dependencyErrorMessage: 'Cannot delete service with active bookings',
    })
  },
})

