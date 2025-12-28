import { FastifyInstance } from 'fastify'
import authRoutes from '#features/auth/adapters/http/index.js'
import establishmentRoutes from '#features/establishment/adapters/http/index.js'
import serviceRoutes from '#features/service/adapters/http/index.js'
import extraItemRoutes from '#features/extra-item/adapters/http/index.js'
import availabilityRoutes from '#features/availability/adapters/http/index.js'
import bookingRoutes from '#features/booking/adapters/http/index.js'
import roomRoutes from '#features/room/adapters/http/index.js'

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes)
  await app.register(establishmentRoutes)
  await app.register(serviceRoutes)
  await app.register(extraItemRoutes)
  await app.register(availabilityRoutes)
  await app.register(bookingRoutes)
  await app.register(roomRoutes)
}

