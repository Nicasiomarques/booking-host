import { PrismaClient, Room as PrismaRoom } from '@prisma/client'
import type { Room, CreateRoomData, UpdateRoomData } from '../../domain/index.js'
import type { RoomStatus, RoomType, DomainError, Either } from '#shared/domain/index.js'
import { right, left, fromPromise } from '#shared/domain/index.js'
import { ConflictError, NotFoundError } from '#shared/domain/index.js'
import { handleArrayFieldForCreate, processUpdateData } from '#shared/adapters/outbound/prisma/base-repository.js'
import type { RepositoryErrorHandlerPort } from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type { Room, CreateRoomData, UpdateRoomData }

function toRoom(prismaRoom: PrismaRoom): Room {
  return {
    ...prismaRoom,
    status: prismaRoom.status as RoomStatus,
    roomType: prismaRoom.roomType as RoomType | null,
    amenities: prismaRoom.amenities ? (prismaRoom.amenities as string[]) : null,
  }
}

export const createRoomRepository = (
  prisma: PrismaClient,
  errorHandler: RepositoryErrorHandlerPort
) => ({
  async create(data: CreateRoomData): Promise<Either<DomainError, Room>> {
    return fromPromise(
      prisma.room.create({
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
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.UNIQUE_CONSTRAINT_VIOLATION) {
          return new ConflictError('Room with this number already exists')
        }
        if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
          return new ConflictError('Invalid service reference')
        }
        return new ConflictError('Failed to create room')
      }
    ).then((either) => either.map(toRoom))
  },

  async findById(id: string): Promise<Either<DomainError, Room | null>> {
    try {
      const result = await prisma.room.findUnique({
        where: { id },
      })
      return right(result ? toRoom(result) : null)
    } catch (error) {
      return left(new ConflictError('Failed to find room'))
    }
  },

  async findByService(serviceId: string): Promise<Either<DomainError, Room[]>> {
    try {
      const results = await prisma.room.findMany({
        where: { serviceId },
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      })
      return right(results.map(toRoom))
    } catch (error) {
      return left(new ConflictError('Failed to find rooms'))
    }
  },

  async findAvailableRooms(
    serviceId: string,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<Either<DomainError, Room[]>> {
    try {
      const results = await prisma.room.findMany({
        where: {
          serviceId,
          status: 'AVAILABLE',
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
      return right(results.map(toRoom))
    } catch (error) {
      return left(new ConflictError('Failed to find available rooms'))
    }
  },

  async update(id: string, data: UpdateRoomData): Promise<Either<DomainError, Room>> {
    const updateData: any = {}
    
    if (data.number !== undefined) updateData.number = data.number
    if (data.floor !== undefined) updateData.floor = data.floor ?? null
    if (data.description !== undefined) updateData.description = data.description ?? null
    if (data.status !== undefined) updateData.status = data.status
    if (data.capacity !== undefined) updateData.capacity = data.capacity ?? null
    if (data.roomType !== undefined) updateData.roomType = data.roomType ?? null
    if (data.bedType !== undefined) updateData.bedType = data.bedType ?? null
    if (data.maxOccupancy !== undefined) updateData.maxOccupancy = data.maxOccupancy ?? null
    
    const processedData = processUpdateData(updateData, {
      arrayFields: ['amenities'],
    })
    
    return fromPromise(
      prisma.room.update({
        where: { id },
        data: processedData,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new NotFoundError('Room')
        }
        return new ConflictError('Failed to update room')
      }
    ).then((either) => either.map(toRoom))
  },

  async delete(id: string): Promise<Either<DomainError, Room>> {
    return fromPromise(
      prisma.room.delete({
        where: { id },
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new NotFoundError('Room')
        }
        return new ConflictError('Failed to delete room')
      }
    ).then((either) => either.map(toRoom))
  },

  async hasActiveBookings(id: string): Promise<Either<DomainError, boolean>> {
    try {
      const count = await prisma.booking.count({
        where: {
          roomId: id,
          status: {
            notIn: ['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'],
          },
        },
      })
      return right(count > 0)
    } catch (error) {
      return left(new ConflictError('Failed to check active bookings'))
    }
  },
})

