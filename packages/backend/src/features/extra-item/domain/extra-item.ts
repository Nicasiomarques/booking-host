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

// Domain methods
import type { Either } from '#shared/domain/index.js'
import { ConflictError, NotFoundError } from '#shared/domain/index.js'
import { left, right } from '#shared/domain/index.js'

export function isExtraItemActive(extraItem: ExtraItem): boolean {
  return extraItem.active
}

export function extraItemBelongsToService(extraItem: ExtraItem, serviceId: string): boolean {
  return extraItem.serviceId === serviceId
}

export function extraItemCanAccommodateQuantity(extraItem: ExtraItem, quantity: number): Either<ConflictError, void> {
  if (quantity > extraItem.maxQuantity) {
    return left(new ConflictError(
      `Extra item ${extraItem.name} quantity exceeds maximum of ${extraItem.maxQuantity}`
    ))
  }
  return right(undefined)
}

export function validateExtraItemForBooking(extraItem: ExtraItem | null, serviceId: string): Either<NotFoundError | ConflictError, ExtraItem> {
  if (!extraItem) {
    return left(new NotFoundError('ExtraItem'))
  }
  if (!extraItem.active) {
    return left(new NotFoundError('ExtraItem'))
  }
  if (!extraItemBelongsToService(extraItem, serviceId)) {
    return left(new ConflictError(`Extra item ${extraItem.id} does not belong to the service`))
  }
  return right(extraItem)
}

