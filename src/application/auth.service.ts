import { Prisma } from '@prisma/client'
import type { UserWithRoles } from '#domain/index.js'
import { ConflictError, UnauthorizedError } from '#domain/index.js'
import { UserRepository } from '#adapters/outbound/prisma/index.js'
import { jwtAdapter, TokenPayload } from '#adapters/outbound/token/index.js'
import { passwordService } from './password.service.js'

export interface RegisterInput {
  email: string
  password: string
  name: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    name: string
  }
}

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const passwordHash = await passwordService.hash(input.password)

    try {
      const user = await this.userRepository.create({
        email: input.email,
        passwordHash,
        name: input.name,
      })

      return this.generateAuthResult(user)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictError('Email already exists')
        }
      }
      throw error
    }
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(input.email)

    if (!user) {
      throw new UnauthorizedError('Invalid credentials')
    }

    const isValid = await passwordService.verify(user.passwordHash, input.password)

    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials')
    }

    if (await passwordService.needsRehash(user.passwordHash)) {
      const newHash = await passwordService.hash(input.password)
      await this.userRepository.update(user.id, { passwordHash: newHash })
    }

    return this.generateAuthResult(user)
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const { userId } = jwtAdapter.verifyRefreshToken(refreshToken)

    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      establishmentRoles: user.establishmentRoles,
    }

    return {
      accessToken: jwtAdapter.generateAccessToken(payload),
    }
  }

  private generateAuthResult(user: UserWithRoles): AuthResult {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      establishmentRoles: user.establishmentRoles,
    }

    return {
      accessToken: jwtAdapter.generateAccessToken(payload),
      refreshToken: jwtAdapter.generateRefreshToken(user.id),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }
  }
}
