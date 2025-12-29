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

  // Optimized: Single transaction with all cleanup operations
  // This reduces database round-trips and improves performance
  await prisma.$transaction(async (tx) => {
    // Clean up booking-related data
    await Promise.all([
      tx.bookingExtraItem.deleteMany(),
      tx.booking.deleteMany(),
    ])

    // Reset availability capacity and room status in parallel
    // Using updateMany directly is more efficient than findMany + loop
    await Promise.all([
      // Reset availabilities with capacity < 1 to minimum capacity of 1
      tx.availability.updateMany({
        where: { capacity: { lt: 1 } },
        data: { capacity: 1 },
      }),
      // Reset all rooms to AVAILABLE status
      tx.room.updateMany({
        where: { status: { not: 'AVAILABLE' } },
        data: { status: 'AVAILABLE' },
      }),
    ])
  })
})

afterAll(async () => {
  if (prisma) await prisma.$disconnect()
})
