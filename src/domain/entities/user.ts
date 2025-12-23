import type { Role } from './common.js'

export interface CreateUserData {
  email: string
  passwordHash: string
  name: string
}

export interface UserWithRoles {
  id: string
  email: string
  passwordHash: string
  name: string
  createdAt: Date
  updatedAt: Date
  establishmentRoles: Array<{
    establishmentId: string
    role: Role
  }>
}
