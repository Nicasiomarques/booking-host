import type { Room, CreateRoomData, UpdateRoomData } from '../domain/index.js'
import { ConflictError } from '#shared/domain/index.js'
import type { RoomRepositoryPort, ServiceRepositoryPort, EstablishmentRepositoryPort } from '#shared/application/ports/index.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'
import { updateWithAuthorization, deleteWithAuthorization, createWithServiceAuthorization } from '#shared/application/services/crud-helpers.js'

export const createRoomService = (deps: {
  repository: RoomRepositoryPort
  serviceRepository: ServiceRepositoryPort
  establishmentRepository: EstablishmentRepositoryPort
}) => ({
  async create(serviceId: string, data: Omit<CreateRoomData, 'serviceId'>, userId: string): Promise<Room> {
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
        // Check if room number already exists for this service
        const existingRooms = await deps.repository.findByService(serviceId)
        if (existingRooms.some((r) => r.number === data.number)) {
          throw new ConflictError(`Room number ${data.number} already exists for this service`)
        }
      },
    })
  },

  async findById(id: string): Promise<Room> {
    return requireEntity(
      await deps.repository.findById(id),
      'Room'
    )
  },

  async findByService(serviceId: string): Promise<Room[]> {
    requireEntity(
      await deps.serviceRepository.findById(serviceId),
      'Service'
    )
    return deps.repository.findByService(serviceId)
  },

  async update(id: string, data: UpdateRoomData, userId: string): Promise<Room> {
    // We need to get the room first to validate business rules
    const room = requireEntity(
      await deps.repository.findById(id),
      'Room'
    )

    requireEntity(
      await deps.serviceRepository.findById(room.serviceId),
      'Service'
    )

    // If updating number, check for conflicts
    if (data.number && data.number !== room.number) {
      const existingRooms = await deps.repository.findByService(room.serviceId)
      if (existingRooms.some((r) => r.number === data.number && r.id !== id)) {
        throw new ConflictError(`Room number ${data.number} already exists for this service`)
      }
    }

    // If setting status to AVAILABLE, check if room has active bookings
    if (data.status === 'AVAILABLE') {
      const hasActiveBookings = await deps.repository.hasActiveBookings(id)
      if (hasActiveBookings) {
        throw new ConflictError('Cannot set room to AVAILABLE while it has active bookings')
      }
    }

    return updateWithAuthorization(id, data, userId, {
      repository: {
        findById: (id) => deps.repository.findById(id),
        update: (id, data) => deps.repository.update(id, data),
      },
      entityName: 'Room',
      getEstablishmentId: async (room) => {
        // Room doesn't have establishmentId directly, need to fetch service
        const roomService = await deps.serviceRepository.findById(room.serviceId)
        if (!roomService) {
          throw new Error('Service not found for room')
        }
        return roomService.establishmentId
      },
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'update rooms',
    })
  },

  async delete(id: string, userId: string): Promise<Room> {
    const room = requireEntity(
      await deps.repository.findById(id),
      'Room'
    )

    requireEntity(
      await deps.serviceRepository.findById(room.serviceId),
      'Service'
    )

    return deleteWithAuthorization(id, userId, {
      repository: {
        findById: (id) => deps.repository.findById(id),
        delete: (id) => deps.repository.delete(id),
        hasActiveBookings: (id) => deps.repository.hasActiveBookings(id),
      },
      entityName: 'Room',
      getEstablishmentId: async (room) => {
        // Room doesn't have establishmentId directly, need to fetch service
        const roomService = await deps.serviceRepository.findById(room.serviceId)
        if (!roomService) {
          throw new Error('Service not found for room')
        }
        return roomService.establishmentId
      },
      getUserRole: (uid, eid) => deps.establishmentRepository.getUserRole(uid, eid),
      action: 'delete rooms',
      checkDependencies: true,
      dependencyErrorMessage: 'Cannot delete room with active bookings',
    })
  },
})

