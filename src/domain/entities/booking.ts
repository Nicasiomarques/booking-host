import type { BookingStatus, ListOptions } from './common.js'

export interface CreateBookingData {
  userId: string
  establishmentId: string
  serviceId: string
  availabilityId: string
  quantity: number
  totalPrice: number
  status?: BookingStatus
}

export interface BookingExtraItemData {
  extraItemId: string
  quantity: number
  priceAtBooking: number
}

export interface Booking {
  id: string
  userId: string
  establishmentId: string
  serviceId: string
  availabilityId: string
  quantity: number
  totalPrice: string
  status: BookingStatus
  createdAt: Date
  updatedAt: Date
}

export interface BookingWithDetails extends Booking {
  service: {
    id: string
    name: string
    basePrice: string
    durationMinutes: number
  }
  availability: {
    id: string
    date: Date
    startTime: string
    endTime: string
  }
  extraItems: Array<{
    quantity: number
    priceAtBooking: string
    extraItem: {
      id: string
      name: string
    }
  }>
}

export interface ListBookingsOptions extends ListOptions {
  status?: BookingStatus
}
