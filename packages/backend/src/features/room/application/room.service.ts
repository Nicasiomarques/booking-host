import type * as RoomDomain from '../domain/index.js'
import * as RoomDomainValues from '../domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import * as Validation from '#shared/application/utils/validation.helper.js'
import * as CRUD from '#shared/application/services/crud-helpers.js'

export const createRoomService = (deps: {
  repository: Ports.RoomRepositoryPort
  serviceRepository: Ports.ServiceRepositoryPort
  establishmentRepository: Ports.EstablishmentRepositoryPort
}) => ({
  async create(serviceId: string, data: Omit<RoomDomain.CreateRoomData, 'serviceId'>, userId: string): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>> {
    return CRUD.createWithServiceAuthorization(serviceId, data, userId, {
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
        if (Validation.isLeft(roomsResult)) {
          return roomsResult
        }
        return RoomDomainValues.validateRoomNumberUniqueness(data.number, roomsResult.value)
      },
    })
  },

  async findById(id: string): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>> {
    const result = await deps.repository.findById(id)
    if (Validation.isLeft(result)) {
      return result
    }
    return Validation.requireEntity(result.value, 'Room')
  },

  async findByService(serviceId: string): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room[]>> {
    const serviceResult = await deps.serviceRepository.findById(serviceId)
    if (Validation.isLeft(serviceResult)) {
      return serviceResult
    }
    const serviceEither = Validation.requireEntity(serviceResult.value, 'Service')
    if (Validation.isLeft(serviceEither)) {
      return serviceEither
    }
    return deps.repository.findByService(serviceId)
  },

  async update(id: string, data: RoomDomain.UpdateRoomData, userId: string): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>> {
    const roomResult = await deps.repository.findById(id)
    if (Validation.isLeft(roomResult)) {
      return roomResult
    }
    const roomEither = Validation.requireEntity(roomResult.value, 'Room')
    if (Validation.isLeft(roomEither)) {
      return roomEither
    }
    const room = roomEither.value

    const serviceResult = await deps.serviceRepository.findById(room.serviceId)
    if (Validation.isLeft(serviceResult)) {
      return serviceResult
    }
    const serviceEither = Validation.requireEntity(serviceResult.value, 'Service')
    if (Validation.isLeft(serviceEither)) {
      return serviceEither
    }

    if (data.number && data.number !== room.number) {
      const roomsResult = await deps.repository.findByService(room.serviceId)
      if (Validation.isLeft(roomsResult)) {
        return roomsResult
      }
      const uniquenessResult = RoomDomainValues.validateRoomNumberUniqueness(data.number, roomsResult.value, id)
      if (Validation.isLeft(uniquenessResult)) {
        return uniquenessResult
      }
    }

    if (data.status === 'AVAILABLE') {
      const bookingsResult = await deps.repository.hasActiveBookings(id)
      if (Validation.isLeft(bookingsResult)) {
        return bookingsResult
      }
      const canSetAvailableResult = RoomDomainValues.canRoomBeSetToAvailable(bookingsResult.value)
      if (Validation.isLeft(canSetAvailableResult)) {
        return canSetAvailableResult
      }
    }

    return CRUD.updateWithAuthorization(id, data, userId, {
      repository: {
        findById: (id) => deps.repository.findById(id),
        update: (id, data) => deps.repository.update(id, data),
      },
      entityName: 'Room',
      getEstablishmentId: async (room) => {
        const serviceResult = await deps.serviceRepository.findById(room.serviceId)
        if (Validation.isLeft(serviceResult)) {
          return serviceResult
        }
        const serviceEither = Validation.requireEntity(serviceResult.value, 'Service')
        if (Validation.isLeft(serviceEither)) {
          return serviceEither
        }
        return DomainValues.right(serviceEither.value.establishmentId)
      },
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'update rooms',
    })
  },

  async delete(id: string, userId: string): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>> {
    const roomResult = await deps.repository.findById(id)
    if (Validation.isLeft(roomResult)) {
      return roomResult
    }
    const roomEither = Validation.requireEntity(roomResult.value, 'Room')
    if (Validation.isLeft(roomEither)) {
      return roomEither
    }
    const room = roomEither.value

    const serviceResult = await deps.serviceRepository.findById(room.serviceId)
    if (Validation.isLeft(serviceResult)) {
      return serviceResult
    }
    const serviceEither = Validation.requireEntity(serviceResult.value, 'Service')
    if (Validation.isLeft(serviceEither)) {
      return serviceEither
    }

    return CRUD.deleteWithAuthorization(id, userId, {
      repository: {
        findById: (id) => deps.repository.findById(id),
        delete: (id) => deps.repository.delete(id),
        hasActiveBookings: (id) => deps.repository.hasActiveBookings(id),
      },
      entityName: 'Room',
      getEstablishmentId: async (room) => {
        const serviceResult = await deps.serviceRepository.findById(room.serviceId)
        if (Validation.isLeft(serviceResult)) {
          return serviceResult
        }
        const serviceEither = Validation.requireEntity(serviceResult.value, 'Service')
        if (Validation.isLeft(serviceEither)) {
          return serviceEither
        }
        return DomainValues.right(serviceEither.value.establishmentId)
      },
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'delete rooms',
      checkDependencies: true,
      dependencyErrorMessage: 'Cannot delete room with active bookings',
    })
  },
})

