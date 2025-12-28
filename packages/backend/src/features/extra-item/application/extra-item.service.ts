import type { ExtraItem, CreateExtraItemData, UpdateExtraItemData } from '../domain/index.js'
import type {
  ExtraItemRepositoryPort,
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
} from '#shared/application/ports/index.js'
import { requireOwnerRole } from '#shared/application/utils/authorization.helper.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'
import { updateWithAuthorization, deleteWithAuthorization } from '#shared/application/services/crud-helpers.js'

export class ExtraItemService {
  constructor(
    private readonly repository: ExtraItemRepositoryPort,
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort
  ) {}

  async create(
    serviceId: string,
    data: Omit<CreateExtraItemData, 'serviceId'>,
    userId: string
  ): Promise<ExtraItem> {
    const service = requireEntity(
      await this.serviceRepository.findById(serviceId),
      'Service'
    )

    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      service.establishmentId,
      'create extra items'
    )

    return this.repository.create({
      ...data,
      serviceId,
    })
  }

  async findById(id: string): Promise<ExtraItem> {
    return requireEntity(
      await this.repository.findById(id),
      'ExtraItem'
    )
  }

  async findByService(
    serviceId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<ExtraItem[]> {
    return this.repository.findByService(serviceId, options)
  }

  async update(
    id: string,
    data: UpdateExtraItemData,
    userId: string
  ): Promise<ExtraItem> {
    return updateWithAuthorization(id, data, userId, {
      repository: {
        findByIdWithService: (id) => this.repository.findByIdWithService(id),
        update: (id, data) => this.repository.update(id, data),
      },
      entityName: 'ExtraItem',
      getEstablishmentId: (extraItem: any) => extraItem.service.establishmentId,
      getUserRole: (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      action: 'update extra items',
    })
  }

  async delete(id: string, userId: string): Promise<ExtraItem> {
    return deleteWithAuthorization(id, userId, {
      repository: {
        findByIdWithService: (id) => this.repository.findByIdWithService(id),
        softDelete: (id) => this.repository.softDelete(id),
      },
      entityName: 'ExtraItem',
      getEstablishmentId: (extraItem: any) => extraItem.service.establishmentId,
      getUserRole: (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      action: 'delete extra items',
    })
  }
}

