import type * as ServiceDomain from '../domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import type * as Domain from '#shared/domain/index.js'
import * as Authorization from '#shared/application/utils/authorization.helper.js'
import * as Validation from '#shared/application/utils/validation.helper.js'
import * as CRUD from '#shared/application/services/crud-helpers.js'

export const createServiceService = (deps: {
  repository: Ports.ServiceRepositoryPort
  establishmentRepository: Ports.EstablishmentRepositoryPort
}) => ({
  async create(
    establishmentId: string,
    data: Omit<ServiceDomain.CreateServiceData, 'establishmentId'>,
    userId: string
  ): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service>> {
    const roleCheck = await Authorization.requireOwnerRole(
      (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      userId,
      establishmentId,
      'create services'
    )
    if (Validation.isLeft(roleCheck)) {
      return roleCheck
    }

    return deps.repository.create({
      ...data,
      establishmentId,
    })
  },

  async findById(id: string): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service>> {
    const result = await deps.repository.findById(id)
    if (Validation.isLeft(result)) {
      return result
    }
    return Validation.requireEntity(result.value, 'Service')
  },

  async findByEstablishment(
    establishmentId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service[]>> {
    return deps.repository.findByEstablishment(establishmentId, options)
  },

  async update(
    id: string,
    data: ServiceDomain.UpdateServiceData,
    userId: string
  ): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service>> {
    return CRUD.updateWithAuthorization(id, data, userId, {
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

  async delete(id: string, userId: string): Promise<Domain.Either<Domain.DomainError, ServiceDomain.Service>> {
    return CRUD.deleteWithAuthorization(id, userId, {
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

