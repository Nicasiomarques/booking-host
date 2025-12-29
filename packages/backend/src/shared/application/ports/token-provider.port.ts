import type * as Domain from '#shared/domain/index.js'
export interface TokenPayload {
  userId: string
  email: string
  establishmentRoles: Array<{
    establishmentId: string
    role: 'OWNER' | 'STAFF'
  }>
}

export interface TokenProviderPort {
  generateAccessToken(payload: TokenPayload): string
  generateRefreshToken(userId: string): string
  verifyAccessToken(token: string): Domain.Either<Domain.UnauthorizedError, TokenPayload>
  verifyRefreshToken(token: string): Domain.Either<Domain.UnauthorizedError, { userId: string }>
}

