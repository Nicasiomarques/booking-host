import type { ExtraItem, CreateExtraItemData, UpdateExtraItemData } from '../domain/index.js'
import type {
  ExtraItemRepositoryPort,
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
} from '#shared/application/ports/index.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'
import { updateWithAuthorization, deleteWithAuthorization, createWithServiceAuthorization } from '#shared/application/services/crud-helpers.js'

export const createExtraItemService = (deps: {
  repository: ExtraItemRepositoryPort
  serviceRepository: ServiceRepositoryPort
  establishmentRepository: EstablishmentRepositoryPort
}) => ({
  async create(
    serviceId: string,
    data: Omit<CreateExtraItemData, 'serviceId'>,
    userId: string
  ): Promise<ExtraItem> {
    return createWithServiceAuthorization(serviceId, data, userId, {
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

  async findById(id: string): Promise<ExtraItem> {
    return requireEntity(
      await deps.repository.findById(id),
      'ExtraItem'
    )
  },

  async findByService(
    serviceId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<ExtraItem[]> {
    return deps.repository.findByService(serviceId, options)
  },

  async update(
    id: string,
    data: UpdateExtraItemData,
    userId: string
  ): Promise<ExtraItem> {
    return updateWithAuthorization(id, data, userId, {
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

  async delete(id: string, userId: string): Promise<ExtraItem> {
    return deleteWithAuthorization(id, userId, {
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

