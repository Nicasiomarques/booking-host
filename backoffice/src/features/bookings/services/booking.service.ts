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

// API Response interfaces (what the API actually returns)
interface ApiBookingExtraItem {
  id: string
  extraItemId: string
  quantity: number
  priceAtBooking: number
  extraItem: {
    name: string
  }
}

interface ApiBooking {
  id: string
  userId: string
  establishmentId: string
  serviceId: string
  availabilityId: string
  quantity: number
  totalPrice: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  service: {
    name: string
    durationMinutes: number
    basePrice?: number
  }
  availability: {
    date: string
    startTime: string
    endTime: string
  }
  user?: {
    name?: string
    email?: string
  }
  extras: ApiBookingExtraItem[]
}

interface ApiPaginatedBookings {
  data: ApiBooking[]
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  // Fallback for direct structure (if backend doesn't use meta)
  total?: number
  page?: number
  limit?: number
}

// Transform API booking to frontend Booking
function transformBooking(apiBooking: ApiBooking): Booking {
  // Format date from Date object or string to YYYY-MM-DD format
  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return ''
    if (typeof date === 'string') {
      // If it's already a string, try to parse it
      // Handle ISO strings like "2025-01-20T00:00:00.000Z" or simple dates like "2025-01-20"
      if (date.includes('T')) {
        return date.split('T')[0]
      }
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date
      }
      // Try to parse and format
      const d = new Date(date)
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0]
      }
      return date
    }
    return date.toISOString().split('T')[0]
  }

  try {
    const transformedExtraItems = (apiBooking.extras || []).map((item) => {
      const extraItem = {
        id: item.id || item.extraItemId || '',
        extraItemId: item.extraItemId || item.id || '',
        name: item.extraItem?.name || 'Unknown Extra',
        price: item.priceAtBooking || 0,
        quantity: item.quantity || 0,
      }
      console.log('Transformed extra item:', extraItem, 'from:', item)
      return extraItem
    })
    
    console.log('Booking extras:', apiBooking.extras, 'Transformed:', transformedExtraItems)
    
    return {
      id: apiBooking.id,
      establishmentId: apiBooking.establishmentId,
      serviceId: apiBooking.serviceId,
      serviceName: apiBooking.service?.name ?? 'Unknown Service',
      availabilitySlotId: apiBooking.availabilityId,
      customerName: apiBooking.user?.name ?? 'Unknown Customer',
      customerEmail: apiBooking.user?.email ?? '',
      customerPhone: null,
      date: formatDate(apiBooking.availability?.date ?? ''),
      startTime: apiBooking.availability?.startTime ?? '',
      endTime: apiBooking.availability?.endTime ?? '',
      status: apiBooking.status as BookingStatus,
      basePrice: apiBooking.service?.basePrice ?? 0,
      totalPrice: apiBooking.totalPrice,
      extraItems: transformedExtraItems,
      notes: null,
      createdAt: apiBooking.createdAt,
      updatedAt: apiBooking.updatedAt,
    }
  } catch (error) {
    console.error('Error transforming booking:', error, apiBooking)
    throw error
  }
}

// Transform API paginated response to frontend format
function transformPaginatedBookings(apiResponse: ApiPaginatedBookings): PaginatedBookings {
  try {
    // Handle both formats: with meta object or flat structure
    const total = apiResponse.meta?.total ?? apiResponse.total ?? 0
    const page = apiResponse.meta?.page ?? apiResponse.page ?? 1
    const limit = apiResponse.meta?.limit ?? apiResponse.limit ?? 10
    const totalPages = apiResponse.meta?.totalPages ?? Math.ceil(total / limit)

    return {
      data: apiResponse.data.map(transformBooking),
      total,
      page,
      limit,
      totalPages,
    }
  } catch (error) {
    console.error('Error transforming paginated bookings:', error, apiResponse)
    throw error
  }
}

export const bookingService = {
  async getByEstablishment(
    establishmentId: string,
    filters?: BookingFilters,
    page = 1,
    limit = 10
  ): Promise<PaginatedBookings> {
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      if (filters?.status) params.append('status', filters.status)
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)
      if (filters?.serviceId) params.append('serviceId', filters.serviceId)
      const queryString = params.toString()
      const response = await api.get<ApiPaginatedBookings>(
        `/v1/establishments/${establishmentId}/bookings?${queryString}`
      )
      console.log('API Response:', response)
      if (response.data && response.data.length > 0) {
        console.log('First booking extras:', response.data[0].extras)
      }
      return transformPaginatedBookings(response)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      throw error
    }
  },

  async getById(id: string): Promise<Booking> {
    const response = await api.get<ApiBooking>(`/v1/bookings/${id}`)
    return transformBooking(response)
  },

  async cancel(id: string): Promise<Booking> {
    const response = await api.post<ApiBooking>(`/v1/bookings/${id}/cancel`)
    return transformBooking(response)
  },

  async confirm(id: string): Promise<Booking> {
    const response = await api.put<ApiBooking>(`/v1/bookings/${id}/confirm`)
    return transformBooking(response)
  },
}
