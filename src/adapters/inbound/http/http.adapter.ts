import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import { isProduction } from '../../../config/app.config.js'

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
  })

  // Security plugins
  await app.register(cors, { origin: true, credentials: true })
  await app.register(helmet)
  await app.register(cookie)

  // Custom plugins
  await app.register(import('./plugins/prisma.plugin.js'))
  await app.register(import('./plugins/error-handler.plugin.js'))

  // Routes
  await app.register(import('./routes/auth.routes.js'), { prefix: '/v1/auth' })

  // Health check
  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
