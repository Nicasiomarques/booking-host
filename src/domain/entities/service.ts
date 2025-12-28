import type { ServiceType } from './common.js'

export interface CreateServiceData {
  establishmentId: string
  name: string
  description?: string
  basePrice: number
  durationMinutes: number
  capacity?: number
  type?: ServiceType
  images?: string[]
  cancellationPolicy?: string
  minimumAdvanceBooking?: number
  maximumAdvanceBooking?: number
  requiresConfirmation?: boolean
}

export interface UpdateServiceData {
  name?: string
  description?: string
  basePrice?: number
  durationMinutes?: number
  capacity?: number
  active?: boolean
  images?: string[]
  cancellationPolicy?: string
  minimumAdvanceBooking?: number
  maximumAdvanceBooking?: number
  requiresConfirmation?: boolean
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
  images: string[] | null
  cancellationPolicy: string | null
  minimumAdvanceBooking: number | null
  maximumAdvanceBooking: number | null
  requiresConfirmation: boolean
  createdAt: Date
  updatedAt: Date
}
