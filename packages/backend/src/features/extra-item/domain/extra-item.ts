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
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'

export function isExtraItemActive(extraItem: ExtraItem): boolean {
  return extraItem.active
}

export function extraItemBelongsToService(extraItem: ExtraItem, serviceId: string): boolean {
  return extraItem.serviceId === serviceId
}

export function extraItemCanAccommodateQuantity(extraItem: ExtraItem, quantity: number): Domain.Either<DomainValues.ConflictError, void> {
  if (quantity > extraItem.maxQuantity) {
    return DomainValues.left(new DomainValues.ConflictError(
      `Extra item ${extraItem.name} quantity exceeds maximum of ${extraItem.maxQuantity}`
    ))
  }
  return DomainValues.right(undefined)
}

export function validateExtraItemForBooking(extraItem: ExtraItem | null, serviceId: string): Domain.Either<DomainValues.NotFoundError | DomainValues.ConflictError, ExtraItem> {
  if (!extraItem) {
    return DomainValues.left(new DomainValues.NotFoundError('ExtraItem'))
  }
  if (!extraItem.active) {
    return DomainValues.left(new DomainValues.NotFoundError('ExtraItem'))
  }
  if (!extraItemBelongsToService(extraItem, serviceId)) {
    return DomainValues.left(new DomainValues.ConflictError(`Extra item ${extraItem.id} does not belong to the service`))
  }
  return DomainValues.right(extraItem)
}

