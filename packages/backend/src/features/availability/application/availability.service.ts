import type { Availability, CreateAvailabilityData, UpdateAvailabilityData } from '../domain/index.js'
import { ConflictError } from '#shared/domain/index.js'
import type {
  AvailabilityRepositoryPort,
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
} from '#shared/application/ports/index.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'
import { updateWithAuthorization, deleteWithAuthorization, createWithServiceAuthorization } from '#shared/application/services/crud-helpers.js'

export const createAvailabilityService = (deps: {
  repository: AvailabilityRepositoryPort
  serviceRepository: ServiceRepositoryPort
  establishmentRepository: EstablishmentRepositoryPort
}) => ({
  async create(
    serviceId: string,
    data: Omit<CreateAvailabilityData, 'serviceId'>,
    userId: string
  ): Promise<Availability> {
    return createWithServiceAuthorization(serviceId, data, userId, {
      serviceRepository: {
        findById: (id) => deps.serviceRepository.findById(id),
      },
      entityRepository: {
        create: (data) => deps.repository.create(data),
      },
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      getEstablishmentId: (service) => service.establishmentId,
      entityName: 'Availability',
      action: 'create availability slots',
      validateBeforeCreate: async (_service, data) => {
        // Check for overlapping time slots
        const hasOverlap = await deps.repository.checkOverlap(
          serviceId,
          data.date,
          data.startTime,
          data.endTime
        )
        if (hasOverlap) {
          throw new ConflictError('Time slot overlaps with an existing availability')
        }
      },
    })
  },

  async findById(id: string): Promise<Availability> {
    return requireEntity(
      await deps.repository.findById(id),
      'Availability'
    )
  },

  async findByService(
    serviceId: string,
    options: { startDate?: Date; endDate?: Date } = {}
  ): Promise<Availability[]> {
    return deps.repository.findByService(serviceId, options)
  },

  async update(
    id: string,
    data: UpdateAvailabilityData,
    userId: string
  ): Promise<Availability> {
    // We need to get the availability first to validate business rules
    const availability = requireEntity(
      await deps.repository.findByIdWithService(id),
      'Availability'
    )

    // If date or time is being changed, check for overlaps
    if (data.date || data.startTime || data.endTime) {
      const newDate = data.date ?? availability.date
      const newStartTime = data.startTime ?? availability.startTime
      const newEndTime = data.endTime ?? availability.endTime

      const hasOverlap = await deps.repository.checkOverlap(
        availability.serviceId,
        newDate,
        newStartTime,
        newEndTime,
        id // Exclude current availability from check
      )

      if (hasOverlap) {
        throw new ConflictError('Time slot overlaps with an existing availability')
      }
    }

    return updateWithAuthorization(id, data, userId, {
      repository: {
        findByIdWithService: (id) => deps.repository.findByIdWithService(id),
        update: (id, data) => deps.repository.update(id, data),
      },
      entityName: 'Availability',
      getEstablishmentId: (availability: any) => availability.service.establishmentId,
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'update availability slots',
    })
  },

  async delete(id: string, userId: string): Promise<Availability> {
    return deleteWithAuthorization(id, userId, {
      repository: {
        findByIdWithService: (id) => deps.repository.findByIdWithService(id),
        delete: (id) => deps.repository.delete(id),
        hasActiveBookings: (id) => deps.repository.hasActiveBookings(id),
      },
      entityName: 'Availability',
      getEstablishmentId: (availability: any) => availability.service.establishmentId,
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'delete availability slots',
      checkDependencies: true,
      dependencyErrorMessage: 'Cannot delete availability with active bookings',
    })
  },
})

