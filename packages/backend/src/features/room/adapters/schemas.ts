import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const createRoomSchema = z
  .object({
    number: z.string().min(1).max(50).openapi({
      description: 'Room number or identifier',
      example: '101',
    }),
    floor: z.number().int().min(0).max(200).optional().openapi({
      description: 'Floor number where the room is located',
      example: 1,
    }),
    description: z.string().max(500).optional().openapi({
      description: 'Room description',
      example: 'Standard room with ocean view',
    }),
    capacity: z.number().int().positive().optional().openapi({
      description: 'Maximum capacity of people',
      example: 2,
    }),
    roomType: z.enum(['SINGLE', 'DOUBLE', 'TWIN', 'SUITE', 'FAMILY', 'OTHER']).optional().openapi({
      description: 'Type of room',
      example: 'DOUBLE',
    }),
    bedType: z.string().trim().max(100).optional().openapi({
      description: 'Type of bed',
      example: 'King Size',
    }),
    amenities: z.array(z.string()).optional().openapi({
      description: 'Room amenities',
      example: ['WiFi', 'TV', 'Ar Condicionado', 'Frigobar'],
    }),
    maxOccupancy: z.number().int().positive().optional().openapi({
      description: 'Maximum occupancy (adults + children)',
      example: 3,
    }),
  })
  .openapi({
    title: 'CreateRoomInput',
    description: 'Input for creating a new room',
  })

export const updateRoomSchema = z
  .object({
    number: z.string().min(1).max(50).optional().openapi({
      description: 'Room number or identifier',
      example: '101',
    }),
    floor: z.number().int().min(0).max(200).optional().openapi({
      description: 'Floor number where the room is located',
      example: 1,
    }),
    description: z.string().max(500).optional().openapi({
      description: 'Room description',
      example: 'Standard room with ocean view',
    }),
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'BLOCKED']).optional().openapi({
      description: 'Current status of the room',
      example: 'AVAILABLE',
    }),
    capacity: z.number().int().positive().optional().openapi({
      description: 'Maximum capacity of people',
      example: 2,
    }),
    roomType: z.enum(['SINGLE', 'DOUBLE', 'TWIN', 'SUITE', 'FAMILY', 'OTHER']).optional().openapi({
      description: 'Type of room',
      example: 'DOUBLE',
    }),
    bedType: z.string().trim().max(100).optional().openapi({
      description: 'Type of bed',
      example: 'King Size',
    }),
    amenities: z.array(z.string()).optional().openapi({
      description: 'Room amenities',
      example: ['WiFi', 'TV', 'Ar Condicionado', 'Frigobar'],
    }),
    maxOccupancy: z.number().int().positive().optional().openapi({
      description: 'Maximum occupancy (adults + children)',
      example: 3,
    }),
  })
  .openapi({
    title: 'UpdateRoomInput',
    description: 'Input for updating a room',
  })

export const roomResponseSchema = z
  .object({
    id: z.string().uuid(),
    serviceId: z.string().uuid(),
    number: z.string(),
    floor: z.number().nullable(),
    description: z.string().nullable(),
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'BLOCKED']),
    capacity: z.number().int().nullable().optional(),
    roomType: z.enum(['SINGLE', 'DOUBLE', 'TWIN', 'SUITE', 'FAMILY', 'OTHER']).nullable().optional(),
    bedType: z.string().nullable().optional(),
    amenities: z.array(z.string()).nullable().optional(),
    maxOccupancy: z.number().int().nullable().optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi({
    title: 'RoomResponse',
    description: 'Room information',
  })

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>
export type RoomResponse = z.infer<typeof roomResponseSchema>

