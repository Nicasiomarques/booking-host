import type {
  Establishment,
  CreateEstablishmentData,
  UpdateEstablishmentData,
  EstablishmentWithRole,
  Role,
} from '#domain/index.js'
import { NotFoundError, ForbiddenError } from '#domain/index.js'
import { EstablishmentRepository } from '#adapters/outbound/prisma/index.js'

export class EstablishmentService {
  constructor(private readonly repository: EstablishmentRepository) {}

  async create(
    data: CreateEstablishmentData,
    userId: string
  ): Promise<Establishment> {
    return this.repository.create(data, userId)
  }

  async findById(id: string): Promise<Establishment> {
    const establishment = await this.repository.findById(id)

    if (!establishment) throw new NotFoundError('Establishment')

    return establishment
  }

  async findByUserId(userId: string): Promise<EstablishmentWithRole[]> {
    return this.repository.findByUserId(userId)
  }

  async update(
    id: string,
    data: UpdateEstablishmentData,
    userId: string
  ): Promise<Establishment> {
    const role = await this.repository.getUserRole(userId, id)

    if (role !== 'OWNER') throw new ForbiddenError('Only owners can update establishments')

    const establishment = await this.repository.findById(id)

    if (!establishment) throw new NotFoundError('Establishment')

    return this.repository.update(id, data)
  }

  async getUserRole(userId: string, establishmentId: string): Promise<Role | null> {
    return this.repository.getUserRole(userId, establishmentId)
  }
}
