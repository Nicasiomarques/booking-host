import type { UserWithRoles, DomainError, Either } from '#shared/domain/index.js'
import { ConflictError, UnauthorizedError } from '#shared/domain/index.js'
import { left, right, isLeft } from '#shared/domain/index.js'
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
    async register(input: RegisterInput): Promise<Either<DomainError, AuthResult>> {
      const passwordHash = await deps.passwordHasher.hash(input.password)

      const userResult = await deps.userRepository.create({
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        address: input.address,
      })

      if (isLeft(userResult)) {
        const dbError = deps.errorHandler.analyze(userResult.value)
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return left(new ConflictError('Email already exists'))
        }
        return userResult
      }

      return right(generateAuthResult(userResult.value))
    },

    async login(input: LoginInput): Promise<Either<DomainError, AuthResult>> {
      const userResult = await deps.userRepository.findByEmail(input.email)

      if (isLeft(userResult)) {
        return left(new UnauthorizedError('Invalid credentials'))
      }

      const user = userResult.value
      if (!user) {
        return left(new UnauthorizedError('Invalid credentials'))
      }

      const isValid = await deps.passwordHasher.verify(user.passwordHash, input.password)

      if (!isValid) {
        return left(new UnauthorizedError('Invalid credentials'))
      }

      if (await deps.passwordHasher.needsRehash(user.passwordHash)) {
        const newHash = await deps.passwordHasher.hash(input.password)
        await deps.userRepository.update(user.id, { passwordHash: newHash })
      }

      return right(generateAuthResult(user))
    },

    async refresh(refreshToken: string): Promise<Either<DomainError, { accessToken: string }>> {
      const tokenResult = deps.tokenProvider.verifyRefreshToken(refreshToken)
      if (isLeft(tokenResult)) {
        return tokenResult
      }

      const { userId } = tokenResult.value
      const userResult = await deps.userRepository.findById(userId)

      if (isLeft(userResult)) {
        return left(new UnauthorizedError('User not found'))
      }

      const user = userResult.value
      if (!user) {
        return left(new UnauthorizedError('User not found'))
      }

      const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        establishmentRoles: user.establishmentRoles,
      }

      return right({
        accessToken: deps.tokenProvider.generateAccessToken(payload),
      })
    },

    async me(userId: string): Promise<Either<DomainError, { id: string; email: string; name: string; establishmentRoles: Array<{ establishmentId: string; role: string }> }>> {
      const userResult = await deps.userRepository.findById(userId)

      if (isLeft(userResult)) {
        return left(new UnauthorizedError('User not found'))
      }

      const user = userResult.value
      if (!user) {
        return left(new UnauthorizedError('User not found'))
      }

      return right({
        id: user.id,
        email: user.email,
        name: user.name,
        establishmentRoles: user.establishmentRoles,
      })
    },
  }
}

