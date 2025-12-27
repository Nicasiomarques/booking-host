import type { ServiceType } from './common.js'

export interface CreateServiceData {
  establishmentId: string
  name: string
  description?: string
  basePrice: number
  durationMinutes: number
  capacity?: number
  type?: ServiceType
}

export interface UpdateServiceData {
  name?: string
  description?: string
  basePrice?: number
  durationMinutes?: number
  capacity?: number
  active?: boolean
}

export interface Service {
  id: string
  establishmentId: string
  name: string
  description: string | null
  basePrice: string
  durationMinutes: number
  capacity: number
  type: ServiceType
  active: boolean
  createdAt: Date
  updatedAt: Date
}
