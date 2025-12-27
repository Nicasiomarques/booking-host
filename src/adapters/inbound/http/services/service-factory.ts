import { PrismaClient } from '@prisma/client'
import {
  AuthService,
  EstablishmentService,
  ServiceService,
  ExtraItemService,
  AvailabilityService,
  BookingService,
  RoomService,
} from '#application/index.js'
import type {
  PasswordHasherPort,
  TokenProviderPort,
  RepositoryErrorHandlerPort,
  UnitOfWorkPort,
} from '#application/ports/index.js'
import {
  UserRepository,
  EstablishmentRepository,
  ServiceRepository,
  ExtraItemRepository,
  AvailabilityRepository,
  BookingRepository,
  RoomRepository,
  PrismaUnitOfWorkAdapter,
  PrismaRepositoryErrorHandlerAdapter,
} from '#adapters/outbound/prisma/index.js'
import { Argon2PasswordHasherAdapter } from '#adapters/outbound/crypto/index.js'
import { JwtTokenProviderAdapter } from '#adapters/outbound/token/index.js'

export interface Services {
  auth: AuthService
  establishment: EstablishmentService
  service: ServiceService
  extraItem: ExtraItemService
  availability: AvailabilityService
  booking: BookingService
  room: RoomService
}

export interface Repositories {
  user: UserRepository
  establishment: EstablishmentRepository
  service: ServiceRepository
  extraItem: ExtraItemRepository
  availability: AvailabilityRepository
  booking: BookingRepository
  room: RoomRepository
}

export interface Adapters {
  passwordHasher: PasswordHasherPort
  tokenProvider: TokenProviderPort
  repositoryErrorHandler: RepositoryErrorHandlerPort
  unitOfWork: UnitOfWorkPort
}

export interface CompositionRoot {
  services: Services
  repositories: Repositories
  adapters: Adapters
}

function createAdapters(prisma: PrismaClient): Adapters {
  return {
    passwordHasher: new Argon2PasswordHasherAdapter(),
    tokenProvider: new JwtTokenProviderAdapter(),
    repositoryErrorHandler: new PrismaRepositoryErrorHandlerAdapter(),
    unitOfWork: new PrismaUnitOfWorkAdapter(prisma),
  }
}

function createRepositories(prisma: PrismaClient): Repositories {
  return {
    user: new UserRepository(prisma),
    establishment: new EstablishmentRepository(prisma),
    service: new ServiceRepository(prisma),
    extraItem: new ExtraItemRepository(prisma),
    availability: new AvailabilityRepository(prisma),
    booking: new BookingRepository(prisma),
    room: new RoomRepository(prisma),
  }
}

function createServices(repositories: Repositories, adapters: Adapters): Services {
  return {
    auth: new AuthService(
      repositories.user,
      adapters.passwordHasher,
      adapters.tokenProvider,
      adapters.repositoryErrorHandler
    ),
    establishment: new EstablishmentService(repositories.establishment),
    service: new ServiceService(repositories.service, repositories.establishment),
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
      adapters.unitOfWork,
      repositories.booking,
      repositories.service,
      repositories.availability,
      repositories.extraItem,
      repositories.establishment,
      repositories.room
    ),
    room: new RoomService(
      repositories.room,
      repositories.service,
      repositories.establishment
    ),
  }
}

export function createCompositionRoot(prisma: PrismaClient): CompositionRoot {
  const adapters = createAdapters(prisma)
  const repositories = createRepositories(prisma)
  const services = createServices(repositories, adapters)

  return { services, repositories, adapters }
}
