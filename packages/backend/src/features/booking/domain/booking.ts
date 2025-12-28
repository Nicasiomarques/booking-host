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

// Domain methods
import type { Either } from '#shared/domain/index.js'
import { ConflictError } from '#shared/domain/index.js'
import { left, right } from '#shared/domain/index.js'

export function bookingBelongsToUser(booking: Booking, userId: string): boolean {
  return booking.userId === userId
}

export function validateHotelDates(checkInDate: Date, checkOutDate: Date): Either<ConflictError, { numberOfNights: number }> {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  if (checkInDate < today) {
    return left(new ConflictError('checkInDate cannot be in the past'))
  }

  if (checkInDate >= checkOutDate) {
    return left(new ConflictError('checkOutDate must be after checkInDate'))
  }

  const diffTime = checkOutDate.getTime() - checkInDate.getTime()
  const numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (numberOfNights < 1) {
    return left(new ConflictError('Minimum stay is 1 night'))
  }

  return right({ numberOfNights })
}

export function canBookingBeCancelled(booking: Booking): Either<ConflictError, void> {
  if (booking.status === 'CANCELLED') {
    return left(new ConflictError('Booking is already cancelled'))
  }
  return right(undefined)
}

export function canBookingBeConfirmed(booking: Booking): Either<ConflictError, void> {
  if (booking.status === 'CONFIRMED') {
    return left(new ConflictError('Booking is already confirmed'))
  }
  if (booking.status === 'CANCELLED') {
    return left(new ConflictError('Cannot confirm a cancelled booking'))
  }
  return right(undefined)
}

export function canBookingBeCheckedIn(booking: Booking): Either<ConflictError, void> {
  if (booking.status === 'CHECKED_IN') {
    return left(new ConflictError('Booking is already checked in'))
  }
  if (booking.status === 'CHECKED_OUT') {
    return left(new ConflictError('Cannot check in a booking that has already been checked out'))
  }
  if (booking.status === 'CANCELLED') {
    return left(new ConflictError('Cannot check in a cancelled booking'))
  }
  if (booking.status === 'NO_SHOW') {
    return left(new ConflictError('Cannot check in a no-show booking'))
  }
  return right(undefined)
}

export function canBookingBeCheckedOut(booking: Booking): Either<ConflictError, void> {
  if (booking.status === 'CHECKED_OUT') {
    return left(new ConflictError('Booking is already checked out'))
  }
  if (booking.status === 'CANCELLED') {
    return left(new ConflictError('Cannot check out a cancelled booking'))
  }
  if (booking.status === 'NO_SHOW') {
    return left(new ConflictError('Cannot check out a no-show booking'))
  }
  return right(undefined)
}

// Helper function for ownership data (partial booking data)
export function canBookingStatusBeCancelled(status: BookingStatus): Either<ConflictError, void> {
  if (status === 'CANCELLED') {
    return left(new ConflictError('Booking is already cancelled'))
  }
  return right(undefined)
}

export function canBookingStatusBeConfirmed(status: BookingStatus): Either<ConflictError, void> {
  if (status === 'CONFIRMED') {
    return left(new ConflictError('Booking is already confirmed'))
  }
  if (status === 'CANCELLED') {
    return left(new ConflictError('Cannot confirm a cancelled booking'))
  }
  return right(undefined)
}

