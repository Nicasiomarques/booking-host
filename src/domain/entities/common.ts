export type Role = 'OWNER' | 'STAFF'

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

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
