import type { Room, CreateRoomData, UpdateRoomData } from '../domain/index.js'
import { ConflictError } from '#shared/domain/index.js'
import type { RoomRepositoryPort, ServiceRepositoryPort, EstablishmentRepositoryPort } from '#shared/application/ports/index.js'
import { requireOwnerRole } from '#shared/application/utils/authorization.helper.js'
import { requireEntity } from '#shared/application/utils/validation.helper.js'

export class RoomService {
  constructor(
    private readonly repository: RoomRepositoryPort,
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort
  ) {}

  async create(serviceId: string, data: Omit<CreateRoomData, 'serviceId'>, userId: string): Promise<Room> {
    const service = requireEntity(
      await this.serviceRepository.findById(serviceId),
      'Service'
    )

    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      service.establishmentId,
      'create rooms'
    )

    // Check if room number already exists for this service
    const existingRooms = await this.repository.findByService(serviceId)
    if (existingRooms.some((r) => r.number === data.number)) {
      throw new ConflictError(`Room number ${data.number} already exists for this service`)
    }

    return this.repository.create({
      ...data,
      serviceId,
    })
  }

  async findById(id: string): Promise<Room> {
    return requireEntity(
      await this.repository.findById(id),
      'Room'
    )
  }

  async findByService(serviceId: string): Promise<Room[]> {
    requireEntity(
      await this.serviceRepository.findById(serviceId),
      'Service'
    )
    return this.repository.findByService(serviceId)
  }

  async update(id: string, data: UpdateRoomData, userId: string): Promise<Room> {
    const room = requireEntity(
      await this.repository.findById(id),
      'Room'
    )

    const service = requireEntity(
      await this.serviceRepository.findById(room.serviceId),
      'Service'
    )

    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      service.establishmentId,
      'update rooms'
    )

    // If updating number, check for conflicts
    if (data.number && data.number !== room.number) {
      const existingRooms = await this.repository.findByService(room.serviceId)
      if (existingRooms.some((r) => r.number === data.number && r.id !== id)) {
        throw new ConflictError(`Room number ${data.number} already exists for this service`)
      }
    }

    // If setting status to AVAILABLE, check if room has active bookings
    if (data.status === 'AVAILABLE') {
      const hasActiveBookings = await this.repository.hasActiveBookings(id)
      if (hasActiveBookings) {
        throw new ConflictError('Cannot set room to AVAILABLE while it has active bookings')
      }
    }

    return this.repository.update(id, data)
  }

  async delete(id: string, userId: string): Promise<Room> {
    const room = requireEntity(
      await this.repository.findById(id),
      'Room'
    )

    const service = requireEntity(
      await this.serviceRepository.findById(room.serviceId),
      'Service'
    )

    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      service.establishmentId,
      'delete rooms'
    )

    // Check if room has active bookings
    const hasActiveBookings = await this.repository.hasActiveBookings(id)
    if (hasActiveBookings) {
      throw new ConflictError('Cannot delete room with active bookings')
    }

    return this.repository.delete(id)
  }
}

