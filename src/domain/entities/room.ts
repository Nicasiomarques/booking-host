import type { RoomStatus } from './common.js'

export interface CreateRoomData {
  serviceId: string
  number: string
  floor?: number
  description?: string
}

export interface UpdateRoomData {
  number?: string
  floor?: number
  description?: string
  status?: RoomStatus
}

export interface Room {
  id: string
  serviceId: string
  number: string
  floor: number | null
  description: string | null
  status: RoomStatus
  createdAt: Date
  updatedAt: Date
}
