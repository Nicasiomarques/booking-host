import type * as Domain from '#shared/domain/index.js'

export interface CreateEstablishmentData {
  name: string
  description?: string
  address: string
  timezone?: string
  phone?: string
  email?: string
  city?: string
  state?: string
  website?: string
  taxId?: string
}

export interface UpdateEstablishmentData {
  name?: string
  description?: string
  address?: string
  timezone?: string
  active?: boolean
  phone?: string
  email?: string
  city?: string
  state?: string
  website?: string
  taxId?: string
}

export interface Establishment {
  id: string
  name: string
  description: string | null
  address: string
  timezone: string
  active: boolean
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  website: string | null
  taxId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface EstablishmentWithRole extends Establishment {
  role: Domain.Role
}

