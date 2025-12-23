import type { Availability, CreateAvailabilityData, UpdateAvailabilityData } from '../domain/entities/index.js'
import { AvailabilityRepository } from '../adapters/outbound/prisma/availability.repository.js'
import { ServiceRepository } from '../adapters/outbound/prisma/service.repository.js'
import { EstablishmentRepository } from '../adapters/outbound/prisma/establishment.repository.js'
import { NotFoundError, ForbiddenError, ConflictError } from '../domain/errors.js'

export class AvailabilityService {
  constructor(
    private readonly repository: AvailabilityRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly establishmentRepository: EstablishmentRepository
  ) {}

  async create(
    serviceId: string,
    data: Omit<CreateAvailabilityData, 'serviceId'>,
    userId: string
  ): Promise<Availability> {
    const service = await this.serviceRepository.findById(serviceId)

    if (!service) {
      throw new NotFoundError('Service')
    }

    const role = await this.establishmentRepository.getUserRole(userId, service.establishmentId)

    if (role !== 'OWNER') {
      throw new ForbiddenError('Only owners can create availability slots')
    }

    // Check for overlapping time slots
    const hasOverlap = await this.repository.checkOverlap(
      serviceId,
      data.date,
      data.startTime,
      data.endTime
    )

    if (hasOverlap) {
      throw new ConflictError('Time slot overlaps with an existing availability')
    }

    return this.repository.create({
      ...data,
      serviceId,
    })
  }

  async findById(id: string): Promise<Availability> {
    const availability = await this.repository.findById(id)

    if (!availability) {
      throw new NotFoundError('Availability')
    }

    return availability
  }

  async findByService(
    serviceId: string,
    options: { startDate?: Date; endDate?: Date } = {}
  ): Promise<Availability[]> {
    return this.repository.findByService(serviceId, options)
  }

  async update(
    id: string,
    data: UpdateAvailabilityData,
    userId: string
  ): Promise<Availability> {
    const availability = await this.repository.findByIdWithService(id)

    if (!availability) {
      throw new NotFoundError('Availability')
    }

    const role = await this.establishmentRepository.getUserRole(
      userId,
      availability.service.establishmentId
    )

    if (role !== 'OWNER') {
      throw new ForbiddenError('Only owners can update availability slots')
    }

    // If date or time is being changed, check for overlaps
    if (data.date || data.startTime || data.endTime) {
      const newDate = data.date ?? availability.date
      const newStartTime = data.startTime ?? availability.startTime
      const newEndTime = data.endTime ?? availability.endTime

      const hasOverlap = await this.repository.checkOverlap(
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

    return this.repository.update(id, data)
  }

  async delete(id: string, userId: string): Promise<Availability> {
    const availability = await this.repository.findByIdWithService(id)

    if (!availability) {
      throw new NotFoundError('Availability')
    }

    const role = await this.establishmentRepository.getUserRole(
      userId,
      availability.service.establishmentId
    )

    if (role !== 'OWNER') {
      throw new ForbiddenError('Only owners can delete availability slots')
    }

    const hasBookings = await this.repository.hasActiveBookings(id)

    if (hasBookings) {
      throw new ConflictError('Cannot delete availability with active bookings')
    }

    return this.repository.delete(id)
  }
}
