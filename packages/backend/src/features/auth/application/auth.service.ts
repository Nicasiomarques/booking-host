import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'
import type * as AuthDomain from '../domain/index.js'

export const createAuthService = (deps: {
  userRepository: Ports.UserRepositoryPort
  passwordHasher: Ports.PasswordHasherPort
  tokenProvider: Ports.TokenProviderPort
  errorHandler: Ports.RepositoryErrorHandlerPort
}) => {
  const generateAuthResult = (user: Domain.UserWithRoles): AuthDomain.AuthResult => {
    const payload: Ports.TokenPayload = {
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
    async register(input: AuthDomain.RegisterInput): Promise<Domain.Either<Domain.DomainError, AuthDomain.AuthResult>> {
      const passwordHash = await deps.passwordHasher.hash(input.password)

      const userResult = await deps.userRepository.create({
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        address: input.address,
      })

      if (DomainValues.isLeft(userResult)) {
        const dbError = deps.errorHandler.analyze(userResult.value)
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return DomainValues.left(new DomainValues.ConflictError('Email already exists'))
        }
        return userResult
      }

      return DomainValues.right(generateAuthResult(userResult.value))
    },

    async login(input: AuthDomain.LoginInput): Promise<Domain.Either<Domain.DomainError, AuthDomain.AuthResult>> {
      const userResult = await deps.userRepository.findByEmail(input.email)

      if (DomainValues.isLeft(userResult)) {
        return DomainValues.left(new DomainValues.UnauthorizedError('Invalid credentials'))
      }

      const user = userResult.value
      if (!user) {
        return DomainValues.left(new DomainValues.UnauthorizedError('Invalid credentials'))
      }

      const isValid = await deps.passwordHasher.verify(user.passwordHash, input.password)

      if (!isValid) {
        return DomainValues.left(new DomainValues.UnauthorizedError('Invalid credentials'))
      }

      if (await deps.passwordHasher.needsRehash(user.passwordHash)) {
        const newHash = await deps.passwordHasher.hash(input.password)
        await deps.userRepository.update(user.id, { passwordHash: newHash })
      }

      return DomainValues.right(generateAuthResult(user))
    },

    async refresh(refreshToken: string): Promise<Domain.Either<Domain.DomainError, { accessToken: string }>> {
      const tokenResult = deps.tokenProvider.verifyRefreshToken(refreshToken)
      if (DomainValues.isLeft(tokenResult)) {
        return tokenResult
      }

      const { userId } = tokenResult.value
      const userResult = await deps.userRepository.findById(userId)

      if (DomainValues.isLeft(userResult)) {
        return DomainValues.left(new DomainValues.UnauthorizedError('User not found'))
      }

      const user = userResult.value
      if (!user) {
        return DomainValues.left(new DomainValues.UnauthorizedError('User not found'))
      }

      const payload: Ports.TokenPayload = {
        userId: user.id,
        email: user.email,
        establishmentRoles: user.establishmentRoles,
      }

      return DomainValues.right({
        accessToken: deps.tokenProvider.generateAccessToken(payload),
      })
    },

    async me(userId: string): Promise<Domain.Either<Domain.DomainError, { id: string; email: string; name: string; establishmentRoles: Array<{ establishmentId: string; role: string }> }>> {
      const userResult = await deps.userRepository.findById(userId)

      if (DomainValues.isLeft(userResult)) {
        return DomainValues.left(new DomainValues.UnauthorizedError('User not found'))
      }

      const user = userResult.value
      if (!user) {
        return DomainValues.left(new DomainValues.UnauthorizedError('User not found'))
      }

      return DomainValues.right({
        id: user.id,
        email: user.email,
        name: user.name,
        establishmentRoles: user.establishmentRoles,
      })
    },
  }
}

