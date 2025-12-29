import { PrismaClient, Room as PrismaRoom } from '@prisma/client'
import type * as RoomDomain from '../../domain/index.js'
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import { handleArrayFieldForCreate, processUpdateData } from '#shared/adapters/outbound/prisma/base-repository.js'
import type * as Ports from '#shared/application/ports/index.js'
import { DatabaseErrorType } from '#shared/application/ports/index.js'

export type { Room, CreateRoomData, UpdateRoomData } from '../../domain/index.js'

function toRoom(prismaRoom: PrismaRoom): RoomDomain.Room {
  return {
    ...prismaRoom,
    status: prismaRoom.status as Domain.RoomStatus,
    roomType: prismaRoom.roomType as Domain.RoomType | null,
    amenities: prismaRoom.amenities ? (prismaRoom.amenities as string[]) : null,
  }
}

export const createRoomRepository = (
  prisma: PrismaClient,
  errorHandler: Ports.RepositoryErrorHandlerPort
) => ({
  async create(data: RoomDomain.CreateRoomData): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>> {
    return DomainValues.fromPromise(
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
          return new DomainValues.ConflictError('Room with this number already exists')
        }
        if (dbError?.type === DatabaseErrorType.FOREIGN_KEY_VIOLATION) {
          return new DomainValues.ConflictError('Invalid service reference')
        }
        return new DomainValues.ConflictError('Failed to create room')
      }
    ).then((either) => either.map(toRoom))
  },

  async findById(id: string): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room | null>> {
    try {
      const result = await prisma.room.findUnique({
        where: { id },
      })
      return DomainValues.right(result ? toRoom(result) : null)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find room'))
    }
  },

  async findByService(serviceId: string): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room[]>> {
    try {
      const results = await prisma.room.findMany({
        where: { serviceId },
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      })
      return DomainValues.right(results.map(toRoom))
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find rooms'))
    }
  },

  async findAvailableRooms(
    serviceId: string,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room[]>> {
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
      return DomainValues.right(results.map(toRoom))
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to find available rooms'))
    }
  },

  async update(id: string, data: RoomDomain.UpdateRoomData): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>> {
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
    
    return DomainValues.fromPromise(
      prisma.room.update({
        where: { id },
        data: processedData,
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.NotFoundError('Room')
        }
        return new DomainValues.ConflictError('Failed to update room')
      }
    ).then((either) => either.map(toRoom))
  },

  async delete(id: string): Promise<Domain.Either<Domain.DomainError, RoomDomain.Room>> {
    return DomainValues.fromPromise(
      prisma.room.delete({
        where: { id },
      }),
      (error) => {
        const dbError = errorHandler.analyze(error)
        if (dbError?.type === DatabaseErrorType.NOT_FOUND) {
          return new DomainValues.NotFoundError('Room')
        }
        return new DomainValues.ConflictError('Failed to delete room')
      }
    ).then((either) => either.map(toRoom))
  },

  async hasActiveBookings(id: string): Promise<Domain.Either<Domain.DomainError, boolean>> {
    try {
      const count = await prisma.booking.count({
        where: {
          roomId: id,
          status: {
            notIn: ['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'],
          },
        },
      })
      return DomainValues.right(count > 0)
    } catch (error) {
      return DomainValues.left(new DomainValues.ConflictError('Failed to check active bookings'))
    }
  },
})

