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

export const createEstablishmentService = (deps: {
  repository: EstablishmentRepositoryPort
}) => ({
  async create(
    data: CreateEstablishmentData,
    userId: string
  ): Promise<Establishment> {
    return deps.repository.create(data, userId)
  },

  async findById(id: string): Promise<Establishment> {
    return requireEntity(
      await deps.repository.findById(id),
      'Establishment'
    )
  },

  async findByUserId(userId: string): Promise<EstablishmentWithRole[]> {
    return deps.repository.findByUserId(userId)
  },

  async update(
    id: string,
    data: UpdateEstablishmentData,
    userId: string
  ): Promise<Establishment> {
    return updateWithAuthorization(id, data, userId, {
      repository: {
        findById: (id) => deps.repository.findById(id),
        update: (id, data) => deps.repository.update(id, data),
      },
      entityName: 'Establishment',
      getEstablishmentId: (establishment) => establishment.id,
      getUserRole: (uid, eid) => deps.repository.getUserRole(uid, eid),
      action: 'update establishments',
    })
  },

  async getUserRole(userId: string, establishmentId: string): Promise<Role | null> {
    return deps.repository.getUserRole(userId, establishmentId)
  },
})

