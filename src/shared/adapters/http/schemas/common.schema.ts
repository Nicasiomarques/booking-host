import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const uuidSchema = z.string().uuid().openapi({
  description: 'UUID identifier',
  example: '550e8400-e29b-41d4-a716-446655440000',
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1).openapi({
    description: 'Page number',
    example: 1,
  }),
  limit: z.coerce.number().int().positive().max(100).default(20).openapi({
    description: 'Items per page',
    example: 20,
  }),
}).openapi('PaginationQuery')

export const emailSchema = z.string().email().transform(s => s.toLowerCase().trim()).openapi({
  description: 'Email address',
  example: 'user@example.com',
})

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional().openapi({
    description: 'Start date filter',
  }),
  endDate: z.coerce.date().optional().openapi({
    description: 'End date filter',
  }),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate
    }
    return true
  },
  { message: 'startDate must be before endDate' }
)

export type Pagination = z.infer<typeof paginationSchema>
export type DateRange = z.infer<typeof dateRangeSchema>

