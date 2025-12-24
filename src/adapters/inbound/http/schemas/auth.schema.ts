import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { emailSchema } from './common.schema.js'

extendZodWithOpenApi(z)

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (val) => /[A-Z]/.test(val) && /[0-9]/.test(val),
    'Password must contain at least one uppercase letter and one number'
  )
  .openapi({
    description: 'Password with at least 8 characters, one uppercase and one number',
    example: 'SecurePass123',
  })

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).openapi({
    description: 'User full name',
    example: 'John Doe',
  }),
}).openapi('RegisterInput', {
  example: {
    email: 'user@example.com',
    password: 'SecurePass123',
    name: 'John Doe',
  },
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').openapi({
    description: 'User password',
    example: 'SecurePass123',
  }),
}).openapi('LoginInput', {
  example: {
    email: 'user@example.com',
    password: 'SecurePass123',
  },
})

export const authResponseSchema = z.object({
  accessToken: z.string().openapi({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  }),
  refreshToken: z.string().openapi({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  }),
  user: z.object({
    id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    email: z.string().email().openapi({ example: 'user@example.com' }),
    name: z.string().openapi({ example: 'John Doe' }),
  }),
}).openapi('AuthResponse', {
  example: {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE3MDUzMTI2MDB9.abc123',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE3MDUzMTI2MDB9.xyz789',
    user: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: 'John Doe',
    },
  },
})

export const refreshResponseSchema = z.object({
  accessToken: z.string().openapi({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  }),
}).openapi('RefreshResponse', {
  example: {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE3MDUzMTI2MDB9.newtoken',
  },
})

export const meResponseSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  email: z.string().email().openapi({ example: 'user@example.com' }),
  name: z.string().openapi({ example: 'John Doe' }),
  establishmentRoles: z.array(z.object({
    establishmentId: z.string().uuid(),
    role: z.enum(['OWNER', 'STAFF']),
  })).openapi({
    example: [{ establishmentId: '550e8400-e29b-41d4-a716-446655440001', role: 'OWNER' }],
  }),
}).openapi('MeResponse', {
  example: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    name: 'John Doe',
    establishmentRoles: [{ establishmentId: '550e8400-e29b-41d4-a716-446655440001', role: 'OWNER' }],
  },
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>
export type RefreshResponse = z.infer<typeof refreshResponseSchema>
export type MeResponse = z.infer<typeof meResponseSchema>
