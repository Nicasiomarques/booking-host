import type { Service, CreateServiceData, UpdateServiceData } from '../domain/index.js'
import type { ServiceRepositoryPort, EstablishmentRepositoryPort } from '#shared/application/ports/index.js'
import { requireOwnerRole } from '#shared/application/utils/authorization.helper.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'
import { updateWithAuthorization, deleteWithAuthorization } from '#shared/application/services/crud-helpers.js'

export const createServiceService = (deps: {
  repository: ServiceRepositoryPort
  establishmentRepository: EstablishmentRepositoryPort
}) => ({
  async create(
    establishmentId: string,
    data: Omit<CreateServiceData, 'establishmentId'>,
    userId: string
  ): Promise<Service> {
    await requireOwnerRole(
      (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      userId,
      establishmentId,
      'create services'
    )

    return deps.repository.create({
      ...data,
      establishmentId,
    })
  },

  async findById(id: string): Promise<Service> {
    return requireEntity(
      await deps.repository.findById(id),
      'Service'
    )
  },

  async findByEstablishment(
    establishmentId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Service[]> {
    return deps.repository.findByEstablishment(establishmentId, options)
  },

  async update(
    id: string,
    data: UpdateServiceData,
    userId: string
  ): Promise<Service> {
    return updateWithAuthorization(id, data, userId, {
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

  async delete(id: string, userId: string): Promise<Service> {
    return deleteWithAuthorization(id, userId, {
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

