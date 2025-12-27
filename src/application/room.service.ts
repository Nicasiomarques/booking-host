import type { Room, CreateRoomData, UpdateRoomData } from '#domain/index.js'
import { NotFoundError, ForbiddenError, ConflictError } from '#domain/index.js'
import type { RoomRepositoryPort, ServiceRepositoryPort, EstablishmentRepositoryPort } from './ports/index.js'

export class RoomService {
  constructor(
    private readonly repository: RoomRepositoryPort,
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort
  ) {}

  async create(serviceId: string, data: Omit<CreateRoomData, 'serviceId'>, userId: string): Promise<Room> {
    const service = await this.serviceRepository.findById(serviceId)
    if (!service) throw new NotFoundError('Service')

    const role = await this.establishmentRepository.getUserRole(userId, service.establishmentId)
    if (role !== 'OWNER') throw new ForbiddenError('Only owners can create rooms')

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
    const room = await this.repository.findById(id)
    if (!room) throw new NotFoundError('Room')
    return room
  }

  async findByService(serviceId: string): Promise<Room[]> {
    const service = await this.serviceRepository.findById(serviceId)
    if (!service) throw new NotFoundError('Service')
    return this.repository.findByService(serviceId)
  }

  async update(id: string, data: UpdateRoomData, userId: string): Promise<Room> {
    const room = await this.repository.findById(id)
    if (!room) throw new NotFoundError('Room')

    const service = await this.serviceRepository.findById(room.serviceId)
    if (!service) throw new NotFoundError('Service')

    const role = await this.establishmentRepository.getUserRole(userId, service.establishmentId)
    if (role !== 'OWNER') throw new ForbiddenError('Only owners can update rooms')

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
    const room = await this.repository.findById(id)
    if (!room) throw new NotFoundError('Room')

    const service = await this.serviceRepository.findById(room.serviceId)
    if (!service) throw new NotFoundError('Service')

    const role = await this.establishmentRepository.getUserRole(userId, service.establishmentId)
    if (role !== 'OWNER') throw new ForbiddenError('Only owners can delete rooms')

    // Check if room has active bookings
    const hasActiveBookings = await this.repository.hasActiveBookings(id)
    if (hasActiveBookings) {
      throw new ConflictError('Cannot delete room with active bookings')
    }

    return this.repository.delete(id)
  }
}

