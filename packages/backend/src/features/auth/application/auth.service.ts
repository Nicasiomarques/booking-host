import type { UserWithRoles } from '#shared/domain/index.js'
import { ConflictError, UnauthorizedError } from '#shared/domain/index.js'
import type {
  PasswordHasherPort,
  TokenProviderPort,
  TokenPayload,
  RepositoryErrorHandlerPort,
  UserRepositoryPort,
} from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'
import type {
  RegisterInput,
  LoginInput,
  AuthResult,
} from '../domain/index.js'

export const createAuthService = (deps: {
  userRepository: UserRepositoryPort
  passwordHasher: PasswordHasherPort
  tokenProvider: TokenProviderPort
  errorHandler: RepositoryErrorHandlerPort
}) => {
  const generateAuthResult = (user: UserWithRoles): AuthResult => {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      establishmentRoles: user.establishmentRoles,
    }

    return {
      accessToken: deps.tokenProvider.generateAccessToken(payload),
      refreshToken: deps.tokenProvider.generateRefreshToken(user.id),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }
  }

  return {
    async register(input: RegisterInput): Promise<AuthResult> {
      const passwordHash = await deps.passwordHasher.hash(input.password)

      try {
        const user = await deps.userRepository.create({
          email: input.email,
          passwordHash,
          name: input.name,
          phone: input.phone,
          birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
          address: input.address,
        })

        return generateAuthResult(user)
      } catch (error) {
        const dbError = deps.errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          throw new ConflictError('Email already exists')
        }
        throw error
      }
    },

    async login(input: LoginInput): Promise<AuthResult> {
      const user = await deps.userRepository.findByEmail(input.email)

      if (!user) throw new UnauthorizedError('Invalid credentials')

      const isValid = await deps.passwordHasher.verify(user.passwordHash, input.password)

      if (!isValid) throw new UnauthorizedError('Invalid credentials')

      if (await deps.passwordHasher.needsRehash(user.passwordHash)) {
        const newHash = await deps.passwordHasher.hash(input.password)
        await deps.userRepository.update(user.id, { passwordHash: newHash })
      }

      return generateAuthResult(user)
    },

    async refresh(refreshToken: string): Promise<{ accessToken: string }> {
      const { userId } = deps.tokenProvider.verifyRefreshToken(refreshToken)

      const user = await deps.userRepository.findById(userId)

      if (!user) throw new UnauthorizedError('User not found')

      const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        establishmentRoles: user.establishmentRoles,
      }

      return {
        accessToken: deps.tokenProvider.generateAccessToken(payload),
      }
    },

    async me(userId: string): Promise<{ id: string; email: string; name: string; establishmentRoles: Array<{ establishmentId: string; role: string }> }> {
      const user = await deps.userRepository.findById(userId)

      if (!user) throw new UnauthorizedError('User not found')

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        establishmentRoles: user.establishmentRoles,
      }
    },
  }
}

