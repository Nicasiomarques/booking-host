import { PrismaClient } from '@prisma/client'
import { createAuthService } from './application/auth.service.js'
import { createUserRepository } from './adapters/persistence/user.repository.js'
import type {
  PasswordHasherPort,
  TokenProviderPort,
  RepositoryErrorHandlerPort,
  UserRepositoryPort,
} from '#shared/application/ports/index.js'

export interface AuthComposition {
  repository: UserRepositoryPort
  service: ReturnType<typeof createAuthService>
}

export function createAuthComposition(
  prisma: PrismaClient,
  adapters: {
    passwordHasher: PasswordHasherPort
    tokenProvider: TokenProviderPort
    repositoryErrorHandler: RepositoryErrorHandlerPort
  }
): AuthComposition {
  const repository = createUserRepository(prisma)
  const service = createAuthService({
    userRepository: repository,
    passwordHasher: adapters.passwordHasher,
    tokenProvider: adapters.tokenProvider,
    errorHandler: adapters.repositoryErrorHandler,
  })

  return { repository, service }
}

