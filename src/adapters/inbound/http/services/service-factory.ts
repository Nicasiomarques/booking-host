import { PrismaClient } from '@prisma/client'
import {
  AuthService,
  EstablishmentService,
  ServiceService,
  ExtraItemService,
  AvailabilityService,
  BookingService,
} from '#application/index.js'
import {
  UserRepository,
  EstablishmentRepository,
  ServiceRepository,
  ExtraItemRepository,
  AvailabilityRepository,
  BookingRepository,
} from '#adapters/outbound/prisma/index.js'

export interface Services {
  auth: AuthService
  establishment: EstablishmentService
  service: ServiceService
  extraItem: ExtraItemService
  availability: AvailabilityService
  booking: BookingService
}

export interface Repositories {
  user: UserRepository
  establishment: EstablishmentRepository
  service: ServiceRepository
  extraItem: ExtraItemRepository
  availability: AvailabilityRepository
  booking: BookingRepository
}

export interface CompositionRoot {
  services: Services
  repositories: Repositories
}

function createRepositories(prisma: PrismaClient): Repositories {
  return {
    user: new UserRepository(prisma),
    establishment: new EstablishmentRepository(prisma),
    service: new ServiceRepository(prisma),
    extraItem: new ExtraItemRepository(prisma),
    availability: new AvailabilityRepository(prisma),
    booking: new BookingRepository(prisma),
  }
}

function createServices(prisma: PrismaClient, repositories: Repositories): Services {
  return {
    auth: new AuthService(repositories.user),
    establishment: new EstablishmentService(repositories.establishment),
    service: new ServiceService(
      repositories.service,
      repositories.establishment
    ),
    extraItem: new ExtraItemService(
      repositories.extraItem,
      repositories.service,
      repositories.establishment
    ),
    availability: new AvailabilityService(
      repositories.availability,
      repositories.service,
      repositories.establishment
    ),
    booking: new BookingService(
      prisma,
      repositories.booking,
      repositories.service,
      repositories.availability,
      repositories.extraItem,
      repositories.establishment
    ),
  }
}

export function createCompositionRoot(prisma: PrismaClient): CompositionRoot {
  const repositories = createRepositories(prisma)
  const services = createServices(prisma, repositories)

  return { services, repositories }
}
