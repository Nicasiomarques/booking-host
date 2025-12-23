import type { Service, CreateServiceData, UpdateServiceData } from '#domain/index.js'
import { NotFoundError, ForbiddenError, ConflictError } from '#domain/index.js'
import { ServiceRepository, EstablishmentRepository } from '#adapters/outbound/prisma/index.js'

export class ServiceService {
  constructor(
    private readonly repository: ServiceRepository,
    private readonly establishmentRepository: EstablishmentRepository
  ) {}

  async create(
    establishmentId: string,
    data: Omit<CreateServiceData, 'establishmentId'>,
    userId: string
  ): Promise<Service> {
    const role = await this.establishmentRepository.getUserRole(userId, establishmentId)

    if (role !== 'OWNER') {
      throw new ForbiddenError('Only owners can create services')
    }

    return this.repository.create({
      ...data,
      establishmentId,
    })
  }

  async findById(id: string): Promise<Service> {
    const service = await this.repository.findById(id)

    if (!service) {
      throw new NotFoundError('Service')
    }

    return service
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
    const service = await this.repository.findById(id)

    if (!service) {
      throw new NotFoundError('Service')
    }

    const role = await this.establishmentRepository.getUserRole(userId, service.establishmentId)

    if (role !== 'OWNER') {
      throw new ForbiddenError('Only owners can update services')
    }

    return this.repository.update(id, data)
  }

  async delete(id: string, userId: string): Promise<Service> {
    const service = await this.repository.findById(id)

    if (!service) {
      throw new NotFoundError('Service')
    }

    const role = await this.establishmentRepository.getUserRole(userId, service.establishmentId)

    if (role !== 'OWNER') {
      throw new ForbiddenError('Only owners can delete services')
    }

    const hasBookings = await this.repository.hasActiveBookings(id)

    if (hasBookings) {
      throw new ConflictError('Cannot delete service with active bookings')
    }

    return this.repository.softDelete(id)
  }
}
