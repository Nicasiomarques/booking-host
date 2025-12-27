import { PrismaClient, Room as PrismaRoom, Prisma } from '@prisma/client'
import type { Room, CreateRoomData, UpdateRoomData, RoomStatus } from '#domain/entities/index.js'

export type { Room, CreateRoomData, UpdateRoomData }

function toRoom(prismaRoom: PrismaRoom): Room {
  return {
    ...prismaRoom,
    status: prismaRoom.status as RoomStatus,
  }
}

export class RoomRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateRoomData): Promise<Room> {
    const result = await this.prisma.room.create({
      data: {
        serviceId: data.serviceId,
        number: data.number,
        floor: data.floor ?? null,
        description: data.description ?? null,
        status: 'AVAILABLE',
      },
    })
    return toRoom(result)
  }

  async findById(id: string): Promise<Room | null> {
    const result = await this.prisma.room.findUnique({
      where: { id },
    })
    return result ? toRoom(result) : null
  }

  async findByService(serviceId: string): Promise<Room[]> {
    const results = await this.prisma.room.findMany({
      where: { serviceId },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    })
    return results.map(toRoom)
  }

  async findAvailableRooms(
    serviceId: string,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<Room[]> {
    // Find rooms that are available and not booked in the date range
    // Only AVAILABLE rooms can be booked (exclude OCCUPIED, CLEANING, MAINTENANCE, BLOCKED)
    // OCCUPIED rooms are excluded because they have active bookings
    // We exclude bookings with status CHECKED_OUT, CANCELLED, NO_SHOW from the overlap check
    const results = await this.prisma.room.findMany({
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
  }

  async update(id: string, data: UpdateRoomData): Promise<Room> {
    const result = await this.prisma.room.update({
      where: { id },
      data: {
        ...(data.number !== undefined && { number: data.number }),
        ...(data.floor !== undefined && { floor: data.floor ?? null }),
        ...(data.description !== undefined && { description: data.description ?? null }),
        ...(data.status !== undefined && { status: data.status }),
      },
    })
    return toRoom(result)
  }

  async delete(id: string): Promise<Room> {
    const result = await this.prisma.room.delete({
      where: { id },
    })
    return toRoom(result)
  }

  async hasActiveBookings(id: string): Promise<boolean> {
    const count = await this.prisma.booking.count({
      where: {
        roomId: id,
        status: {
          notIn: ['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'],
        },
      },
    })
    return count > 0
  }
}

