import type * as AvailabilityDomain from '../domain/index.js'
import * as AvailabilityDomainValues from '../domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import * as Validation from '#shared/application/utils/validation.helper.js'
import * as CRUD from '#shared/application/services/crud-helpers.js'

export const createAvailabilityService = (deps: {
  repository: Ports.AvailabilityRepositoryPort
  serviceRepository: Ports.ServiceRepositoryPort
  establishmentRepository: Ports.EstablishmentRepositoryPort
}) => ({
  async create(
    serviceId: string,
    data: Omit<AvailabilityDomain.CreateAvailabilityData, 'serviceId'>,
    userId: string
  ): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>> {
    return CRUD.createWithServiceAuthorization(serviceId, data, userId, {
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
        const timeRangeResult = AvailabilityDomainValues.validateAvailabilityTimeRange(data.startTime, data.endTime)
        if (Validation.isLeft(timeRangeResult)) {
          return timeRangeResult
        }

        const overlapResult = await deps.repository.checkOverlap(
          serviceId,
          data.date,
          data.startTime,
          data.endTime
        )
        if (Validation.isLeft(overlapResult)) {
          return overlapResult
        }
        if (overlapResult.value) {
          return DomainValues.left(new DomainValues.ConflictError('Time slot overlaps with an existing availability'))
        }
        return DomainValues.right(undefined)
      },
    })
  },

  async findById(id: string): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>> {
    const result = await deps.repository.findById(id)
    if (Validation.isLeft(result)) {
      return result
    }
    return Validation.requireEntity(result.value, 'Availability')
  },

  async findByService(
    serviceId: string,
    options: { startDate?: Date; endDate?: Date } = {}
  ): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability[]>> {
    return deps.repository.findByService(serviceId, options)
  },

  async update(
    id: string,
    data: AvailabilityDomain.UpdateAvailabilityData,
    userId: string
  ): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>> {
    const availabilityResult = await deps.repository.findByIdWithService(id)
    if (Validation.isLeft(availabilityResult)) {
      return availabilityResult
    }
    const availabilityEither = Validation.requireEntity(availabilityResult.value, 'Availability')
    if (Validation.isLeft(availabilityEither)) {
      return availabilityEither
    }
    const availability = availabilityEither.value

    if (data.date || data.startTime || data.endTime) {
      const newDate = data.date ?? availability.date
      const newStartTime = data.startTime ?? availability.startTime
      const newEndTime = data.endTime ?? availability.endTime

      const timeRangeResult = AvailabilityDomainValues.validateAvailabilityTimeRange(newStartTime, newEndTime)
      if (Validation.isLeft(timeRangeResult)) {
        return timeRangeResult
      }

      const overlapResult = await deps.repository.checkOverlap(
        availability.serviceId,
        newDate,
        newStartTime,
        newEndTime,
        id
      )
      if (Validation.isLeft(overlapResult)) {
        return overlapResult
      }
      if (overlapResult.value) {
        return DomainValues.left(new DomainValues.ConflictError('Time slot overlaps with an existing availability'))
      }
    }

    return CRUD.updateWithAuthorization(id, data, userId, {
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

  async delete(id: string, userId: string): Promise<Domain.Either<Domain.DomainError, AvailabilityDomain.Availability>> {
    return CRUD.deleteWithAuthorization(id, userId, {
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

