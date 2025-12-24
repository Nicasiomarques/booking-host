import { api } from '@/lib/api'

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface BookingExtraItem {
  id: string
  extraItemId: string
  name: string
  price: number
  quantity: number
}

export interface Booking {
  id: string
  establishmentId: string
  serviceId: string
  serviceName: string
  availabilitySlotId: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  date: string
  startTime: string
  endTime: string
  status: BookingStatus
  basePrice: number
  totalPrice: number
  extraItems: BookingExtraItem[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface BookingFilters {
  status?: BookingStatus
  startDate?: string
  endDate?: string
  serviceId?: string
}

export interface PaginatedBookings {
  data: Booking[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const bookingService = {
  async getByEstablishment(
    establishmentId: string,
    filters?: BookingFilters,
    page = 1,
    limit = 10
  ): Promise<PaginatedBookings> {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    if (filters?.status) params.append('status', filters.status)
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.serviceId) params.append('serviceId', filters.serviceId)
    const queryString = params.toString()
    return api.get<PaginatedBookings>(
      `/v1/establishments/${establishmentId}/bookings?${queryString}`
    )
  },

  async getById(id: string): Promise<Booking> {
    return api.get<Booking>(`/v1/bookings/${id}`)
  },

  async cancel(id: string): Promise<Booking> {
    return api.post<Booking>(`/v1/bookings/${id}/cancel`)
  },
}
