import type { Role } from './common.js'

export interface CreateUserData {
  email: string
  passwordHash: string
  name: string
  phone?: string
  birthDate?: Date
  address?: string
}

export interface UserWithRoles {
  id: string
  email: string
  passwordHash: string
  name: string
  phone: string | null
  birthDate: Date | null
  address: string | null
  createdAt: Date
  updatedAt: Date
  establishmentRoles: Array<{
    establishmentId: string
    role: Role
  }>
}

