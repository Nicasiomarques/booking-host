import { PrismaClient } from '@prisma/client'
import { createAuthService } from './application/auth.service.js'
import { createUserRepository } from './adapters/repository.js'
import type * as Ports from '#shared/application/ports/index.js'

export interface AuthComposition {
  repository: Ports.UserRepositoryPort
  service: ReturnType<typeof createAuthService>
}

export function createAuthComposition(
  prisma: PrismaClient,
  dependencies: {
    passwordHasher: Ports.PasswordHasherPort
    tokenProvider: Ports.TokenProviderPort
    repositoryErrorHandler: Ports.RepositoryErrorHandlerPort
  }
): AuthComposition {
  const repository = createUserRepository(prisma, dependencies.repositoryErrorHandler)
  const service = createAuthService({
    userRepository: repository,
    passwordHasher: dependencies.passwordHasher,
    tokenProvider: dependencies.tokenProvider,
    errorHandler: dependencies.repositoryErrorHandler,
  })

  return { repository, service }
}

