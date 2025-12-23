import type { UserWithRoles } from '#domain/index.js'

/**
 * Port interface for User repository operations
 */
export interface UserRepositoryPort {
  findById(id: string): Promise<UserWithRoles | null>
  findByEmail(email: string): Promise<UserWithRoles | null>
  create(data: { email: string; passwordHash: string; name: string }): Promise<UserWithRoles>
  update(id: string, data: Partial<{ name: string; passwordHash: string }>): Promise<UserWithRoles | null>
}
