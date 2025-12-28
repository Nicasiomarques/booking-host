import { PrismaClient } from '@prisma/client'
import { AuthService } from './application/auth.service.js'
import { UserRepository } from './adapters/persistence/user.repository.js'
import type {
  PasswordHasherPort,
  TokenProviderPort,
  RepositoryErrorHandlerPort,
} from '#shared/application/ports/index.js'

export interface AuthComposition {
  repository: UserRepository
  service: AuthService
}

export function createAuthComposition(
  prisma: PrismaClient,
  adapters: {
    passwordHasher: PasswordHasherPort
    tokenProvider: TokenProviderPort
    repositoryErrorHandler: RepositoryErrorHandlerPort
  }
): AuthComposition {
  const repository = new UserRepository(prisma)
  const service = new AuthService(
    repository,
    adapters.passwordHasher,
    adapters.tokenProvider,
    adapters.repositoryErrorHandler
  )

  return { repository, service }
}

