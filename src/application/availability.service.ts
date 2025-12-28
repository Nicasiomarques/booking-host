import type { Availability, CreateAvailabilityData, UpdateAvailabilityData } from '#domain/index.js'
import { ConflictError } from '#domain/index.js'
import type {
  AvailabilityRepositoryPort,
  ServiceRepositoryPort,
  EstablishmentRepositoryPort,
} from './ports/index.js'
import { requireOwnerRole } from './utils/authorization.helper.js'
import { requireEntity } from './utils/validation.helper.js'

export class AvailabilityService {
  constructor(
    private readonly repository: AvailabilityRepositoryPort,
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort
  ) {}

  async create(
    serviceId: string,
    data: Omit<CreateAvailabilityData, 'serviceId'>,
    userId: string
  ): Promise<Availability> {
    const service = requireEntity(
      await this.serviceRepository.findById(serviceId),
      'Service'
    )

    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      service.establishmentId,
      'create availability slots'
    )

    // Check for overlapping time slots
    const hasOverlap = await this.repository.checkOverlap(
      serviceId,
      data.date,
      data.startTime,
      data.endTime
    )

    if (hasOverlap) throw new ConflictError('Time slot overlaps with an existing availability')

    return this.repository.create({
      ...data,
      serviceId,
    })
  }

  async findById(id: string): Promise<Availability> {
    return requireEntity(
      await this.repository.findById(id),
      'Availability'
    )
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
    const availability = requireEntity(
      await this.repository.findByIdWithService(id),
      'Availability'
    )

    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      availability.service.establishmentId,
      'update availability slots'
    )

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

      if (hasOverlap) throw new ConflictError('Time slot overlaps with an existing availability')
    }

    return this.repository.update(id, data)
  }

  async delete(id: string, userId: string): Promise<Availability> {
    const availability = requireEntity(
      await this.repository.findByIdWithService(id),
      'Availability'
    )

    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      availability.service.establishmentId,
      'delete availability slots'
    )

    const hasBookings = await this.repository.hasActiveBookings(id)

    if (hasBookings) throw new ConflictError('Cannot delete availability with active bookings')

    return this.repository.delete(id)
  }
}
