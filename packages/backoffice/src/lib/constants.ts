export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const APP_NAME = 'Booking Backoffice'

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  ESTABLISHMENTS: '/establishments',
  ESTABLISHMENT_DETAILS: '/establishments/:id',
  SERVICES: '/establishments/:id/services',
  AVAILABILITY: '/establishments/:id/services/:serviceId/availability',
  BOOKINGS: '/establishments/:id/bookings',
} as const

export const QUERY_KEYS = {
  USER: 'user',
  ESTABLISHMENTS: 'establishments',
  ESTABLISHMENT: 'establishment',
  SERVICES: 'services',
  SERVICE: 'service',
  EXTRA_ITEMS: 'extraItems',
  AVAILABILITIES: 'availabilities',
  BOOKINGS: 'bookings',
  BOOKING: 'booking',
} as const

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const

export const USER_ROLES = {
  OWNER: 'OWNER',
  STAFF: 'STAFF',
} as const
