export interface CreateAvailabilityData {
  serviceId: string
  date: Date
  startTime: string
  endTime: string
  capacity: number
  price?: number
  notes?: string
  isRecurring?: boolean
}

export interface UpdateAvailabilityData {
  date?: Date
  startTime?: string
  endTime?: string
  capacity?: number
  price?: number
  notes?: string
  isRecurring?: boolean
}

export interface Availability {
  id: string
  serviceId: string
  date: Date
  startTime: string
  endTime: string
  capacity: number
  price: string | null
  notes: string | null
  isRecurring: boolean
  createdAt: Date
  updatedAt: Date
}

// Domain methods
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'

export function availabilityBelongsToService(availability: Availability, serviceId: string): boolean {
  return availability.serviceId === serviceId
}

export function availabilityHasCapacity(availability: Availability, quantity: number): Domain.Either<DomainValues.ConflictError, void> {
  if (availability.capacity < quantity) {
    return DomainValues.left(new DomainValues.ConflictError('No available capacity for the requested quantity'))
  }
  return DomainValues.right(undefined)
}

export function validateAvailabilityTimeRange(startTime: string, endTime: string): Domain.Either<DomainValues.ConflictError, void> {
  if (startTime >= endTime) {
    return DomainValues.left(new DomainValues.ConflictError('Start time must be before end time'))
  }
  return DomainValues.right(undefined)
}

