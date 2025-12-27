import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(255).openapi({
    description: 'Service name',
    example: 'Deep Tissue Massage',
  }),
  description: z.string().trim().max(1000).optional().openapi({
    description: 'Service description',
    example: 'A therapeutic massage targeting deep muscle layers.',
  }),
  basePrice: z.number().positive().multipleOf(0.01).openapi({
    description: 'Base price in currency units',
    example: 150.00,
  }),
  durationMinutes: z.number().int().positive().max(1440).openapi({
    description: 'Duration in minutes',
    example: 60,
  }),
  capacity: z.number().int().positive().max(1000).default(1).openapi({
    description: 'Maximum capacity per slot',
    example: 1,
  }),
  type: z.enum(['SERVICE', 'HOTEL', 'CINEMA']).default('SERVICE').optional().openapi({
    description: 'Service type',
    example: 'SERVICE',
  }),
}).openapi('CreateServiceInput', {
  example: {
    name: 'Deep Tissue Massage',
    description: 'A therapeutic massage targeting deep muscle layers.',
    basePrice: 150.00,
    durationMinutes: 60,
    capacity: 1,
  },
})

export const updateServiceSchema = z.object({
  name: z.string().trim().min(1).max(255).optional().openapi({
    description: 'Service name',
    example: 'Deep Tissue Massage - Premium',
  }),
  description: z.string().trim().max(1000).optional().openapi({
    description: 'Service description',
  }),
  basePrice: z.number().positive().multipleOf(0.01).optional().openapi({
    description: 'Base price in currency units',
    example: 180.00,
  }),
  durationMinutes: z.number().int().positive().max(1440).optional().openapi({
    description: 'Duration in minutes',
    example: 90,
  }),
  capacity: z.number().int().positive().max(1000).optional().openapi({
    description: 'Maximum capacity per slot',
  }),
  type: z.enum(['SERVICE', 'HOTEL', 'CINEMA']).optional().openapi({
    description: 'Service type',
    example: 'SERVICE',
  }),
  active: z.boolean().optional().openapi({
    description: 'Whether the service is active',
    example: true,
  }),
}).openapi('UpdateServiceInput', {
  example: {
    name: 'Deep Tissue Massage - Premium',
    description: 'An enhanced therapeutic massage with aromatherapy.',
    basePrice: 180.00,
    durationMinutes: 90,
    capacity: 1,
    active: true,
  },
})

export const serviceResponseSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  establishmentId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440001' }),
  name: z.string().openapi({ example: 'Deep Tissue Massage' }),
  description: z.string().nullable().openapi({ example: 'A therapeutic massage...' }),
  basePrice: z.number().openapi({ example: 150.00 }),
  durationMinutes: z.number().int().openapi({ example: 60 }),
  capacity: z.number().int().openapi({ example: 1 }),
  type: z.enum(['SERVICE', 'HOTEL', 'CINEMA']).openapi({ example: 'SERVICE' }),
  active: z.boolean().openapi({ example: true }),
  createdAt: z.string().datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
}).openapi('ServiceResponse', {
  example: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    establishmentId: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Deep Tissue Massage',
    description: 'A therapeutic massage targeting deep muscle layers.',
    basePrice: 150.00,
    durationMinutes: 60,
    capacity: 1,
    active: true,
    createdAt: '2025-01-15T10:30:00.000Z',
    updatedAt: '2025-01-15T10:30:00.000Z',
  },
})

export const serviceIdParamSchema = z.object({
  serviceId: z.string().uuid().openapi({
    description: 'Service UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  }),
}).openapi('ServiceIdParam')

export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
export type ServiceResponse = z.infer<typeof serviceResponseSchema>
