// Common
export {
  uuidSchema,
  paginationSchema,
  emailSchema,
  dateRangeSchema,
} from './common.schema.js'
export type { Pagination, DateRange } from './common.schema.js'

// Auth
export {
  passwordSchema,
  registerSchema,
  loginSchema,
  authResponseSchema,
  refreshResponseSchema,
  meResponseSchema,
} from './auth.schema.js'
export type { RegisterInput, LoginInput, AuthResponse, RefreshResponse, MeResponse } from './auth.schema.js'

// Establishment
export {
  createEstablishmentSchema,
  updateEstablishmentSchema,
  establishmentResponseSchema,
  establishmentWithRoleResponseSchema,
  establishmentIdParamSchema,
} from './establishment.schema.js'
export type {
  CreateEstablishmentInput,
  UpdateEstablishmentInput,
  EstablishmentResponse,
} from './establishment.schema.js'

// Service
export {
  createServiceSchema,
  updateServiceSchema,
  serviceResponseSchema,
  serviceIdParamSchema,
} from './service.schema.js'
export type { CreateServiceInput, UpdateServiceInput, ServiceResponse } from './service.schema.js'

// Availability
export {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  queryAvailabilitySchema,
  availabilityResponseSchema,
  availabilityIdParamSchema,
} from './availability.schema.js'
export type {
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  QueryAvailabilityInput,
  AvailabilityResponse,
} from './availability.schema.js'

// Extra Item
export {
  createExtraItemSchema,
  updateExtraItemSchema,
  extraItemResponseSchema,
  extraIdParamSchema,
} from './extra-item.schema.js'
export type {
  CreateExtraItemInput,
  UpdateExtraItemInput,
  ExtraItemResponse,
} from './extra-item.schema.js'

// Booking
export {
  bookingExtraSchema,
  createBookingSchema,
  listBookingsQuerySchema,
  bookingExtraResponseSchema,
  bookingResponseSchema,
  bookingIdParamSchema,
  paginatedBookingsResponseSchema,
} from './booking.schema.js'
export type {
  CreateBookingInput,
  ListBookingsQueryInput,
  BookingResponse,
} from './booking.schema.js'

// Room
export {
  createRoomSchema,
  updateRoomSchema,
  roomResponseSchema,
} from './room.schema.js'
export type {
  CreateRoomInput,
  UpdateRoomInput,
  RoomResponse,
} from './room.schema.js'
