import type {
  Establishment,
  CreateEstablishmentData,
  UpdateEstablishmentData,
  EstablishmentWithRole,
  Role,
  Service,
  CreateServiceData,
  UpdateServiceData,
  Room,
  CreateRoomData,
  UpdateRoomData,
  Availability,
  CreateAvailabilityData,
  UpdateAvailabilityData,
  ExtraItem,
  CreateExtraItemData,
  UpdateExtraItemData,
  Booking,
  BookingWithDetails,
  ListBookingsOptions,
  PaginatedResult,
  BookingStatus,
} from '#domain/index.js'

/**
 * Port interface for Establishment repository operations
 */
export interface EstablishmentRepositoryPort {
  create(data: CreateEstablishmentData, userId: string): Promise<Establishment>
  findById(id: string): Promise<Establishment | null>
  findByUserId(userId: string): Promise<EstablishmentWithRole[]>
  update(id: string, data: UpdateEstablishmentData): Promise<Establishment>
  getUserRole(userId: string, establishmentId: string): Promise<Role | null>
}

/**
 * Port interface for Service repository operations
 */
export interface ServiceRepositoryPort {
  create(data: CreateServiceData): Promise<Service>
  findById(id: string): Promise<Service | null>
  findByEstablishment(establishmentId: string, options?: { activeOnly?: boolean }): Promise<Service[]>
  update(id: string, data: UpdateServiceData): Promise<Service>
  softDelete(id: string): Promise<Service>
  hasActiveBookings(id: string): Promise<boolean>
}

/**
 * Port interface for Availability repository operations
 */
export interface AvailabilityRepositoryPort {
  create(data: CreateAvailabilityData): Promise<Availability>
  findById(id: string): Promise<Availability | null>
  findByIdWithService(id: string): Promise<(Availability & { service: { establishmentId: string } }) | null>
  findByService(serviceId: string, options?: { startDate?: Date; endDate?: Date }): Promise<Availability[]>
  update(id: string, data: UpdateAvailabilityData): Promise<Availability>
  delete(id: string): Promise<Availability>
  checkOverlap(
    serviceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<boolean>
  hasActiveBookings(id: string): Promise<boolean>
}

/**
 * Port interface for ExtraItem repository operations
 */
export interface ExtraItemRepositoryPort {
  create(data: CreateExtraItemData): Promise<ExtraItem>
  findById(id: string): Promise<ExtraItem | null>
  findByIdWithService(id: string): Promise<(ExtraItem & { service: { establishmentId: string } }) | null>
  findByService(serviceId: string, options?: { activeOnly?: boolean }): Promise<ExtraItem[]>
  update(id: string, data: UpdateExtraItemData): Promise<ExtraItem>
  softDelete(id: string): Promise<ExtraItem>
}

/**
 * Port interface for Room repository operations
 */
export interface RoomRepositoryPort {
  create(data: CreateRoomData): Promise<Room>
  findById(id: string): Promise<Room | null>
  findByService(serviceId: string): Promise<Room[]>
  findAvailableRooms(serviceId: string, checkInDate: Date, checkOutDate: Date): Promise<Room[]>
  update(id: string, data: UpdateRoomData): Promise<Room>
  delete(id: string): Promise<Room>
  hasActiveBookings(id: string): Promise<boolean>
}

/**
 * Port interface for Booking repository operations (read-only, outside transactions)
 */
export interface BookingRepositoryPort {
  findById(id: string): Promise<BookingWithDetails | null>
  findByUser(userId: string, options?: ListBookingsOptions): Promise<PaginatedResult<BookingWithDetails>>
  findByEstablishment(
    establishmentId: string,
    options?: ListBookingsOptions
  ): Promise<PaginatedResult<BookingWithDetails>>
  getBookingOwnership(id: string): Promise<{
    userId: string
    establishmentId: string
    quantity: number
    availabilityId: string
    status: BookingStatus
    roomId: string | null
    serviceType: string | null
  } | null>
  updateStatus(id: string, status: BookingStatus): Promise<Booking>
}
