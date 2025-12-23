import { z } from 'zod'

const jwtConfigSchema = z.object({
  accessSecret: z.string().min(32),
  refreshSecret: z.string().min(32),
  accessExpiresIn: z.string().default('15m'),
  refreshExpiresIn: z.string().default('7d'),
  issuer: z.string().default('booking-service'),
  audience: z.string().default('booking-api'),
})

export const jwtConfig = jwtConfigSchema.parse({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
})
