import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const createEstablishmentSchema = z.object({
  name: z.string().trim().min(1).max(255).openapi({
    description: 'Establishment name',
    example: 'Wellness Spa Center',
  }),
  description: z.string().trim().max(1000).optional().openapi({
    description: 'Detailed description of the establishment',
    example: 'A premium spa offering relaxation and wellness services.',
  }),
  address: z.string().trim().min(1).max(500).openapi({
    description: 'Full address of the establishment',
    example: '123 Main Street, Downtown, City 12345',
  }),
  timezone: z.string().trim().default('UTC').openapi({
    description: 'IANA timezone identifier',
    example: 'America/Sao_Paulo',
  }),
}).openapi('CreateEstablishmentInput', {
  example: {
    name: 'Wellness Spa Center',
    description: 'A premium spa offering relaxation and wellness services.',
    address: '123 Main Street, Downtown, City 12345',
    timezone: 'America/Sao_Paulo',
  },
})

export const updateEstablishmentSchema = z.object({
  name: z.string().trim().min(1).max(255).optional().openapi({
    description: 'Establishment name',
    example: 'Wellness Spa Center - Updated',
  }),
  description: z.string().trim().max(1000).optional().openapi({
    description: 'Detailed description',
    example: 'Updated description of the spa center.',
  }),
  address: z.string().trim().min(1).max(500).optional().openapi({
    description: 'Full address',
    example: '456 New Avenue, Uptown, City 54321',
  }),
  timezone: z.string().trim().optional().openapi({
    description: 'IANA timezone identifier',
    example: 'America/New_York',
  }),
  active: z.boolean().optional().openapi({
    description: 'Whether the establishment is active',
    example: true,
  }),
}).openapi('UpdateEstablishmentInput', {
  example: {
    name: 'Wellness Spa Center - Updated',
    description: 'Updated description of the spa center.',
    address: '456 New Avenue, Uptown, City 54321',
    timezone: 'America/New_York',
    active: true,
  },
})

export const establishmentResponseSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  name: z.string().openapi({ example: 'Wellness Spa Center' }),
  description: z.string().nullable().openapi({ example: 'A premium spa...' }),
  address: z.string().openapi({ example: '123 Main Street, Downtown, City 12345' }),
  timezone: z.string().openapi({ example: 'America/Sao_Paulo' }),
  active: z.boolean().openapi({ example: true }),
  createdAt: z.string().datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
}).openapi('EstablishmentResponse', {
  example: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Wellness Spa Center',
    description: 'A premium spa offering relaxation and wellness services.',
    address: '123 Main Street, Downtown, City 12345',
    timezone: 'America/Sao_Paulo',
    active: true,
    createdAt: '2025-01-15T10:30:00.000Z',
    updatedAt: '2025-01-15T10:30:00.000Z',
  },
})

export const establishmentWithRoleResponseSchema = establishmentResponseSchema.extend({
  role: z.enum(['OWNER', 'ADMIN', 'STAFF']).openapi({
    description: 'User role in this establishment',
    example: 'OWNER',
  }),
}).openapi('EstablishmentWithRoleResponse', {
  example: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Wellness Spa Center',
    description: 'A premium spa offering relaxation and wellness services.',
    address: '123 Main Street, Downtown, City 12345',
    timezone: 'America/Sao_Paulo',
    active: true,
    createdAt: '2025-01-15T10:30:00.000Z',
    updatedAt: '2025-01-15T10:30:00.000Z',
    role: 'OWNER',
  },
})

export const establishmentIdParamSchema = z.object({
  establishmentId: z.string().uuid().openapi({
    description: 'Establishment UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  }),
}).openapi('EstablishmentIdParam')

export type CreateEstablishmentInput = z.infer<typeof createEstablishmentSchema>
export type UpdateEstablishmentInput = z.infer<typeof updateEstablishmentSchema>
export type EstablishmentResponse = z.infer<typeof establishmentResponseSchema>
