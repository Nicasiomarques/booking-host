import type { ExtraItem, CreateExtraItemData, UpdateExtraItemData } from '#domain/index.js'
import { NotFoundError, ForbiddenError } from '#domain/index.js'
import type {
  ExtraItemRepositoryPort,
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
} from './ports/index.js'

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
    const service = await this.serviceRepository.findById(serviceId)

    if (!service) throw new NotFoundError('Service')

    const role = await this.establishmentRepository.getUserRole(userId, service.establishmentId)

    if (role !== 'OWNER') throw new ForbiddenError('Only owners can create extra items')

    return this.repository.create({
      ...data,
      serviceId,
    })
  }

  async findById(id: string): Promise<ExtraItem> {
    const extraItem = await this.repository.findById(id)

    if (!extraItem) throw new NotFoundError('ExtraItem')

    return extraItem
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
    const extraItem = await this.repository.findByIdWithService(id)

    if (!extraItem) throw new NotFoundError('ExtraItem')

    const role = await this.establishmentRepository.getUserRole(
      userId,
      extraItem.service.establishmentId
    )

    if (role !== 'OWNER') throw new ForbiddenError('Only owners can update extra items')

    return this.repository.update(id, data)
  }

  async delete(id: string, userId: string): Promise<ExtraItem> {
    const extraItem = await this.repository.findByIdWithService(id)

    if (!extraItem) throw new NotFoundError('ExtraItem')

    const role = await this.establishmentRepository.getUserRole(
      userId,
      extraItem.service.establishmentId
    )

    if (role !== 'OWNER') throw new ForbiddenError('Only owners can delete extra items')

    return this.repository.softDelete(id)
  }
}
