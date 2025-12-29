import type * as Domain from '#shared/domain/index.js'

export interface UserRepositoryPort {
  findById(id: string): Promise<Domain.Either<Domain.DomainError, Domain.UserWithRoles | null>>
  findByEmail(email: string): Promise<Domain.Either<Domain.DomainError, Domain.UserWithRoles | null>>
  create(data: Domain.CreateUserData): Promise<Domain.Either<Domain.DomainError, Domain.UserWithRoles>>
  update(id: string, data: Partial<{ name: string; passwordHash: string }>): Promise<Domain.Either<Domain.DomainError, Domain.UserWithRoles | null>>
}

