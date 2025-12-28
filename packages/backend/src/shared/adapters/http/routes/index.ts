import { FastifyInstance } from 'fastify'

export async function registerRoutes(app: FastifyInstance): Promise<void> { 
  const features = [
    'auth',
    'establishment',
    'service',
    'extra-item',
    'availability',
    'booking',
    'room',
  ] as const
  
  const routeModules = features.map((feature) => () => import(`#features/${feature}/adapters/http/index.js`))
  await Promise.all(routeModules.map(async (loadRoute) => {
    const mod = await loadRoute()
    await app.register(mod.default)
  }))
}
