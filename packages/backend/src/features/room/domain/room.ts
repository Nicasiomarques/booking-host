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

