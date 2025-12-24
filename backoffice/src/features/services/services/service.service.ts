import { api } from '@/lib/api'

export interface Service {
  id: string
  establishmentId: string
  name: string
  description: string | null
  basePrice: number
  durationMinutes: number
  capacity: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateServiceData {
  name: string
  description?: string
  basePrice: number
  durationMinutes: number
  capacity: number
}

export interface UpdateServiceData {
  name?: string
  description?: string
  basePrice?: number
  durationMinutes?: number
  capacity?: number
  isActive?: boolean
}

export const serviceService = {
  async getByEstablishment(establishmentId: string): Promise<Service[]> {
    return api.get<Service[]>(`/v1/establishments/${establishmentId}/services`)
  },

  async getById(id: string): Promise<Service> {
    return api.get<Service>(`/v1/services/${id}`)
  },

  async create(establishmentId: string, data: CreateServiceData): Promise<Service> {
    return api.post<Service>(`/v1/establishments/${establishmentId}/services`, data)
  },

  async update(id: string, data: UpdateServiceData): Promise<Service> {
    return api.put<Service>(`/v1/services/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/v1/services/${id}`)
  },
}
