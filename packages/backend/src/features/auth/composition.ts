import { PrismaClient } from '@prisma/client'
import { createAuthService } from './application/auth.service.js'
import { createUserRepository } from './adapters/persistence/user.repository.js'
import type * as Ports from '#shared/application/ports/index.js'

export interface AuthComposition {
  repository: Ports.UserRepositoryPort
  service: ReturnType<typeof createAuthService>
}

export function createAuthComposition(
  prisma: PrismaClient,
  adapters: {
    passwordHasher: Ports.PasswordHasherPort
    tokenProvider: Ports.TokenProviderPort
    repositoryErrorHandler: Ports.RepositoryErrorHandlerPort
  }
): AuthComposition {
  const repository = createUserRepository(prisma, adapters.repositoryErrorHandler)
  const service = createAuthService({
    userRepository: repository,
    passwordHasher: adapters.passwordHasher,
    tokenProvider: adapters.tokenProvider,
    errorHandler: adapters.repositoryErrorHandler,
  })

  return { repository, service }
}

