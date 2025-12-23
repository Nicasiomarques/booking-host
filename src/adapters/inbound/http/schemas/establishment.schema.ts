import { z } from 'zod'

export const createEstablishmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  address: z.string().min(1).max(500),
  timezone: z.string().default('UTC'),
})

export type CreateEstablishmentInput = z.infer<typeof createEstablishmentSchema>

export const updateEstablishmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  address: z.string().min(1).max(500).optional(),
  timezone: z.string().optional(),
  active: z.boolean().optional(),
})

export type UpdateEstablishmentInput = z.infer<typeof updateEstablishmentSchema>
