import type * as Domain from '#shared/domain/index.js'

export interface CreateServiceData {
  establishmentId: string
  name: string
  description?: string
  basePrice: number
  durationMinutes: number
  capacity?: number
  type?: Domain.ServiceType
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
  type: Domain.ServiceType
  active: boolean
  images: string[] | null
  cancellationPolicy: string | null
  minimumAdvanceBooking: number | null
  maximumAdvanceBooking: number | null
  requiresConfirmation: boolean
  createdAt: Date
  updatedAt: Date
}

// Domain methods
import * as DomainValues from '#shared/domain/index.js'

export function isServiceActive(service: Service): boolean {
  return service.active
}

export function isServiceHotel(service: Service): boolean {
  return service.type === 'HOTEL'
}

export function canServiceBeBooked(service: Service): Domain.Either<DomainValues.ConflictError, void> {
  if (!isServiceActive(service)) {
    return DomainValues.left(new DomainValues.ConflictError('Service is not active'))
  }
  return DomainValues.right(undefined)
}

