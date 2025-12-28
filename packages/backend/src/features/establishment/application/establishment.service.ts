import type {
  Establishment,
  CreateEstablishmentData,
  UpdateEstablishmentData,
  EstablishmentWithRole,
  Role,
} from '../domain/index.js'
import type { EstablishmentRepositoryPort } from '#shared/application/ports/index.js'
import { requireOwnerRole } from '#shared/application/utils/authorization.helper.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'

export class EstablishmentService {
  constructor(private readonly repository: EstablishmentRepositoryPort) {}

  async create(
    data: CreateEstablishmentData,
    userId: string
  ): Promise<Establishment> {
    return this.repository.create(data, userId)
  }

  async findById(id: string): Promise<Establishment> {
    return requireEntity(
      await this.repository.findById(id),
      'Establishment'
    )
  }

  async findByUserId(userId: string): Promise<EstablishmentWithRole[]> {
    return this.repository.findByUserId(userId)
  }

  async update(
    id: string,
    data: UpdateEstablishmentData,
    userId: string
  ): Promise<Establishment> {
    await requireOwnerRole(
      (uid, eid) => this.repository.getUserRole(uid, eid),
      userId,
      id,
      'update establishments'
    )

    requireEntity(
      await this.repository.findById(id),
      'Establishment'
    )

    return this.repository.update(id, data)
  }

  async getUserRole(userId: string, establishmentId: string): Promise<Role | null> {
    return this.repository.getUserRole(userId, establishmentId)
  }
}

