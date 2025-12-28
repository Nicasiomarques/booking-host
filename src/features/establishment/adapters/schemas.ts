import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const createEstablishmentSchema = z.object({
  name: z.string().trim().min(1).max(255).openapi({
    description: 'Establishment name',
    example: 'Wellness Spa Center',
  }),
  description: z.string().trim().max(1000).optional().openapi({
    description: 'Detailed description of the establishment',
    example: 'A premium spa offering relaxation and wellness services.',
  }),
  address: z.string().trim().min(1).max(500).openapi({
    description: 'Full address of the establishment',
    example: '123 Main Street, Downtown, City 12345',
  }),
  timezone: z.string().trim().default('UTC').openapi({
    description: 'IANA timezone identifier',
    example: 'America/Sao_Paulo',
  }),
  phone: z.string().trim().max(50).optional().openapi({
    description: 'Contact phone number',
    example: '+55 11 98765-4321',
  }),
  email: z.string().email().trim().max(255).optional().openapi({
    description: 'Contact email address',
    example: 'contato@spa.com.br',
  }),
  city: z.string().trim().max(100).optional().openapi({
    description: 'City',
    example: 'São Paulo',
  }),
  state: z.string().trim().max(100).optional().openapi({
    description: 'State/Province',
    example: 'SP',
  }),
  website: z.string().url().trim().max(500).optional().openapi({
    description: 'Website URL',
    example: 'https://www.spa.com.br',
  }),
  taxId: z.string().trim().max(50).optional().openapi({
    description: 'Tax ID (CNPJ/CPF)',
    example: '12.345.678/0001-90',
  }),
}).openapi('CreateEstablishmentInput', {
  example: {
    name: 'Wellness Spa Center',
    description: 'A premium spa offering relaxation and wellness services.',
    address: '123 Main Street, Downtown, City 12345',
    timezone: 'America/Sao_Paulo',
  },
})

export const updateEstablishmentSchema = z.object({
  name: z.string().trim().min(1).max(255).optional().openapi({
    description: 'Establishment name',
    example: 'Wellness Spa Center - Updated',
  }),
  description: z.string().trim().max(1000).optional().openapi({
    description: 'Detailed description',
    example: 'Updated description of the spa center.',
  }),
  address: z.string().trim().min(1).max(500).optional().openapi({
    description: 'Full address',
    example: '456 New Avenue, Uptown, City 54321',
  }),
  timezone: z.string().trim().optional().openapi({
    description: 'IANA timezone identifier',
    example: 'America/New_York',
  }),
  active: z.boolean().optional().openapi({
    description: 'Whether the establishment is active',
    example: true,
  }),
  phone: z.string().trim().max(50).optional().openapi({
    description: 'Contact phone number',
    example: '+55 11 98765-4321',
  }),
  email: z.string().email().trim().max(255).optional().openapi({
    description: 'Contact email address',
    example: 'contato@spa.com.br',
  }),
  city: z.string().trim().max(100).optional().openapi({
    description: 'City',
    example: 'São Paulo',
  }),
  state: z.string().trim().max(100).optional().openapi({
    description: 'State/Province',
    example: 'SP',
  }),
  website: z.string().url().trim().max(500).optional().openapi({
    description: 'Website URL',
    example: 'https://www.spa.com.br',
  }),
  taxId: z.string().trim().max(50).optional().openapi({
    description: 'Tax ID (CNPJ/CPF)',
    example: '12.345.678/0001-90',
  }),
}).openapi('UpdateEstablishmentInput', {
  example: {
    name: 'Wellness Spa Center - Updated',
    description: 'Updated description of the spa center.',
    address: '456 New Avenue, Uptown, City 54321',
    timezone: 'America/New_York',
    active: true,
  },
})

export const establishmentResponseSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  name: z.string().openapi({ example: 'Wellness Spa Center' }),
  description: z.string().nullable().openapi({ example: 'A premium spa...' }),
  address: z.string().openapi({ example: '123 Main Street, Downtown, City 12345' }),
  timezone: z.string().openapi({ example: 'America/Sao_Paulo' }),
  active: z.boolean().openapi({ example: true }),
  phone: z.string().nullable().optional().openapi({ example: '+55 11 98765-4321' }),
  email: z.string().email().nullable().optional().openapi({ example: 'contato@spa.com.br' }),
  city: z.string().nullable().optional().openapi({ example: 'São Paulo' }),
  state: z.string().nullable().optional().openapi({ example: 'SP' }),
  website: z.string().url().nullable().optional().openapi({ example: 'https://www.spa.com.br' }),
  taxId: z.string().nullable().optional().openapi({ example: '12.345.678/0001-90' }),
  createdAt: z.string().datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2025-01-15T10:30:00.000Z' }),
}).openapi('EstablishmentResponse', {
  example: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Wellness Spa Center',
    description: 'A premium spa offering relaxation and wellness services.',
    address: '123 Main Street, Downtown, City 12345',
    timezone: 'America/Sao_Paulo',
    active: true,
    phone: '+55 11 98765-4321',
    email: 'contato@spa.com.br',
    city: 'São Paulo',
    state: 'SP',
    website: 'https://www.spa.com.br',
    taxId: '12.345.678/0001-90',
    createdAt: '2025-01-15T10:30:00.000Z',
    updatedAt: '2025-01-15T10:30:00.000Z',
  },
})

export const establishmentWithRoleResponseSchema = establishmentResponseSchema.extend({
  role: z.enum(['OWNER', 'ADMIN', 'STAFF']).openapi({
    description: 'User role in this establishment',
    example: 'OWNER',
  }),
}).openapi('EstablishmentWithRoleResponse', {
  example: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Wellness Spa Center',
    description: 'A premium spa offering relaxation and wellness services.',
    address: '123 Main Street, Downtown, City 12345',
    timezone: 'America/Sao_Paulo',
    active: true,
    createdAt: '2025-01-15T10:30:00.000Z',
    updatedAt: '2025-01-15T10:30:00.000Z',
    role: 'OWNER',
  },
})

export const establishmentIdParamSchema = z.object({
  establishmentId: z.string().uuid().openapi({
    description: 'Establishment UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  }),
}).openapi('EstablishmentIdParam')

export type CreateEstablishmentInput = z.infer<typeof createEstablishmentSchema>
export type UpdateEstablishmentInput = z.infer<typeof updateEstablishmentSchema>
export type EstablishmentResponse = z.infer<typeof establishmentResponseSchema>
