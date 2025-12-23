import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const createExtraItemSchema = z.object({
  name: z.string().trim().min(1).max(255).openapi({
    description: 'Extra item name',
    example: 'Hot Stones',
  }),
  price: z.number().nonnegative().multipleOf(0.01).openapi({
    description: 'Price (can be 0 for free extras)',
    example: 25.00,
  }),
  maxQuantity: z.number().int().positive().max(100).default(1).openapi({
    description: 'Maximum quantity per booking',
    example: 2,
  }),
}).openapi('CreateExtraItemInput')

export const updateExtraItemSchema = z.object({
  name: z.string().trim().min(1).max(255).optional().openapi({
    description: 'Extra item name',
    example: 'Premium Hot Stones',
  }),
  price: z.number().nonnegative().multipleOf(0.01).optional().openapi({
    description: 'Price',
    example: 30.00,
  }),
  maxQuantity: z.number().int().positive().max(100).optional().openapi({
    description: 'Maximum quantity per booking',
  }),
  active: z.boolean().optional().openapi({
    description: 'Whether the extra item is active',
    example: true,
  }),
}).openapi('UpdateExtraItemInput')

export const extraItemResponseSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  serviceId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440001' }),
  name: z.string().openapi({ example: 'Hot Stones' }),
  price: z.number().openapi({ example: 25.00 }),
  maxQuantity: z.number().int().openapi({ example: 2 }),
  active: z.boolean().openapi({ example: true }),
  createdAt: z.string().datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
}).openapi('ExtraItemResponse')

export const extraIdParamSchema = z.object({
  extraId: z.string().uuid().openapi({
    description: 'Extra item UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  }),
}).openapi('ExtraIdParam')

export type CreateExtraItemInput = z.infer<typeof createExtraItemSchema>
export type UpdateExtraItemInput = z.infer<typeof updateExtraItemSchema>
export type ExtraItemResponse = z.infer<typeof extraItemResponseSchema>
