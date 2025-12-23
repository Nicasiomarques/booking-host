import type { Role } from './common.js'

export interface CreateEstablishmentData {
  name: string
  description?: string
  address: string
  timezone?: string
}

export interface UpdateEstablishmentData {
  name?: string
  description?: string
  address?: string
  timezone?: string
  active?: boolean
}

export interface Establishment {
  id: string
  name: string
  description: string | null
  address: string
  timezone: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface EstablishmentWithRole extends Establishment {
  role: Role
}
