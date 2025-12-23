import { z } from 'zod'

const appConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(3000),
  host: z.string().default('0.0.0.0'),
})

export const appConfig = appConfigSchema.parse({
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  host: process.env.HOST,
})

export const isProduction = appConfig.nodeEnv === 'production'
export const isDevelopment = appConfig.nodeEnv === 'development'
export const isTest = appConfig.nodeEnv === 'test'
