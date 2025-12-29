import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  registerSchema,
  loginSchema,
  authResponseSchema,
  refreshResponseSchema,
  meResponseSchema,
} from './schemas.js'
import type * as AuthDomain from '../domain/index.js'
import { ErrorResponseSchema, SuccessResponseSchema, buildRouteSchema } from '#shared/adapters/http/openapi/index.js'
import { validate, authenticate } from '#shared/adapters/http/middleware/index.js'
import { handleEitherAsync } from '#shared/adapters/http/utils/either-handler.js'
import { isProduction } from '#config/index.js'

export default async function authEndpoints(fastify: FastifyInstance) {
  const { auth: authService } = fastify.services

  const REFRESH_TOKEN_COOKIE = 'refreshToken'
  const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/v1/auth/refresh',
    maxAge: 7 * 24 * 60 * 60,
  }

  const authRateLimit = {
    config: {
      rateLimit: {
        max: isProduction ? 5 : 100,
        timeWindow: '1 minute',
      },
    },
  }

  fastify.post<{ Body: AuthDomain.RegisterInput }>(
    '/register',
    {
      schema: buildRouteSchema({
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Creates a new user account and returns authentication tokens. The refresh token is set as an HttpOnly cookie.',
        body: registerSchema,
        responses: {
          200: { description: 'User registered successfully', schema: authResponseSchema },
          409: { description: 'Email already exists', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [validate(registerSchema)],
      ...authRateLimit,
    },
    async (request: FastifyRequest<{ Body: AuthDomain.RegisterInput }>, reply: FastifyReply) => {
      return handleEitherAsync(
        authService.register(request.body),
        reply,
        (result) => {
          reply.setCookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS)
          return {
            accessToken: result.accessToken,
            user: result.user,
          }
        }
      )
    }
  )

  fastify.post<{ Body: AuthDomain.LoginInput }>(
    '/login',
    {
      schema: buildRouteSchema({
        tags: ['Auth'],
        summary: 'Authenticate user',
        description: 'Authenticates a user with email and password. Returns access token and sets refresh token as HttpOnly cookie.',
        body: loginSchema,
        responses: {
          200: { description: 'Login successful', schema: authResponseSchema },
          401: { description: 'Invalid credentials', schema: ErrorResponseSchema },
          422: { description: 'Validation error', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [validate(loginSchema)],
      ...authRateLimit,
    },
    async (request: FastifyRequest<{ Body: AuthDomain.LoginInput }>, reply: FastifyReply) => {
      return handleEitherAsync(
        authService.login(request.body),
        reply,
        (result) => {
          reply.setCookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS)
          return {
            accessToken: result.accessToken,
            user: result.user,
          }
        }
      )
    }
  )

  fastify.post(
    '/refresh',
    {
      schema: buildRouteSchema({
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Uses the refresh token from HttpOnly cookie to generate a new access token. No request body required.',
        responses: {
          200: { description: 'Token refreshed successfully', schema: refreshResponseSchema },
          401: { description: 'No refresh token or invalid/expired token', schema: ErrorResponseSchema },
        },
      }),
      ...authRateLimit,
    },
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

      return handleEitherAsync(
        authService.refresh(refreshToken),
        reply,
        (result) => ({
          accessToken: result.accessToken,
        })
      )
    }
  )

  fastify.post(
    '/logout',
    {
      schema: buildRouteSchema({
        tags: ['Auth'],
        summary: 'Logout user',
        description: 'Clears the refresh token cookie, effectively logging out the user. No request body required.',
        responses: {
          200: { description: 'Logout successful', schema: SuccessResponseSchema },
        },
      }),
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      reply.clearCookie(REFRESH_TOKEN_COOKIE, {
        path: '/v1/auth/refresh',
      })

      return { success: true }
    }
  )

  fastify.get(
    '/me',
    {
      schema: buildRouteSchema({
        tags: ['Auth'],
        summary: 'Get current user',
        description: 'Returns the currently authenticated user information based on the access token.',
        security: true,
        responses: {
          200: { description: 'Current user information', schema: meResponseSchema },
          401: { description: 'Not authenticated', schema: ErrorResponseSchema },
        },
      }),
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return handleEitherAsync(
        authService.me(request.user.userId),
        reply
      )
    }
  )
}
