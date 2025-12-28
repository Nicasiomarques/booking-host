/**
 * Payload structure for access tokens
 */
export interface TokenPayload {
  userId: string
  email: string
  establishmentRoles: Array<{
    establishmentId: string
    role: 'OWNER' | 'STAFF'
  }>
}

import type { Either } from '#shared/domain/index.js'
import type { UnauthorizedError } from '#shared/domain/index.js'

/**
 * Port interface for JWT/token operations.
 * Abstracts the underlying token library (jsonwebtoken, jose, etc.)
 */
export interface TokenProviderPort {
  /**
   * Generate a short-lived access token
   */
  generateAccessToken(payload: TokenPayload): string

  /**
   * Generate a long-lived refresh token
   */
  generateRefreshToken(userId: string): string

  /**
   * Verify and decode an access token
   * Returns Either<UnauthorizedError, TokenPayload>
   */
  verifyAccessToken(token: string): Either<UnauthorizedError, TokenPayload>

  /**
   * Verify and decode a refresh token
   * Returns Either<UnauthorizedError, { userId: string }>
   */
  verifyRefreshToken(token: string): Either<UnauthorizedError, { userId: string }>
}

