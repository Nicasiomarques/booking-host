import { prisma } from '../../../src/shared/adapters/outbound/prisma/prisma.client.js'

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'BLOCKED' | 'CLEANING'

let roomCounter = 0

function generateRoomNumber(): string {
  roomCounter++
  return `${Date.now()}-${roomCounter}`
}

export interface CreateTestRoomOptions {
  serviceId: string
  number?: string
  floor?: number
  description?: string
  status?: RoomStatus
}

export async function createTestRoom(options: CreateTestRoomOptions) {
  const { serviceId, number, floor, description, status = 'AVAILABLE' } = options

  return await prisma.room.create({
    data: {
      serviceId,
      number: number || generateRoomNumber(),
      floor: floor ?? 1,
      description: description || 'Test room',
      status,
    },
  })
}

export async function createTestRoomWithStatus(
  serviceId: string,
  status: RoomStatus,
  overrides?: Partial<CreateTestRoomOptions>
) {
  return await createTestRoom({
    serviceId,
    status,
    ...overrides,
  })
}

export async function getRoomStatus(roomId: string): Promise<RoomStatus | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { status: true },
  })
  return room?.status as RoomStatus | null
}


