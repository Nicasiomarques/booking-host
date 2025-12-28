import type { Room, CreateRoomData, UpdateRoomData } from '../domain/index.js'
import { validateRoomNumberUniqueness, canRoomBeSetToAvailable } from '../domain/index.js'
import type { DomainError, Either } from '#shared/domain/index.js'
import { isLeft, right } from '#shared/domain/index.js'
import type { RoomRepositoryPort, ServiceRepositoryPort, EstablishmentRepositoryPort } from '#shared/application/ports/index.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'
import { updateWithAuthorization, deleteWithAuthorization, createWithServiceAuthorization } from '#shared/application/services/crud-helpers.js'

export const createRoomService = (deps: {
  repository: RoomRepositoryPort
  serviceRepository: ServiceRepositoryPort
  establishmentRepository: EstablishmentRepositoryPort
}) => ({
  async create(serviceId: string, data: Omit<CreateRoomData, 'serviceId'>, userId: string): Promise<Either<DomainError, Room>> {
    return createWithServiceAuthorization(serviceId, data, userId, {
      serviceRepository: {
        findById: (id) => deps.serviceRepository.findById(id),
      },
      entityRepository: {
        create: (data) => deps.repository.create(data),
      },
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      getEstablishmentId: (service) => service.establishmentId,
      entityName: 'Room',
      action: 'create rooms',
      validateBeforeCreate: async (_service, data) => {
        const roomsResult = await deps.repository.findByService(serviceId)
        if (isLeft(roomsResult)) {
          return roomsResult
        }
        return validateRoomNumberUniqueness(data.number, roomsResult.value)
      },
    })
  },

  async findById(id: string): Promise<Either<DomainError, Room>> {
    const result = await deps.repository.findById(id)
    if (isLeft(result)) {
      return result
    }
    return requireEntity(result.value, 'Room')
  },

  async findByService(serviceId: string): Promise<Either<DomainError, Room[]>> {
    const serviceResult = await deps.serviceRepository.findById(serviceId)
    if (isLeft(serviceResult)) {
      return serviceResult
    }
    const serviceEither = requireEntity(serviceResult.value, 'Service')
    if (isLeft(serviceEither)) {
      return serviceEither
    }
    return deps.repository.findByService(serviceId)
  },

  async update(id: string, data: UpdateRoomData, userId: string): Promise<Either<DomainError, Room>> {
    const roomResult = await deps.repository.findById(id)
    if (isLeft(roomResult)) {
      return roomResult
    }
    const roomEither = requireEntity(roomResult.value, 'Room')
    if (isLeft(roomEither)) {
      return roomEither
    }
    const room = roomEither.value

    const serviceResult = await deps.serviceRepository.findById(room.serviceId)
    if (isLeft(serviceResult)) {
      return serviceResult
    }
    const serviceEither = requireEntity(serviceResult.value, 'Service')
    if (isLeft(serviceEither)) {
      return serviceEither
    }

    if (data.number && data.number !== room.number) {
      const roomsResult = await deps.repository.findByService(room.serviceId)
      if (isLeft(roomsResult)) {
        return roomsResult
      }
      const uniquenessResult = validateRoomNumberUniqueness(data.number, roomsResult.value, id)
      if (isLeft(uniquenessResult)) {
        return uniquenessResult
      }
    }

    if (data.status === 'AVAILABLE') {
      const bookingsResult = await deps.repository.hasActiveBookings(id)
      if (isLeft(bookingsResult)) {
        return bookingsResult
      }
      const canSetAvailableResult = canRoomBeSetToAvailable(bookingsResult.value)
      if (isLeft(canSetAvailableResult)) {
        return canSetAvailableResult
      }
    }

    return updateWithAuthorization(id, data, userId, {
      repository: {
        findById: (id) => deps.repository.findById(id),
        update: (id, data) => deps.repository.update(id, data),
      },
      entityName: 'Room',
      getEstablishmentId: async (room) => {
        const serviceResult = await deps.serviceRepository.findById(room.serviceId)
        if (isLeft(serviceResult)) {
          return serviceResult
        }
        const serviceEither = requireEntity(serviceResult.value, 'Service')
        if (isLeft(serviceEither)) {
          return serviceEither
        }
        return right(serviceEither.value.establishmentId)
      },
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'update rooms',
    })
  },

  async delete(id: string, userId: string): Promise<Either<DomainError, Room>> {
    const roomResult = await deps.repository.findById(id)
    if (isLeft(roomResult)) {
      return roomResult
    }
    const roomEither = requireEntity(roomResult.value, 'Room')
    if (isLeft(roomEither)) {
      return roomEither
    }
    const room = roomEither.value

    const serviceResult = await deps.serviceRepository.findById(room.serviceId)
    if (isLeft(serviceResult)) {
      return serviceResult
    }
    const serviceEither = requireEntity(serviceResult.value, 'Service')
    if (isLeft(serviceEither)) {
      return serviceEither
    }

    return deleteWithAuthorization(id, userId, {
      repository: {
        findById: (id) => deps.repository.findById(id),
        delete: (id) => deps.repository.delete(id),
        hasActiveBookings: (id) => deps.repository.hasActiveBookings(id),
      },
      entityName: 'Room',
      getEstablishmentId: async (room) => {
        const serviceResult = await deps.serviceRepository.findById(room.serviceId)
        if (isLeft(serviceResult)) {
          return serviceResult
        }
        const serviceEither = requireEntity(serviceResult.value, 'Service')
        if (isLeft(serviceEither)) {
          return serviceEither
        }
        return right(serviceEither.value.establishmentId)
      },
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'delete rooms',
      checkDependencies: true,
      dependencyErrorMessage: 'Cannot delete room with active bookings',
    })
  },
})

