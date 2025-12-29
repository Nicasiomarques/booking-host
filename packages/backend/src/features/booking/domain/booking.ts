import type * as Domain from '#shared/domain/index.js'

export interface CreateBookingData {
  userId: string
  establishmentId: string
  serviceId: string
  availabilityId: string
  quantity: number
  totalPrice: number
  status?: Domain.BookingStatus
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
  status: Domain.BookingStatus
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

export interface ListBookingsOptions extends Domain.ListOptions {
  status?: Domain.BookingStatus
}

// Domain methods
import * as DomainValues from '#shared/domain/index.js'

export function bookingBelongsToUser(booking: Booking, userId: string): boolean {
  return booking.userId === userId
}

export function validateHotelDates(checkInDate: Date, checkOutDate: Date): Domain.Either<DomainValues.ConflictError, { numberOfNights: number }> {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  if (checkInDate < today) {
    return DomainValues.left(new DomainValues.ConflictError('checkInDate cannot be in the past'))
  }

  if (checkInDate >= checkOutDate) {
    return DomainValues.left(new DomainValues.ConflictError('checkOutDate must be after checkInDate'))
  }

  const diffTime = checkOutDate.getTime() - checkInDate.getTime()
  const numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (numberOfNights < 1) {
    return DomainValues.left(new DomainValues.ConflictError('Minimum stay is 1 night'))
  }

  return DomainValues.right({ numberOfNights })
}

export function canBookingBeCancelled(booking: Booking): Domain.Either<DomainValues.ConflictError, void> {
  if (booking.status === 'CANCELLED') {
    return DomainValues.left(new DomainValues.ConflictError('Booking is already cancelled'))
  }
  return DomainValues.right(undefined)
}

export function canBookingBeConfirmed(booking: Booking): Domain.Either<DomainValues.ConflictError, void> {
  if (booking.status === 'CONFIRMED') {
    return DomainValues.left(new DomainValues.ConflictError('Booking is already confirmed'))
  }
  if (booking.status === 'CANCELLED') {
    return DomainValues.left(new DomainValues.ConflictError('Cannot confirm a cancelled booking'))
  }
  return DomainValues.right(undefined)
}

export function canBookingBeCheckedIn(booking: Booking): Domain.Either<DomainValues.ConflictError, void> {
  if (booking.status === 'CHECKED_IN') {
    return DomainValues.left(new DomainValues.ConflictError('Booking is already checked in'))
  }
  if (booking.status === 'CHECKED_OUT') {
    return DomainValues.left(new DomainValues.ConflictError('Cannot check in a booking that has already been checked out'))
  }
  if (booking.status === 'CANCELLED') {
    return DomainValues.left(new DomainValues.ConflictError('Cannot check in a cancelled booking'))
  }
  if (booking.status === 'NO_SHOW') {
    return DomainValues.left(new DomainValues.ConflictError('Cannot check in a no-show booking'))
  }
  return DomainValues.right(undefined)
}

export function canBookingBeCheckedOut(booking: Booking): Domain.Either<DomainValues.ConflictError, void> {
  if (booking.status === 'CHECKED_OUT') {
    return DomainValues.left(new DomainValues.ConflictError('Booking is already checked out'))
  }
  if (booking.status === 'CANCELLED') {
    return DomainValues.left(new DomainValues.ConflictError('Cannot check out a cancelled booking'))
  }
  if (booking.status === 'NO_SHOW') {
    return DomainValues.left(new DomainValues.ConflictError('Cannot check out a no-show booking'))
  }
  if (booking.status !== 'CHECKED_IN') {
    return DomainValues.left(new DomainValues.ConflictError('Booking must be checked in before check-out'))
  }
  return DomainValues.right(undefined)
}

// Helper function for ownership data (partial booking data)
export function canBookingStatusBeCancelled(status: Domain.BookingStatus): Domain.Either<DomainValues.ConflictError, void> {
  if (status === 'CANCELLED') {
    return DomainValues.left(new DomainValues.ConflictError('Booking is already cancelled'))
  }
  return DomainValues.right(undefined)
}

export function canBookingStatusBeConfirmed(status: Domain.BookingStatus): Domain.Either<DomainValues.ConflictError, void> {
  if (status === 'CONFIRMED') {
    return DomainValues.left(new DomainValues.ConflictError('Booking is already confirmed'))
  }
  if (status === 'CANCELLED') {
    return DomainValues.left(new DomainValues.ConflictError('Cannot confirm a cancelled booking'))
  }
  return DomainValues.right(undefined)
}

