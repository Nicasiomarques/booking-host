// Prisma client
export { prisma } from './prisma.client.js'

// Repositories
export { UserRepository } from './user.repository.js'
export { BookingRepository } from './booking.repository.js'
export { EstablishmentRepository } from './establishment.repository.js'
export { ServiceRepository } from './service.repository.js'
export { AvailabilityRepository } from './availability.repository.js'
export { ExtraItemRepository } from './extra-item.repository.js'
export { RoomRepository } from './room.repository.js'

// Port Adapters
export { PrismaUnitOfWorkAdapter } from './prisma-unit-of-work.adapter.js'
export { PrismaRepositoryErrorHandlerAdapter } from './prisma-repository-error-handler.adapter.js'

// Types
export type { ServiceWithExtras } from './service.repository.js'
export type { AvailabilityWithEstablishment } from './availability.repository.js'
export type { ExtraItemWithEstablishment } from './extra-item.repository.js'
