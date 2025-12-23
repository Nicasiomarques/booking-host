import { beforeAll, afterAll, beforeEach } from 'vitest'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load test environment BEFORE anything else
dotenv.config({ path: resolve(process.cwd(), '.env.test') })

import type { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

beforeAll(async () => {
  // Dynamic import after env is loaded
  const { prisma: prismaClient } = await import('../../src/adapters/outbound/prisma/prisma.client.js')
  prisma = prismaClient

  await prisma.$transaction([
    prisma.bookingExtraItem.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.availability.deleteMany(),
    prisma.extraItem.deleteMany(),
    prisma.service.deleteMany(),
    prisma.establishmentUser.deleteMany(),
    prisma.establishment.deleteMany(),
    prisma.user.deleteMany(),
  ])
})

afterAll(async () => {
  if (prisma) await prisma.$disconnect()
})
