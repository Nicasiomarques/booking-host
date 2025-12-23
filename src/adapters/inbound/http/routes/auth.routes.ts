import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { AuthService } from '../../../../application/auth.service.js'
import { UserRepository } from '../../../outbound/prisma/user.repository.js'
import { registerSchema, loginSchema, RegisterInput, LoginInput } from '../schemas/auth.schema.js'
import { validate } from '../middleware/validate.js'
import { isProduction } from '../../../../config/app.config.js'

// Swagger schemas for Auth routes
const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    email: { type: 'string', format: 'email', example: 'user@example.com' },
    name: { type: 'string', example: 'John Doe' },
    createdAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
  },
}

const authResponseSchema = {
  type: 'object',
  properties: {
    accessToken: {
      type: 'string',
      description: 'JWT access token (expires in 15 minutes)',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
    user: userResponseSchema,
  },
}

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Invalid request body' },
        details: { type: 'object' },
      },
    },
  },
}

const registerBodySchema = {
  type: 'object',
  required: ['email', 'password', 'name'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'User email address (will be normalized to lowercase)',
      example: 'user@example.com',
    },
    password: {
      type: 'string',
      minLength: 8,
      description: 'Password (min 8 chars, must contain uppercase and number)',
      example: 'SecurePass123',
    },
    name: {
      type: 'string',
      minLength: 2,
      maxLength: 100,
      description: 'User display name',
      example: 'John Doe',
    },
  },
}

const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'User email address',
      example: 'user@example.com',
    },
    password: {
      type: 'string',
      description: 'User password',
      example: 'SecurePass123',
    },
  },
}

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
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Creates a new user account and returns authentication tokens. The refresh token is set as an HttpOnly cookie.',
        body: registerBodySchema,
        response: {
          200: {
            description: 'User registered successfully',
            ...authResponseSchema,
          },
          409: {
            description: 'Email already exists',
            ...errorResponseSchema,
          },
          422: {
            description: 'Validation error',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [validate(registerSchema)],
      ...authRateLimit,
    },
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
    {
      schema: {
        tags: ['Auth'],
        summary: 'Authenticate user',
        description: 'Authenticates a user with email and password. Returns access token and sets refresh token as HttpOnly cookie.',
        body: loginBodySchema,
        response: {
          200: {
            description: 'Login successful',
            ...authResponseSchema,
          },
          401: {
            description: 'Invalid credentials',
            ...errorResponseSchema,
          },
          422: {
            description: 'Validation error',
            ...errorResponseSchema,
          },
        },
      },
      preHandler: [validate(loginSchema)],
      ...authRateLimit,
    },
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
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Uses the refresh token from HttpOnly cookie to generate a new access token. No request body required.',
        response: {
          200: {
            description: 'Token refreshed successfully',
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                description: 'New JWT access token',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
          401: {
            description: 'No refresh token or invalid/expired token',
            ...errorResponseSchema,
          },
        },
      },
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

      const result = await authService.refresh(refreshToken)

      return {
        accessToken: result.accessToken,
      }
    }
  )

  fastify.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Logout user',
        description: 'Clears the refresh token cookie, effectively logging out the user. No request body required.',
        response: {
          200: {
            description: 'Logout successful',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      reply.clearCookie(REFRESH_TOKEN_COOKIE, {
        path: '/v1/auth/refresh',
      })

      return { success: true }
    }
  )
}
