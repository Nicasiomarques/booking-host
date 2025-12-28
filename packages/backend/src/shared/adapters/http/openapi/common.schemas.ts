import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().openapi({ example: 'NOT_FOUND' }),
    message: z.string().openapi({ example: 'Resource not found' }),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
}).openapi('ErrorResponse', {
  example: {
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  },
})

export const SuccessResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
}).openapi('SuccessResponse', {
  example: {
    success: true,
  },
})

export const PaginationMetaSchema = z.object({
  total: z.number().int().openapi({ example: 25 }),
  page: z.number().int().openapi({ example: 1 }),
  limit: z.number().int().openapi({ example: 10 }),
  totalPages: z.number().int().openapi({ example: 3 }),
}).openapi('PaginationMeta')

export const TimestampFieldsSchema = z.object({
  createdAt: z.iso.datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
  updatedAt: z.iso.datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>
