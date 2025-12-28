import type { Service, CreateServiceData, UpdateServiceData } from '#domain/index.js'
import { ConflictError } from '#domain/index.js'
import type { ServiceRepositoryPort, EstablishmentRepositoryPort } from './ports/index.js'
import { requireOwnerRole } from './utils/authorization.helper.js'
import { requireEntity } from './utils/validation.helper.js'

export class ServiceService {
  constructor(
    private readonly repository: ServiceRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort
  ) {}

  async create(
    establishmentId: string,
    data: Omit<CreateServiceData, 'establishmentId'>,
    userId: string
  ): Promise<Service> {
    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      establishmentId,
      'create services'
    )

    return this.repository.create({
      ...data,
      establishmentId,
    })
  }

  async findById(id: string): Promise<Service> {
    return requireEntity(
      await this.repository.findById(id),
      'Service'
    )
  }

  async findByEstablishment(
    establishmentId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Service[]> {
    return this.repository.findByEstablishment(establishmentId, options)
  }

  async update(
    id: string,
    data: UpdateServiceData,
    userId: string
  ): Promise<Service> {
    const service = requireEntity(
      await this.repository.findById(id),
      'Service'
    )

    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      service.establishmentId,
      'update services'
    )

    return this.repository.update(id, data)
  }

  async delete(id: string, userId: string): Promise<Service> {
    const service = requireEntity(
      await this.repository.findById(id),
      'Service'
    )

    await requireOwnerRole(
      (uid, eid) => this.establishmentRepository.getUserRole(uid, eid),
      userId,
      service.establishmentId,
      'delete services'
    )

    const hasBookings = await this.repository.hasActiveBookings(id)

    if (hasBookings) throw new ConflictError('Cannot delete service with active bookings')

    return this.repository.softDelete(id)
  }
}
