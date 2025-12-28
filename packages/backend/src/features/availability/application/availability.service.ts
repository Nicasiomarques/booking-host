import type { Availability, CreateAvailabilityData, UpdateAvailabilityData } from '../domain/index.js'
import { validateAvailabilityTimeRange } from '../domain/index.js'
import { ConflictError } from '#shared/domain/index.js'
import type { DomainError, Either } from '#shared/domain/index.js'
import { left, right, isLeft } from '#shared/domain/index.js'
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
  ): Promise<Either<DomainError, Availability>> {
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
        const timeRangeResult = validateAvailabilityTimeRange(data.startTime, data.endTime)
        if (isLeft(timeRangeResult)) {
          return timeRangeResult
        }

        const overlapResult = await deps.repository.checkOverlap(
          serviceId,
          data.date,
          data.startTime,
          data.endTime
        )
        if (isLeft(overlapResult)) {
          return overlapResult
        }
        if (overlapResult.value) {
          return left(new ConflictError('Time slot overlaps with an existing availability'))
        }
        return right(undefined)
      },
    })
  },

  async findById(id: string): Promise<Either<DomainError, Availability>> {
    const result = await deps.repository.findById(id)
    if (isLeft(result)) {
      return result
    }
    return requireEntity(result.value, 'Availability')
  },

  async findByService(
    serviceId: string,
    options: { startDate?: Date; endDate?: Date } = {}
  ): Promise<Either<DomainError, Availability[]>> {
    return deps.repository.findByService(serviceId, options)
  },

  async update(
    id: string,
    data: UpdateAvailabilityData,
    userId: string
  ): Promise<Either<DomainError, Availability>> {
    const availabilityResult = await deps.repository.findByIdWithService(id)
    if (isLeft(availabilityResult)) {
      return availabilityResult
    }
    const availabilityEither = requireEntity(availabilityResult.value, 'Availability')
    if (isLeft(availabilityEither)) {
      return availabilityEither
    }
    const availability = availabilityEither.value

    if (data.date || data.startTime || data.endTime) {
      const newDate = data.date ?? availability.date
      const newStartTime = data.startTime ?? availability.startTime
      const newEndTime = data.endTime ?? availability.endTime

      const timeRangeResult = validateAvailabilityTimeRange(newStartTime, newEndTime)
      if (isLeft(timeRangeResult)) {
        return timeRangeResult
      }

      const overlapResult = await deps.repository.checkOverlap(
        availability.serviceId,
        newDate,
        newStartTime,
        newEndTime,
        id
      )
      if (isLeft(overlapResult)) {
        return overlapResult
      }
      if (overlapResult.value) {
        return left(new ConflictError('Time slot overlaps with an existing availability'))
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

  async delete(id: string, userId: string): Promise<Either<DomainError, Availability>> {
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

