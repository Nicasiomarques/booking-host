import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken'
import type { TokenProviderPort, TokenPayload } from '#shared/application/ports/index.js'
import { jwtConfig } from '#config/index.js'
import { UnauthorizedError } from '#shared/domain/index.js'

/**
 * JWT implementation of the TokenProviderPort.
 * Uses jsonwebtoken library with configuration from config/jwt.config.ts
 */
export class JwtTokenProviderAdapter implements TokenProviderPort {
  generateAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: jwtConfig.accessExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }
    return jwt.sign(payload, jwtConfig.accessSecret, options)
  }

  generateRefreshToken(userId: string): string {
    const options: SignOptions = {
      expiresIn: jwtConfig.refreshExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }
    return jwt.sign({ userId, type: 'refresh' }, jwtConfig.refreshSecret, options)
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, jwtConfig.accessSecret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        algorithms: ['HS256'],
      }) as JwtPayload & TokenPayload

      return {
        userId: decoded.userId,
        email: decoded.email,
        establishmentRoles: decoded.establishmentRoles,
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired')
      }
      throw new UnauthorizedError('Invalid token')
    }
  }

  verifyRefreshToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, jwtConfig.refreshSecret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        algorithms: ['HS256'],
      }) as JwtPayload & { userId: string; type: string }

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type')
      }

      return { userId: decoded.userId }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired')
      }
      throw new UnauthorizedError('Invalid refresh token')
    }
  }
}
