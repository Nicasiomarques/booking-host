import { z } from 'zod'

export const createExtraItemSchema = z.object({
  name: z.string().trim().min(1).max(255),
  price: z.number().nonnegative().multipleOf(0.01),
  maxQuantity: z.number().int().positive().max(100).default(1),
})

export type CreateExtraItemInput = z.infer<typeof createExtraItemSchema>

export const updateExtraItemSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  price: z.number().nonnegative().multipleOf(0.01).optional(),
  maxQuantity: z.number().int().positive().max(100).optional(),
  active: z.boolean().optional(),
})

export type UpdateExtraItemInput = z.infer<typeof updateExtraItemSchema>
