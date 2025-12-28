import type { BookingStatus, ListOptions } from '#shared/domain/index.js'

export interface CreateBookingData {
  userId: string
  establishmentId: string
  serviceId: string
  availabilityId: string
  quantity: number
  totalPrice: number
  status?: BookingStatus
  // Hotel-specific fields
  checkInDate?: Date
  checkOutDate?: Date
  roomId?: string
  numberOfNights?: number
  numberOfGuests?: number
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  guestDocument?: string
  notes?: string
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
  // Hotel-specific fields (optional for backward compatibility)
  checkInDate: Date | null
  checkOutDate: Date | null
  roomId: string | null
  numberOfNights: number | null
  numberOfGuests: number | null
  guestName: string | null
  guestEmail: string | null
  guestPhone: string | null
  guestDocument: string | null
  notes: string | null
  confirmedAt: Date | null
  cancelledAt: Date | null
  cancellationReason: string | null
  checkedInAt: Date | null
  checkedOutAt: Date | null
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

