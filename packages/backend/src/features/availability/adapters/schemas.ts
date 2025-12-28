import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const createAvailabilitySchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format').openapi({
    description: 'Date in YYYY-MM-DD format',
    example: '2025-01-20',
  }),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:MM format').openapi({
    description: 'Start time in HH:MM format',
    example: '09:00',
  }),
  endTime: z.string().regex(timeRegex, 'End time must be in HH:MM format').openapi({
    description: 'End time in HH:MM format',
    example: '10:00',
  }),
  capacity: z.number().int().positive().max(1000).openapi({
    description: 'Available capacity for this slot',
    example: 5,
  }),
  price: z.number().positive().multipleOf(0.01).optional().openapi({
    description: 'Dynamic price for this slot (overrides service basePrice)',
    example: 250.00,
  }),
  notes: z.string().trim().max(1000).optional().openapi({
    description: 'Notes about this availability slot',
    example: 'Horário com desconto promocional',
  }),
  isRecurring: z.boolean().default(false).optional().openapi({
    description: 'Whether this slot is recurring',
    example: false,
  }),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'Start time must be before end time', path: ['endTime'] }
).openapi('CreateAvailabilityInput', {
  example: {
    date: '2025-01-20',
    startTime: '09:00',
    endTime: '10:00',
    capacity: 5,
  },
})

export const updateAvailabilitySchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format').optional().openapi({
    description: 'Date in YYYY-MM-DD format',
    example: '2025-01-21',
  }),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:MM format').optional().openapi({
    description: 'Start time in HH:MM format',
    example: '10:00',
  }),
  endTime: z.string().regex(timeRegex, 'End time must be in HH:MM format').optional().openapi({
    description: 'End time in HH:MM format',
    example: '11:00',
  }),
  capacity: z.number().int().positive().max(1000).optional().openapi({
    description: 'Available capacity for this slot',
    example: 10,
  }),
  price: z.number().positive().multipleOf(0.01).nullable().optional().openapi({
    description: 'Dynamic price for this slot (overrides service basePrice, null to remove)',
    example: 250.00,
  }),
  notes: z.string().trim().max(1000).optional().openapi({
    description: 'Notes about this availability slot',
    example: 'Horário com desconto promocional',
  }),
  isRecurring: z.boolean().optional().openapi({
    description: 'Whether this slot is recurring',
    example: false,
  }),
}).openapi('UpdateAvailabilityInput', {
  example: {
    date: '2025-01-21',
    startTime: '10:00',
    endTime: '11:00',
    capacity: 10,
  },
})

export const queryAvailabilitySchema = z.object({
  startDate: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format').optional().openapi({
    description: 'Filter by start date',
    example: '2025-01-01',
  }),
  endDate: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format').optional().openapi({
    description: 'Filter by end date',
    example: '2025-01-31',
  }),
}).openapi('QueryAvailabilityInput')

export const availabilityResponseSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  serviceId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440001' }),
  date: z.string().openapi({ example: '2025-01-20' }),
  startTime: z.string().openapi({ example: '09:00' }),
  endTime: z.string().openapi({ example: '10:00' }),
  capacity: z.number().int().openapi({ example: 5 }),
  price: z.number().nullable().optional().openapi({ example: 250.00 }),
  notes: z.string().nullable().optional().openapi({ example: 'Horário com desconto promocional' }),
  isRecurring: z.boolean().openapi({ example: false }),
  createdAt: z.iso.datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
  updatedAt: z.iso.datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
}).openapi('AvailabilityResponse', {
  example: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    serviceId: '550e8400-e29b-41d4-a716-446655440001',
    date: '2025-01-20',
    startTime: '09:00',
    endTime: '10:00',
    capacity: 5,
    createdAt: '2025-01-15T10:30:00.000Z',
    updatedAt: '2025-01-15T10:30:00.000Z',
  },
})

export const availabilityIdParamSchema = z.object({
  availabilityId: z.string().uuid().openapi({
    description: 'Availability UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  }),
}).openapi('AvailabilityIdParam')

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>
export type QueryAvailabilityInput = z.infer<typeof queryAvailabilitySchema>
export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>
