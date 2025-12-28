import { PrismaClient, Room as PrismaRoom } from '@prisma/client'
import type { Room, CreateRoomData, UpdateRoomData } from '../../domain/index.js'
import type { RoomStatus, RoomType } from '#shared/domain/index.js'
import { handleArrayFieldForCreate, processUpdateData } from '#shared/adapters/outbound/prisma/base-repository.js'

export type { Room, CreateRoomData, UpdateRoomData }

function toRoom(prismaRoom: PrismaRoom): Room {
  return {
    ...prismaRoom,
    status: prismaRoom.status as RoomStatus,
    roomType: prismaRoom.roomType as RoomType | null,
    amenities: prismaRoom.amenities ? (prismaRoom.amenities as string[]) : null,
  }
}

export const createRoomRepository = (prisma: PrismaClient) => ({
  async create(data: CreateRoomData): Promise<Room> {
    const result = await prisma.room.create({
      data: {
        serviceId: data.serviceId,
        number: data.number,
        floor: data.floor ?? null,
        description: data.description ?? null,
        status: 'AVAILABLE',
        capacity: data.capacity ?? null,
        roomType: data.roomType ?? null,
        bedType: data.bedType ?? null,
        amenities: handleArrayFieldForCreate(data.amenities),
        maxOccupancy: data.maxOccupancy ?? null,
      },
    })
    return toRoom(result)
  },

  async findById(id: string): Promise<Room | null> {
    const result = await prisma.room.findUnique({
      where: { id },
    })
    return result ? toRoom(result) : null
  },

  async findByService(serviceId: string): Promise<Room[]> {
    const results = await prisma.room.findMany({
      where: { serviceId },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    })
    return results.map(toRoom)
  },

  async findAvailableRooms(
    serviceId: string,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<Room[]> {
    // Find rooms that are available and not booked in the date range
    // Only AVAILABLE rooms can be booked (exclude OCCUPIED, CLEANING, MAINTENANCE, BLOCKED)
    // OCCUPIED rooms are excluded because they have active bookings
    // We exclude bookings with status CHECKED_OUT, CANCELLED, NO_SHOW from the overlap check
    const results = await prisma.room.findMany({
      where: {
        serviceId,
        status: 'AVAILABLE', // Only available rooms can be booked
        NOT: {
          bookings: {
            some: {
              status: {
                notIn: ['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'],
              },
              checkInDate: {
                lte: checkOutDate,
              },
              checkOutDate: {
                gte: checkInDate,
              },
            },
          },
        },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    })

    return results.map(toRoom)
  },

  async update(id: string, data: UpdateRoomData): Promise<Room> {
    const updateData: any = {}
    
    if (data.number !== undefined) updateData.number = data.number
    if (data.floor !== undefined) updateData.floor = data.floor ?? null
    if (data.description !== undefined) updateData.description = data.description ?? null
    if (data.status !== undefined) updateData.status = data.status
    if (data.capacity !== undefined) updateData.capacity = data.capacity ?? null
    if (data.roomType !== undefined) updateData.roomType = data.roomType ?? null
    if (data.bedType !== undefined) updateData.bedType = data.bedType ?? null
    if (data.maxOccupancy !== undefined) updateData.maxOccupancy = data.maxOccupancy ?? null
    
    // Process array fields
    const processedData = processUpdateData(updateData, {
      arrayFields: ['amenities'],
    })
    
    const result = await prisma.room.update({
      where: { id },
      data: processedData,
    })
    return toRoom(result)
  },

  async delete(id: string): Promise<Room> {
    const result = await prisma.room.delete({
      where: { id },
    })
    return toRoom(result)
  },

  async hasActiveBookings(id: string): Promise<boolean> {
    const count = await prisma.booking.count({
      where: {
        roomId: id,
        status: {
          notIn: ['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'],
        },
      },
    })
    return count > 0
  },
})

