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
import type { Either } from '#shared/domain/index.js'
import { ConflictError } from '#shared/domain/index.js'
import { left, right } from '#shared/domain/index.js'

export function availabilityBelongsToService(availability: Availability, serviceId: string): boolean {
  return availability.serviceId === serviceId
}

export function availabilityHasCapacity(availability: Availability, quantity: number): Either<ConflictError, void> {
  if (availability.capacity < quantity) {
    return left(new ConflictError('No available capacity for the requested quantity'))
  }
  return right(undefined)
}

export function validateAvailabilityTimeRange(startTime: string, endTime: string): Either<ConflictError, void> {
  if (startTime >= endTime) {
    return left(new ConflictError('Start time must be before end time'))
  }
  return right(undefined)
}

