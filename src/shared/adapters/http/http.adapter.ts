import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { isProduction } from '#config/app.config.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          '*.password',
          '*.passwordHash',
          '*.token',
          '*.accessToken',
          '*.refreshToken',
        ],
        remove: true,
      },
      ...(isProduction ? {} : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }),
    },
    ajv: {
      customOptions: {
        strict: 'log',
        keywords: ['example'],
      },
    },
  })

  // Security plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
  await app.register(helmet)
  await app.register(cookie)

  // Rate limiting for auth endpoints (prevent brute force attacks)
  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Please try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
      },
    }),
  })

  // OpenAPI documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Booking Service API',
        description: 'API for managing bookings, establishments, services, and availabilities',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Development server' },
      ],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Establishments', description: 'Establishment management' },
        { name: 'Services', description: 'Service management' },
        { name: 'Extras', description: 'Extra items management' },
        { name: 'Availabilities', description: 'Availability slots management' },
        { name: 'Bookings', description: 'Booking management' },
        { name: 'Rooms', description: 'Room management for hotel services' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  })

  // Custom plugins - ORDER MATTERS: prisma must be registered before services
  await app.register(import('./plugins/prisma.plugin.js'))
  await app.register(import('./plugins/services.plugin.js'))
  await app.register(import('./plugins/error-handler.plugin.js'))

  // Endpoints
  await app.register(import('#features/auth/adapters/endpoints.js'), { prefix: '/v1/auth' })
  await app.register(import('#features/establishment/adapters/endpoints.js'), { prefix: '/v1/establishments' })
  await app.register(import('#features/service/adapters/endpoints.js'), { prefix: '/v1' })
  await app.register(import('#features/extra-item/adapters/endpoints.js'), { prefix: '/v1' })
  await app.register(import('#features/availability/adapters/endpoints.js'), { prefix: '/v1' })
  await app.register(import('#features/booking/adapters/endpoints.js'), { prefix: '/v1' })
  await app.register(import('#features/room/adapters/endpoints.js'), { prefix: '/v1' })

  // Health check
  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
