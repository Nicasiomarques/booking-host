import type {
  Establishment,
  CreateEstablishmentData,
  UpdateEstablishmentData,
  EstablishmentWithRole,
} from '../domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import * as Validation from '#shared/application/utils/validation.helper.js'
import * as CRUD from '#shared/application/services/crud-helpers.js'

export const createEstablishmentService = (deps: {
  repository: Ports.EstablishmentRepositoryPort
}) => ({
  async create(
    data: CreateEstablishmentData,
    userId: string
  ): Promise<Domain.Either<Domain.DomainError, Establishment>> {
    return deps.repository.create(data, userId)
  },

  async findById(id: string): Promise<Domain.Either<Domain.DomainError, Establishment>> {
    const result = await deps.repository.findById(id)
    if (Validation.isLeft(result)) {
      return result
    }
    return Validation.requireEntity(result.value, 'Establishment')
  },

  async findByUserId(userId: string): Promise<Domain.Either<Domain.DomainError, EstablishmentWithRole[]>> {
    return deps.repository.findByUserId(userId)
  },

  async update(
    id: string,
    data: UpdateEstablishmentData,
    userId: string
  ): Promise<Domain.Either<Domain.DomainError, Establishment>> {
    return CRUD.updateWithAuthorization(id, data, userId, {
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

  async getUserRole(userId: string, establishmentId: string): Promise<Domain.Either<Domain.DomainError, Domain.Role | null>> {
    return deps.repository.getUserRole(userId, establishmentId)
  },
})

