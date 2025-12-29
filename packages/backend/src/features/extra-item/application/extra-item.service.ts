import type * as ExtraItemDomain from '../domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import * as Validation from '#shared/application/utils/validation.helper.js'
import * as CRUD from '#shared/application/services/crud-helpers.js'

export const createExtraItemService = (deps: {
  repository: Ports.ExtraItemRepositoryPort
  serviceRepository: Ports.ServiceRepositoryPort
  establishmentRepository: Ports.EstablishmentRepositoryPort
}) => ({
  async create(
    serviceId: string,
    data: Omit<ExtraItemDomain.CreateExtraItemData, 'serviceId'>,
    userId: string
  ): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem>> {
    return CRUD.createWithServiceAuthorization(serviceId, data, userId, {
      serviceRepository: {
        findById: (id) => deps.serviceRepository.findById(id),
      },
      entityRepository: {
        create: (data) => deps.repository.create(data),
      },
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      getEstablishmentId: (service) => service.establishmentId,
      entityName: 'ExtraItem',
      action: 'create extra items',
    })
  },

  async findById(id: string): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem>> {
    const result = await deps.repository.findById(id)
    if (Validation.isLeft(result)) {
      return result
    }
    return Validation.requireEntity(result.value, 'ExtraItem')
  },

  async findByService(
    serviceId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem[]>> {
    return deps.repository.findByService(serviceId, options)
  },

  async update(
    id: string,
    data: ExtraItemDomain.UpdateExtraItemData,
    userId: string
  ): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem>> {
    return CRUD.updateWithAuthorization(id, data, userId, {
      repository: {
        findByIdWithService: (id) => deps.repository.findByIdWithService(id),
        update: (id, data) => deps.repository.update(id, data),
      },
      entityName: 'ExtraItem',
      getEstablishmentId: (extraItem: any) => extraItem.service.establishmentId,
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'update extra items',
    })
  },

  async delete(id: string, userId: string): Promise<Domain.Either<Domain.DomainError, ExtraItemDomain.ExtraItem>> {
    return CRUD.deleteWithAuthorization(id, userId, {
      repository: {
        findByIdWithService: (id) => deps.repository.findByIdWithService(id),
        softDelete: (id) => deps.repository.softDelete(id),
      },
      entityName: 'ExtraItem',
      getEstablishmentId: (extraItem: any) => extraItem.service.establishmentId,
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'delete extra items',
    })
  },
})

