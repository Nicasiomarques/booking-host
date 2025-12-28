import type { UserWithRoles, CreateUserData, DomainError, Either } from '#shared/domain/index.js'

/**
 * Port interface for User repository operations
 */
export interface UserRepositoryPort {
  findById(id: string): Promise<Either<DomainError, UserWithRoles | null>>
  findByEmail(email: string): Promise<Either<DomainError, UserWithRoles | null>>
  create(data: CreateUserData): Promise<Either<DomainError, UserWithRoles>>
  update(id: string, data: Partial<{ name: string; passwordHash: string }>): Promise<Either<DomainError, UserWithRoles | null>>
}

