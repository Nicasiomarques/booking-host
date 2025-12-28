import type { RoomStatus, RoomType } from '#shared/domain/index.js'

export interface CreateRoomData {
  serviceId: string
  number: string
  floor?: number
  description?: string
  capacity?: number
  roomType?: RoomType
  bedType?: string
  amenities?: string[]
  maxOccupancy?: number
}

export interface UpdateRoomData {
  number?: string
  floor?: number
  description?: string
  status?: RoomStatus
  capacity?: number
  roomType?: RoomType
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
  status: RoomStatus
  capacity: number | null
  roomType: RoomType | null
  bedType: string | null
  amenities: string[] | null
  maxOccupancy: number | null
  createdAt: Date
  updatedAt: Date
}

// Domain methods
import type { Either } from '#shared/domain/index.js'
import { ConflictError } from '#shared/domain/index.js'
import { left, right } from '#shared/domain/index.js'

export function roomBelongsToService(room: Room, serviceId: string): boolean {
  return room.serviceId === serviceId
}

export function isRoomAvailable(room: Room): boolean {
  return room.status === 'AVAILABLE'
}

export function canRoomBeBooked(room: Room, serviceId: string): Either<ConflictError, void> {
  if (!roomBelongsToService(room, serviceId)) {
    return left(new ConflictError('Room does not belong to the specified service'))
  }
  if (!isRoomAvailable(room)) {
    return left(new ConflictError(`Room is ${room.status} and cannot be booked`))
  }
  return right(undefined)
}

export function validateRoomNumberUniqueness(
  newNumber: string,
  existingRooms: Room[],
  excludeRoomId?: string
): Either<ConflictError, void> {
  const hasConflict = existingRooms.some((r) => r.number === newNumber && r.id !== excludeRoomId)
  if (hasConflict) {
    return left(new ConflictError(`Room number ${newNumber} already exists for this service`))
  }
  return right(undefined)
}

export function canRoomBeSetToAvailable(hasActiveBookings: boolean): Either<ConflictError, void> {
  if (hasActiveBookings) {
    return left(new ConflictError('Cannot set room to AVAILABLE while it has active bookings'))
  }
  return right(undefined)
}

