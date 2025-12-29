import type * as Domain from '#shared/domain/index.js'

export interface CreateRoomData {
  serviceId: string
  number: string
  floor?: number
  description?: string
  capacity?: number
  roomType?: Domain.RoomType
  bedType?: string
  amenities?: string[]
  maxOccupancy?: number
}

export interface UpdateRoomData {
  number?: string
  floor?: number
  description?: string
  status?: Domain.RoomStatus
  capacity?: number
  roomType?: Domain.RoomType
  bedType?: string
  amenities?: string[]
  maxOccupancy?: number
}

export interface Room {
  id: string
  serviceId: string
  number: string
  floor: number | null
  description: string | null
  status: Domain.RoomStatus
  capacity: number | null
  roomType: Domain.RoomType | null
  bedType: string | null
  amenities: string[] | null
  maxOccupancy: number | null
  createdAt: Date
  updatedAt: Date
}

// Domain methods
import * as DomainValues from '#shared/domain/index.js'

export function roomBelongsToService(room: Room, serviceId: string): boolean {
  return room.serviceId === serviceId
}

export function isRoomAvailable(room: Room): boolean {
  return room.status === 'AVAILABLE'
}

export function canRoomBeBooked(room: Room, serviceId: string): Domain.Either<DomainValues.ConflictError, void> {
  if (!roomBelongsToService(room, serviceId)) {
    return DomainValues.left(new DomainValues.ConflictError('Room does not belong to the specified service'))
  }
  if (!isRoomAvailable(room)) {
    return DomainValues.left(new DomainValues.ConflictError(`Room is ${room.status} and cannot be booked`))
  }
  return DomainValues.right(undefined)
}

export function validateRoomNumberUniqueness(
  newNumber: string,
  existingRooms: Room[],
  excludeRoomId?: string
): Domain.Either<DomainValues.ConflictError, void> {
  const hasConflict = existingRooms.some((r) => r.number === newNumber && r.id !== excludeRoomId)
  if (hasConflict) {
    return DomainValues.left(new DomainValues.ConflictError(`Room number ${newNumber} already exists for this service`))
  }
  return DomainValues.right(undefined)
}

export function canRoomBeSetToAvailable(hasActiveBookings: boolean): Domain.Either<DomainValues.ConflictError, void> {
  if (hasActiveBookings) {
    return DomainValues.left(new DomainValues.ConflictError('Cannot set room to AVAILABLE while it has active bookings'))
  }
  return DomainValues.right(undefined)
}

