import jwt, { JwtPayload } from 'jsonwebtoken'
import { jwtConfig } from '../../../config/jwt.config.js'
import { UnauthorizedError } from '../../../domain/errors.js'

export interface TokenPayload {
  userId: string
  email: string
  establishmentRoles: Array<{
    establishmentId: string
    role: 'OWNER' | 'STAFF'
  }>
}

export class JwtAdapter {
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, jwtConfig.accessSecret, {
      expiresIn: jwtConfig.accessExpiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    })
  }

  generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      jwtConfig.refreshSecret,
      {
        expiresIn: jwtConfig.refreshExpiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }
    )
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

export const jwtAdapter = new JwtAdapter()
