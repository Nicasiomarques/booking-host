import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { AuthService } from '../../../../application/auth.service.js'
import { UserRepository } from '../../../outbound/prisma/user.repository.js'
import { registerSchema, loginSchema, RegisterInput, LoginInput } from '../schemas/auth.schema.js'
import { validate } from '../middleware/validate.js'
import { isProduction } from '../../../../config/app.config.js'

export default async function authRoutes(fastify: FastifyInstance) {
  const userRepository = new UserRepository(fastify.prisma)
  const authService = new AuthService(userRepository)

  const REFRESH_TOKEN_COOKIE = 'refreshToken'
  const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/v1/auth/refresh',
    maxAge: 7 * 24 * 60 * 60,
  }

  // Rate limit config for auth routes (stricter than global)
  // Higher limit in non-production for testing
  const authRateLimit = {
    config: {
      rateLimit: {
        max: isProduction ? 5 : 100,
        timeWindow: '1 minute',
      },
    },
  }

  fastify.post<{ Body: RegisterInput }>(
    '/register',
    { preHandler: [validate(registerSchema)], ...authRateLimit },
    async (request: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) => {
      const result = await authService.register(request.body)

      reply.setCookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS)

      return {
        accessToken: result.accessToken,
        user: result.user,
      }
    }
  )

  fastify.post<{ Body: LoginInput }>(
    '/login',
    { preHandler: [validate(loginSchema)], ...authRateLimit },
    async (request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) => {
      const result = await authService.login(request.body)

      reply.setCookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS)

      return {
        accessToken: result.accessToken,
        user: result.user,
      }
    }
  )

  fastify.post(
    '/refresh',
    { ...authRateLimit },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE]

      if (!refreshToken) {
        return reply.status(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'No refresh token provided',
          },
        })
      }

      const result = await authService.refresh(refreshToken)

      return {
        accessToken: result.accessToken,
      }
    }
  )

  fastify.post(
    '/logout',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      reply.clearCookie(REFRESH_TOKEN_COOKIE, {
        path: '/v1/auth/refresh',
      })

      return { success: true }
    }
  )
}
