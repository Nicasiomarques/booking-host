export interface CreateExtraItemData {
  serviceId: string
  name: string
  price: number
  maxQuantity?: number
  description?: string
  image?: string
}

export interface UpdateExtraItemData {
  name?: string
  price?: number
  maxQuantity?: number
  active?: boolean
  description?: string
  image?: string
}

export interface ExtraItem {
  id: string
  serviceId: string
  name: string
  description: string | null
  price: string
  image: string | null
  maxQuantity: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}
