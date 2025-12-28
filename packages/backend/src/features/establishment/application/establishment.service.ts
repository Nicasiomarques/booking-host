import type {
  Establishment,
  CreateEstablishmentData,
  UpdateEstablishmentData,
  EstablishmentWithRole,
} from '../domain/index.js'
import type { Role } from '#shared/domain/index.js'
import type { EstablishmentRepositoryPort } from '#shared/application/ports/index.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'
import { updateWithAuthorization } from '#shared/application/services/crud-helpers.js'

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
    return updateWithAuthorization(id, data, userId, {
      repository: {
        findById: (id) => this.repository.findById(id),
        update: (id, data) => this.repository.update(id, data),
      },
      entityName: 'Establishment',
      getEstablishmentId: (establishment) => establishment.id,
      getUserRole: (uid, eid) => this.repository.getUserRole(uid, eid),
      action: 'update establishments',
    })
  }

  async getUserRole(userId: string, establishmentId: string): Promise<Role | null> {
    return this.repository.getUserRole(userId, establishmentId)
  }
}

