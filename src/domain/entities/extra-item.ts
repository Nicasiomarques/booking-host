export interface CreateExtraItemData {
  serviceId: string
  name: string
  price: number
  maxQuantity?: number
}

export interface UpdateExtraItemData {
  name?: string
  price?: number
  maxQuantity?: number
  active?: boolean
}

export interface ExtraItem {
  id: string
  serviceId: string
  name: string
  price: string
  maxQuantity: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}
