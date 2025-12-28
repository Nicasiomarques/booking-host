import type { ExtraItem, CreateExtraItemData, UpdateExtraItemData } from '#domain/index.js'
import type {
  ExtraItemRepositoryPort,
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
} from './ports/index.js'
import { requireOwnerRole } from './utils/authorization.helper.js'
import { requireEntity } from './utils/validation.helper.js'

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
    const extraItem = requireEntity(
      await this.repository.findByIdWithService(id),
      'ExtraItem'
    )

    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      extraItem.service.establishmentId,
      'update extra items'
    )

    return this.repository.update(id, data)
  }

  async delete(id: string, userId: string): Promise<ExtraItem> {
    const extraItem = requireEntity(
      await this.repository.findByIdWithService(id),
      'ExtraItem'
    )

    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      extraItem.service.establishmentId,
      'delete extra items'
    )

    return this.repository.softDelete(id)
  }
}
