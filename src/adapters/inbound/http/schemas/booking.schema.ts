import { z } from 'zod'
import { uuidSchema, paginationSchema } from './common.schema.js'

export const createBookingSchema = z.object({
  serviceId: uuidSchema,
  availabilityId: uuidSchema,
  quantity: z.number().int().positive().max(100),
  extras: z
    .array(
      z.object({
        extraItemId: uuidSchema,
        quantity: z.number().int().positive().max(100),
      })
    )
    .optional(),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>

export const listBookingsQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
})

export type ListBookingsQueryInput = z.infer<typeof listBookingsQuerySchema>
