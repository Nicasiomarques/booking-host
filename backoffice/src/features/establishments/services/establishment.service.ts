import { api } from '@/lib/api'

export interface Establishment {
  id: string
  name: string
  description: string | null
  address: string
  timezone: string
  createdAt: string
  updatedAt: string
}

export interface CreateEstablishmentInput {
  name: string
  description?: string
  address: string
  timezone: string
}

export interface UpdateEstablishmentInput {
  name?: string
  description?: string
  address?: string
  timezone?: string
}

export const establishmentService = {
  getMyEstablishments: () =>
    api.get<Establishment[]>('/v1/establishments/my'),

  getById: (id: string) =>
    api.get<Establishment>(`/v1/establishments/${id}`),

  create: (data: CreateEstablishmentInput) =>
    api.post<Establishment>('/v1/establishments', data),

  update: (id: string, data: UpdateEstablishmentInput) =>
    api.put<Establishment>(`/v1/establishments/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/v1/establishments/${id}`),
}
