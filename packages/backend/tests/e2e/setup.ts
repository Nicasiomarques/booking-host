import { beforeAll, afterAll, beforeEach } from 'vitest'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load test environment BEFORE anything else
dotenv.config({ path: resolve(process.cwd(), '.env.test') })

import type { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

beforeAll(async () => {
  // Dynamic import after env is loaded
  const { prisma: prismaClient } = await import('../../src/shared/adapters/outbound/prisma/prisma.client.js')
  prisma = prismaClient
})

beforeEach(async () => {
  if (!prisma) {
    const { prisma: prismaClient } = await import('../../src/shared/adapters/outbound/prisma/prisma.client.js')
    prisma = prismaClient
  }

  // Clean up booking-related data before each test
  await prisma.$transaction([
    prisma.bookingExtraItem.deleteMany(),
    prisma.booking.deleteMany(),
  ])

  // Reset availability capacity and room status after cleaning bookings
  // This ensures tests start with fresh state while keeping setup data
  await prisma.$transaction(async (tx) => {
    // Get all bookings that were just deleted (by checking which availabilities have bookings)
    // Actually, we need to restore capacity based on deleted bookings
    // Simple approach: ensure all availabilities have at least capacity 1
    const availabilities = await tx.availability.findMany({
      where: { capacity: { lt: 1 } },
    })
    
    for (const availability of availabilities) {
      // Reset to minimum capacity of 1 if it was decremented
      await tx.availability.update({
        where: { id: availability.id },
        data: { capacity: 1 },
      })
    }

    // Reset all rooms to AVAILABLE status
    await tx.room.updateMany({
      where: { status: { not: 'AVAILABLE' } },
      data: { status: 'AVAILABLE' },
    })
  })
})

afterAll(async () => {
  if (prisma) await prisma.$disconnect()
})
