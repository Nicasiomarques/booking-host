import { formatDate, formatDecimal } from '#shared/adapters/http/utils/response-formatters.js'

export function formatBookingResponse<T extends { 
  totalPrice: string | number
  service?: { basePrice: string | number }
  extraItems?: Array<{ 
    quantity: number
    priceAtBooking: string | number
    extraItem: { id: string; name: string }
  }>
  user?: { name: string; email: string }
  availability?: { date: Date | string; startTime: string; endTime: string }
  checkInDate?: Date | string | null
  checkOutDate?: Date | string | null
  roomId?: string | null
  numberOfNights?: number | null
  guestName?: string | null
  guestEmail?: string | null
  guestDocument?: string | null
}>(booking: T) {
  // Extract extraItems and transform to extras format
  const { extraItems, ...rest } = booking as T & { extraItems?: Array<{ 
    quantity: number
    priceAtBooking: string | number
    extraItem: { id: string; name: string }
  }> }

  return {
    ...rest,
    totalPrice: formatDecimal(booking.totalPrice) ?? 0,
    ...(booking.service && {
      service: {
        ...booking.service,
        basePrice: formatDecimal(booking.service.basePrice) ?? 0,
      },
    }),
    ...(booking.availability && {
      availability: {
        ...booking.availability,
        date: formatDate(booking.availability.date) ?? '',
      },
    }),
    extras: extraItems && extraItems.length > 0
      ? extraItems.map(item => ({
          id: item.extraItem.id,
          extraItemId: item.extraItem.id,
          quantity: item.quantity,
          priceAtBooking: formatDecimal(item.priceAtBooking) ?? 0,
          extraItem: {
            name: item.extraItem.name,
          },
        }))
      : [],
    ...(booking.user && {
      user: booking.user,
    }),
    // Hotel-specific fields
    ...(booking.checkInDate !== undefined && {
      checkInDate: formatDate(booking.checkInDate),
    }),
    ...(booking.checkOutDate !== undefined && {
      checkOutDate: formatDate(booking.checkOutDate),
    }),
    ...(booking.roomId !== undefined && { roomId: booking.roomId }),
    ...(booking.numberOfNights !== undefined && { numberOfNights: booking.numberOfNights }),
    ...(booking.guestName !== undefined && { guestName: booking.guestName }),
    ...(booking.guestEmail !== undefined && { guestEmail: booking.guestEmail }),
    ...(booking.guestDocument !== undefined && { guestDocument: booking.guestDocument }),
  }
}

export function formatPaginatedBookings<T extends { 
  data: Array<{ totalPrice: string | number; service?: { basePrice: string | number }; extraItems?: Array<{ quantity: number; priceAtBooking: string | number; extraItem: { id: string; name: string } }>; user?: { name: string; email: string }; availability?: { date: Date | string; startTime: string; endTime: string }; checkInDate?: Date | string | null; checkOutDate?: Date | string | null; roomId?: string | null; numberOfNights?: number | null; guestName?: string | null; guestEmail?: string | null; guestDocument?: string | null }>
  total: number
  page: number
  limit: number
}>(result: T) {
  const totalPages = Math.ceil(result.total / result.limit)
  return {
    data: result.data.map(formatBookingResponse),
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages,
    },
  }
}

