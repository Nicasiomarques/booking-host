import { z } from 'zod'

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

export const createAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:MM format'),
  endTime: z.string().regex(timeRegex, 'End time must be in HH:MM format'),
  capacity: z.number().int().positive().max(1000),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'Start time must be before end time', path: ['endTime'] }
)

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>

export const updateAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:MM format').optional(),
  endTime: z.string().regex(timeRegex, 'End time must be in HH:MM format').optional(),
  capacity: z.number().int().positive().max(1000).optional(),
})

export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>

export const queryAvailabilitySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
})

export type QueryAvailabilityInput = z.infer<typeof queryAvailabilitySchema>
