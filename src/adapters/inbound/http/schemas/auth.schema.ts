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
}).openapi('RegisterInput')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').openapi({
    description: 'User password',
  }),
}).openapi('LoginInput')

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
}).openapi('AuthResponse')

export const refreshResponseSchema = z.object({
  accessToken: z.string().openapi({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  }),
}).openapi('RefreshResponse')

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>
export type RefreshResponse = z.infer<typeof refreshResponseSchema>
