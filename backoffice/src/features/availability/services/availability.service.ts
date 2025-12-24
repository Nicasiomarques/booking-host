import { api } from '@/lib/api'

export interface AvailabilitySlot {
  id: string
  serviceId: string
  date: string
  startTime: string
  endTime: string
  capacity: number
  bookedCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateAvailabilityData {
  date: string
  startTime: string
  endTime: string
  capacity: number
}

export interface UpdateAvailabilityData {
  date?: string
  startTime?: string
  endTime?: string
  capacity?: number
}

export interface AvailabilityFilters {
  startDate?: string
  endDate?: string
}

export const availabilityService = {
  async getByService(
    serviceId: string,
    filters?: AvailabilityFilters
  ): Promise<AvailabilitySlot[]> {
    const params = new URLSearchParams()
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    const queryString = params.toString()
    const url = `/v1/services/${serviceId}/availability${queryString ? `?${queryString}` : ''}`
    return api.get<AvailabilitySlot[]>(url)
  },

  async getById(id: string): Promise<AvailabilitySlot> {
    return api.get<AvailabilitySlot>(`/v1/availability/${id}`)
  },

  async create(serviceId: string, data: CreateAvailabilityData): Promise<AvailabilitySlot> {
    return api.post<AvailabilitySlot>(`/v1/services/${serviceId}/availability`, data)
  },

  async update(id: string, data: UpdateAvailabilityData): Promise<AvailabilitySlot> {
    return api.put<AvailabilitySlot>(`/v1/availability/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/v1/availability/${id}`)
  },
}
