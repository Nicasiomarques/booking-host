export type Role = 'OWNER' | 'STAFF'

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW'

export type ServiceType = 'SERVICE' | 'HOTEL'

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' | 'BLOCKED'

export type RoomType = 'SINGLE' | 'DOUBLE' | 'TWIN' | 'SUITE' | 'FAMILY' | 'OTHER'

export interface EstablishmentRole {
  establishmentId: string
  role: Role
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ListOptions {
  page?: number
  limit?: number
}

