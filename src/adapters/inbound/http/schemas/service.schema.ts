import { z } from 'zod'

export const createServiceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  basePrice: z.number().positive().multipleOf(0.01),
  durationMinutes: z.number().int().positive().max(1440),
  capacity: z.number().int().positive().max(1000).default(1),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>

export const updateServiceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  basePrice: z.number().positive().multipleOf(0.01).optional(),
  durationMinutes: z.number().int().positive().max(1440).optional(),
  capacity: z.number().int().positive().max(1000).optional(),
  active: z.boolean().optional(),
})

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
