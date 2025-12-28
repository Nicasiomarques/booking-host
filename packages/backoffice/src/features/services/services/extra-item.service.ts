import { api } from '@/lib/api'

export interface ExtraItem {
  id: string
  serviceId: string
  name: string
  price: number
  maxQuantity: number
  createdAt: string
  updatedAt: string
}

export interface CreateExtraItemData {
  name: string
  price: number
  maxQuantity: number
}

export interface UpdateExtraItemData {
  name?: string
  price?: number
  maxQuantity?: number
}

export const extraItemService = {
  async getByService(serviceId: string): Promise<ExtraItem[]> {
    return api.get<ExtraItem[]>(`/v1/services/${serviceId}/extras`)
  },

  async create(serviceId: string, data: CreateExtraItemData): Promise<ExtraItem> {
    return api.post<ExtraItem>(`/v1/services/${serviceId}/extras`, data)
  },

  async update(id: string, data: UpdateExtraItemData): Promise<ExtraItem> {
    return api.put<ExtraItem>(`/v1/extras/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/v1/extras/${id}`)
  },
}
