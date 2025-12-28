import { PrismaClient } from '@prisma/client'
import type {
  PasswordHasherPort,
  TokenProviderPort,
  RepositoryErrorHandlerPort,
  UnitOfWorkPort,
} from '#shared/application/ports/index.js'
import {
  createUnitOfWork,
  createRepositoryErrorHandler,
} from '#shared/adapters/outbound/prisma/index.js'
import { createPasswordHasher } from '#shared/adapters/outbound/crypto/index.js'
import { createTokenProvider } from '#shared/adapters/outbound/token/index.js'
import { createAuthComposition, type AuthComposition } from '#features/auth/composition.js'
import { createEstablishmentComposition, type EstablishmentComposition } from '#features/establishment/composition.js'
import { createServiceComposition, type ServiceComposition } from '#features/service/composition.js'
import { createExtraItemComposition, type ExtraItemComposition } from '#features/extra-item/composition.js'
import { createAvailabilityComposition, type AvailabilityComposition } from '#features/availability/composition.js'
import { createBookingComposition, type BookingComposition } from '#features/booking/composition.js'
import { createRoomComposition, type RoomComposition } from '#features/room/composition.js'

export interface Services {
  auth: AuthComposition['service']
  establishment: EstablishmentComposition['service']
  service: ServiceComposition['service']
  extraItem: ExtraItemComposition['service']
  availability: AvailabilityComposition['service']
  booking: BookingComposition['service']
  room: RoomComposition['service']
}

export interface Repositories {
  user: AuthComposition['repository']
  establishment: EstablishmentComposition['repository']
  service: ServiceComposition['repository']
  extraItem: ExtraItemComposition['repository']
  availability: AvailabilityComposition['repository']
  booking: BookingComposition['repository']
  room: RoomComposition['repository']
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
    passwordHasher: createPasswordHasher(),
    tokenProvider: createTokenProvider(),
    repositoryErrorHandler: createRepositoryErrorHandler(),
    unitOfWork: createUnitOfWork(prisma),
  }
}

export function createCompositionRoot(prisma: PrismaClient): CompositionRoot {
  const adapters = createAdapters(prisma)

  // Create compositions in dependency order
  const authComposition = createAuthComposition(prisma, {
    passwordHasher: adapters.passwordHasher,
    tokenProvider: adapters.tokenProvider,
    repositoryErrorHandler: adapters.repositoryErrorHandler,
  })

  const establishmentComposition = createEstablishmentComposition(prisma, adapters.repositoryErrorHandler)

  const serviceComposition = createServiceComposition(prisma, {
    establishmentRepository: establishmentComposition.repository,
    errorHandler: adapters.repositoryErrorHandler,
  })

  const extraItemComposition = createExtraItemComposition(prisma, {
    serviceRepository: serviceComposition.repository,
    establishmentRepository: establishmentComposition.repository,
    errorHandler: adapters.repositoryErrorHandler,
  })

  const availabilityComposition = createAvailabilityComposition(prisma, {
    serviceRepository: serviceComposition.repository,
    establishmentRepository: establishmentComposition.repository,
    errorHandler: adapters.repositoryErrorHandler,
  })

  const roomComposition = createRoomComposition(prisma, {
    serviceRepository: serviceComposition.repository,
    establishmentRepository: establishmentComposition.repository,
    errorHandler: adapters.repositoryErrorHandler,
  })

  const bookingComposition = createBookingComposition(prisma, {
    unitOfWork: adapters.unitOfWork,
    serviceRepository: serviceComposition.repository,
    availabilityRepository: availabilityComposition.repository,
    extraItemRepository: extraItemComposition.repository,
    establishmentRepository: establishmentComposition.repository,
    roomRepository: roomComposition.repository,
    errorHandler: adapters.repositoryErrorHandler,
  })

  return {
    services: {
      auth: authComposition.service,
      establishment: establishmentComposition.service,
      service: serviceComposition.service,
      extraItem: extraItemComposition.service,
      availability: availabilityComposition.service,
      booking: bookingComposition.service,
      room: roomComposition.service,
    },
    repositories: {
      user: authComposition.repository,
      establishment: establishmentComposition.repository,
      service: serviceComposition.repository,
      extraItem: extraItemComposition.repository,
      availability: availabilityComposition.repository,
      booking: bookingComposition.repository,
      room: roomComposition.repository,
    },
    adapters,
  }
}

