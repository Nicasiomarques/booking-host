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
   * @throws UnauthorizedError if token is invalid or expired
   */
  verifyAccessToken(token: string): TokenPayload

  /**
   * Verify and decode a refresh token
   * @throws UnauthorizedError if token is invalid or expired
   */
  verifyRefreshToken(token: string): { userId: string }
}

