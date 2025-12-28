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

export class AuthService {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenProvider: TokenProviderPort,
    private readonly errorHandler: RepositoryErrorHandlerPort
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const passwordHash = await this.passwordHasher.hash(input.password)

    try {
      const user = await this.userRepository.create({
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        address: input.address,
      })

      return this.generateAuthResult(user)
    } catch (error) {
      const dbError = this.errorHandler.analyze(error)
      if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
        throw new ConflictError('Email already exists')
      }
      throw error
    }
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(input.email)

    if (!user) throw new UnauthorizedError('Invalid credentials')

    const isValid = await this.passwordHasher.verify(user.passwordHash, input.password)

    if (!isValid) throw new UnauthorizedError('Invalid credentials')

    if (await this.passwordHasher.needsRehash(user.passwordHash)) {
      const newHash = await this.passwordHasher.hash(input.password)
      await this.userRepository.update(user.id, { passwordHash: newHash })
    }

    return this.generateAuthResult(user)
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const { userId } = this.tokenProvider.verifyRefreshToken(refreshToken)

    const user = await this.userRepository.findById(userId)

    if (!user) throw new UnauthorizedError('User not found')

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      establishmentRoles: user.establishmentRoles,
    }

    return {
      accessToken: this.tokenProvider.generateAccessToken(payload),
    }
  }

  async me(userId: string): Promise<{ id: string; email: string; name: string; establishmentRoles: Array<{ establishmentId: string; role: string }> }> {
    const user = await this.userRepository.findById(userId)

    if (!user) throw new UnauthorizedError('User not found')

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      establishmentRoles: user.establishmentRoles,
    }
  }

  private generateAuthResult(user: UserWithRoles): AuthResult {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      establishmentRoles: user.establishmentRoles,
    }

    return {
      accessToken: this.tokenProvider.generateAccessToken(payload),
      refreshToken: this.tokenProvider.generateRefreshToken(user.id),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }
  }
}

