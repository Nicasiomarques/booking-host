# Development Guide - Booking Service

This guide documents best practices, patterns, and anti-patterns for the Booking Service development.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Project Structure (Ports & Adapters)](#2-project-structure-ports--adapters)
3. [Fastify](#3-fastify)
4. [Prisma](#4-prisma)
5. [Zod](#5-zod)
6. [JWT (jsonwebtoken)](#6-jwt-jsonwebtoken)
7. [Argon2](#7-argon2)
8. [Pino Logger](#8-pino-logger)
9. [Common Scenarios](#9-common-scenarios)
10. [Anti-Patterns to Avoid](#10-anti-patterns-to-avoid)

---

## 1. Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22.x LTS | Runtime |
| TypeScript | 5.9.x | Static typing |
| Fastify | 5.6.x | HTTP framework |
| Prisma | 7.2.x | ORM with PostgreSQL adapter |
| Zod | 4.2.x | Validation + OpenAPI integration |
| zod-to-openapi | 8.2.x | OpenAPI schema generation |
| jsonwebtoken | 9.0.x | JWT authentication |
| argon2 | 0.44.x | Password hashing |
| Pino | 10.1.x | Logging (built into Fastify) |
| Vitest | 4.0.x | E2E testing |
| Supertest | 7.x | HTTP testing |

### Installation

```bash
# Runtime dependencies
npm install fastify @fastify/cors @fastify/helmet @fastify/cookie @fastify/rate-limit
npm install @fastify/swagger @fastify/swagger-ui
npm install prisma @prisma/client @prisma/adapter-pg pg
npm install zod @asteasolutions/zod-to-openapi zod-to-json-schema
npm install jsonwebtoken
npm install argon2
npm install dotenv

# Dev dependencies
npm install -D typescript @types/node tsx
npm install -D @types/jsonwebtoken @types/pg
npm install -D vitest supertest @types/supertest
npm install -D pino-pretty
npm install -D prisma
```

---

## 2. Project Structure (Ports & Adapters)

A simplified Hexagonal Architecture that separates concerns without over-engineering.

```
booking-service/
├── prisma/
│   ├── schema.prisma
│   ├── prisma.config.ts          # Prisma 7.x adapter configuration
│   └── migrations/
│
├── src/
│   ├── domain/                    # Core business logic (no external dependencies)
│   │   ├── entities/
│   │   │   ├── user.ts
│   │   │   ├── booking.ts
│   │   │   ├── room.ts             # Room entity (hotel bookings)
│   │   │   ├── establishment.ts
│   │   │   ├── service.ts
│   │   │   ├── availability.ts
│   │   │   ├── extra-item.ts
│   │   │   └── common.ts          # Shared types (Role, BookingStatus, ServiceType, RoomStatus, PaginatedResult)
│   │   ├── errors.ts              # Domain-specific errors
│   │   └── index.ts               # Barrel export
│   │
│   ├── application/               # Use cases / Application services
│   │   ├── ports/                 # Port interfaces (contracts for adapters)
│   │   │   ├── repositories.port.ts      # Repository interfaces
│   │   │   ├── password-hasher.port.ts   # Password hashing interface
│   │   │   ├── token-provider.port.ts    # Token generation/verification interface
│   │   │   ├── unit-of-work.port.ts      # Transaction management interface
│   │   │   └── repository-error-handler.port.ts
│   │   ├── auth.service.ts
│   │   ├── booking.service.ts      # Includes hotel booking logic
│   │   ├── room.service.ts         # Room management service
│   │   ├── establishment.service.ts
│   │   ├── service.service.ts
│   │   ├── availability.service.ts
│   │   └── extra-item.service.ts
│   │
│   ├── adapters/
│   │   ├── inbound/               # Driving adapters (HTTP, CLI, etc.)
│   │   │   └── http/
│   │   │       ├── routes/
│   │   │       │   ├── auth.routes.ts
│   │   │       │   ├── booking.routes.ts      # Includes hotel endpoints (check-in/check-out/no-show)
│   │   │       │   ├── room.routes.ts         # Room management routes
│   │   │       │   ├── establishment.routes.ts
│   │   │       │   ├── service.routes.ts
│   │   │       │   ├── availability.routes.ts
│   │   │       │   └── extra-item.routes.ts
│   │   │       ├── schemas/       # Zod request/response schemas + OpenAPI
│   │   │       │   ├── auth.schema.ts
│   │   │       │   ├── booking.schema.ts      # Includes hotel booking fields
│   │   │       │   ├── room.schema.ts          # Room schemas
│   │   │       │   ├── establishment.schema.ts
│   │   │       │   ├── service.schema.ts       # Includes ServiceType
│   │   │       │   ├── availability.schema.ts
│   │   │       │   ├── extra-item.schema.ts
│   │   │       │   └── common.schema.ts
│   │   │       ├── middleware/
│   │   │       │   ├── auth.middleware.ts
│   │   │       │   ├── acl.middleware.ts
│   │   │       │   └── validate.ts
│   │   │       ├── plugins/
│   │   │       │   ├── prisma.plugin.ts
│   │   │       │   ├── services.plugin.ts    # Dependency injection
│   │   │       │   └── error-handler.plugin.ts
│   │   │       ├── openapi/       # OpenAPI/Swagger configuration
│   │   │       │   ├── registry.ts
│   │   │       │   ├── fastify-schema.ts
│   │   │       │   └── common.schemas.ts
│   │   │       ├── services/
│   │   │       │   └── service-factory.ts    # Composition Root
│   │   │       └── http.adapter.ts    # Fastify app configuration
│   │   │
│   │   └── outbound/              # Driven adapters (Database, external APIs)
│   │       ├── prisma/
│   │       │   ├── prisma.client.ts
│   │       │   ├── user.repository.ts
│   │       │   ├── booking.repository.ts      # Includes hotel booking fields
│   │       │   ├── room.repository.ts          # Room repository
│   │       │   ├── establishment.repository.ts
│   │       │   ├── service.repository.ts       # Includes ServiceType
│   │       │   ├── availability.repository.ts
│   │       │   ├── extra-item.repository.ts
│   │       │   ├── prisma-unit-of-work.adapter.ts
│   │       │   └── prisma-repository-error-handler.adapter.ts
│   │       ├── token/
│   │       │   └── jwt-token-provider.adapter.ts  # Port-based JWT adapter (jwt.adapter.ts deprecated)
│   │       └── crypto/
│   │           └── argon2-password-hasher.adapter.ts
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── jwt.config.ts
│   │   └── argon2.config.ts
│   │
│   └── server.ts                  # Entry point
│
├── tests/
│   └── e2e/
│       ├── setup.ts
│       ├── auth.e2e.test.ts
│       ├── booking.e2e.test.ts
│       ├── hotel-booking.e2e.test.ts
│       ├── hotel-booking-edge-cases.e2e.test.ts
│       ├── room.e2e.test.ts
│       ├── room-update-edge-cases.e2e.test.ts
│       ├── service-hotel.e2e.test.ts
│       ├── booking-confirm.e2e.test.ts
│       ├── booking-no-show-edge-cases.e2e.test.ts
│       ├── error-handler.e2e.test.ts
│       ├── jwt-token.e2e.test.ts
│       ├── validation.e2e.test.ts
│       ├── date-range-schema.e2e.test.ts
│       ├── coverage-gaps.e2e.test.ts
│       ├── establishment.e2e.test.ts
│       ├── service.e2e.test.ts
│       ├── availability.e2e.test.ts
│       ├── extra-item.e2e.test.ts
│       ├── acl.e2e.test.ts
│       └── helpers/
│           ├── test-client.ts
│           ├── factories.ts
│           └── setup.ts
│
├── .env.example
├── .env.test
├── package.json
├── tsconfig.json                  # Includes path aliases (#adapters, #application, etc.)
└── vitest.config.ts
```

### Layer Responsibilities

| Layer | Purpose | Dependencies |
|-------|---------|--------------|
| **Domain** | Business rules, entities, domain errors | None (pure TypeScript) |
| **Application** | Use cases, orchestrates domain and adapters | Domain |
| **Adapters/Inbound** | HTTP routes, request validation, middleware | Application |
| **Adapters/Outbound** | Database access, external services | Application interfaces |

### Dependency Rule

Dependencies only point inward:
- Domain has no dependencies
- Application depends on Domain
- Adapters depend on Application and Domain

```
Inbound Adapters → Application → Domain ← Outbound Adapters
```

### Port Interfaces

Ports define contracts that adapters must implement. This enables swapping implementations without changing business logic.

```typescript
// src/application/ports/password-hasher.port.ts
export interface PasswordHasherPort {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
  needsRehash(hash: string): Promise<boolean>
}

// src/application/ports/token-provider.port.ts
export interface TokenProviderPort {
  generateAccessToken(payload: TokenPayload): string
  generateRefreshToken(userId: string): string
  verifyAccessToken(token: string): TokenPayload
  verifyRefreshToken(token: string): { userId: string }
}

// src/application/ports/unit-of-work.port.ts
export interface UnitOfWorkPort {
  execute<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>
}
```

**Benefits:**
- Services depend on abstractions (ports), not concrete implementations
- Easy to swap implementations (e.g., Argon2 → bcrypt, JWT → Paseto)
- Testable: mock ports in unit tests

### Path Aliases

The project uses TypeScript path aliases for cleaner imports:

```json
// package.json - "imports" field
{
  "#adapters/*": "./src/adapters/*",
  "#application/*": "./src/application/*",
  "#config/*": "./src/config/*",
  "#domain/*": "./src/domain/*"
}
```

**Usage:**
```typescript
// Instead of relative imports
import { UserRepository } from '../../../adapters/outbound/prisma/user.repository'

// Use path aliases
import { UserRepository } from '#adapters/outbound/prisma/user.repository'
import { AuthService } from '#application/auth.service'
import { jwtConfig } from '#config/jwt.config'
import { NotFoundError } from '#domain/errors'
```

---

## 3. Fastify

### 3.1 Base Configuration

```typescript
// src/adapters/inbound/http/http.adapter.ts
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: ['req.headers.authorization', '*.password', '*.token'],
    },
  })

  // Security plugins
  await app.register(cors, { origin: true, credentials: true })
  await app.register(helmet)
  await app.register(cookie)

  // Custom plugins
  await app.register(import('./plugins/prisma.plugin'))
  await app.register(import('./plugins/error-handler.plugin'))

  // Routes
  await app.register(import('./routes/auth.routes'), { prefix: '/v1/auth' })
  await app.register(import('./routes/booking.routes'), { prefix: '/v1/bookings' })
  await app.register(import('./routes/establishment.routes'), { prefix: '/v1/establishments' })

  // Health check
  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
```

### 3.2 Best Practices

#### DO

```typescript
// Use import/from to resolve types
import Fastify, { FastifyRequest, FastifyReply } from 'fastify'

// Define route types
interface CreateBookingBody {
  serviceId: string
  availabilityId: string
  quantity: number
}

app.post<{ Body: CreateBookingBody }>('/bookings', async (request, reply) => {
  const { serviceId, availabilityId, quantity } = request.body
  // Type-safe access
})

// Use plugins for shared functionality
import fp from 'fastify-plugin'

export default fp(async (fastify) => {
  fastify.decorate('bookingService', new BookingService(repository))
})

// Register routes with prefix
app.register(authRoutes, { prefix: '/v1/auth' })
```

#### DON'T

```typescript
// Don't use require (loses types)
const fastify = require('fastify') // Bad

// Don't create multiple instances
const app1 = Fastify()
const app2 = Fastify() // Bad

// Don't block the event loop
app.get('/slow', async () => {
  const result = heavySyncOperation() // Bad - blocks event loop
  return result
})

// Don't ignore async errors
app.get('/data', async () => {
  someAsyncOperation() // Bad - unhandled promise
  return { ok: true }
})
```

### 3.3 Error Handling

```typescript
// src/domain/errors.ts
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401)
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403)
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public readonly details?: unknown) {
    super('VALIDATION_ERROR', message, 422)
  }
}
```

```typescript
// src/adapters/inbound/http/plugins/error-handler.plugin.ts
import fp from 'fastify-plugin'
import { DomainError } from '../../../../domain/errors'

export default fp(async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error)

    if (error instanceof DomainError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      })
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.validation,
        },
      })
    }

    // Generic error
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    })
  })
})
```

---

## 4. Prisma

### 4.1 Schema Best Practices

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // URL is configured via prisma.config.ts for Prisma 7.x
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  bookings           Booking[]
  establishmentUsers EstablishmentUser[]

  @@map("users")
}

model Booking {
  id              String        @id @default(uuid())
  userId          String        @map("user_id")
  establishmentId String        @map("establishment_id")
  serviceId       String        @map("service_id")
  availabilityId  String        @map("availability_id")
  quantity        Int
  totalPrice      Decimal       @map("total_price") @db.Decimal(10, 2)
  status          BookingStatus @default(PENDING)
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  user          User          @relation(fields: [userId], references: [id])
  establishment Establishment @relation(fields: [establishmentId], references: [id])
  service       Service       @relation(fields: [serviceId], references: [id])
  availability  Availability  @relation(fields: [availabilityId], references: [id])
  extraItems    BookingExtraItem[]

  // Indexes for frequent queries
  @@index([userId])
  @@index([establishmentId])
  @@index([status])
  @@map("bookings")
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  CHECKED_IN      # Hotel bookings
  CHECKED_OUT     # Hotel bookings
  NO_SHOW         # Hotel bookings
}

enum ServiceType {
  SERVICE
  HOTEL
  CINEMA
}

enum RoomStatus {
  AVAILABLE
  OCCUPIED
  CLEANING
  MAINTENANCE
  BLOCKED
}
```

### 4.2 Repository Pattern

```typescript
// src/adapters/outbound/prisma/prisma.client.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

```typescript
// src/adapters/outbound/prisma/booking.repository.ts
import { PrismaClient, Prisma } from '@prisma/client'
import { Booking } from '../../../domain/entities/booking'

export class BookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Booking | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: true,
        extraItems: { include: { extraItem: true } },
      },
    })

    return booking ? this.toDomain(booking) : null
  }

  async findByUser(userId: string, options: { page: number; limit: number }) {
    const [bookings, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: { userId },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: { service: true },
      }),
      this.prisma.booking.count({ where: { userId } }),
    ])

    return {
      data: bookings.map(b => this.toDomain(b)),
      total,
      page: options.page,
      limit: options.limit,
    }
  }

  async create(data: CreateBookingData): Promise<Booking> {
    const booking = await this.prisma.booking.create({
      data: {
        userId: data.userId,
        establishmentId: data.establishmentId,
        serviceId: data.serviceId,
        availabilityId: data.availabilityId,
        quantity: data.quantity,
        totalPrice: data.totalPrice,
        status: 'CONFIRMED',
      },
      include: { service: true },
    })

    return this.toDomain(booking)
  }

  private toDomain(raw: any): Booking {
    return {
      id: raw.id,
      userId: raw.userId,
      serviceId: raw.serviceId,
      quantity: raw.quantity,
      totalPrice: raw.totalPrice.toNumber(),
      status: raw.status,
      createdAt: raw.createdAt,
    }
  }
}
```

### 4.3 Best Practices

#### DO

```typescript
// Use select to limit returned fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, name: true, email: true },
})

// Use transactions for atomic operations
const booking = await prisma.$transaction(async (tx) => {
  const availability = await tx.availability.findUnique({
    where: { id: availabilityId },
  })

  if (!availability || availability.capacity < quantity) {
    throw new ConflictError('No available capacity')
  }

  await tx.availability.update({
    where: { id: availabilityId },
    data: { capacity: { decrement: quantity } },
  })

  return tx.booking.create({ data: bookingData })
})

// Handle Prisma-specific errors
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

try {
  await prisma.user.create({ data: userData })
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictError('Email already exists')
    }
  }
  throw error
}

// Add indexes for frequently queried fields
// @@index([userId])
// @@index([status])
```

#### DON'T

```typescript
// Don't make N+1 queries
const bookings = await prisma.booking.findMany()
for (const booking of bookings) {
  const service = await prisma.service.findUnique({ // Bad - N+1
    where: { id: booking.serviceId },
  })
}

// Use include instead
const bookings = await prisma.booking.findMany({
  include: { service: true },
})

// Don't ignore errors
try {
  await prisma.user.create({ data })
} catch (error) {
  console.log(error) // Bad - not handling properly
}

// Don't modify existing migrations after they're applied
// Create a new migration for changes

// Don't forget to disconnect in tests
afterAll(async () => {
  await prisma.$disconnect()
})
```

---

## 5. Zod

### 5.1 Schema Patterns

```typescript
// src/adapters/inbound/http/schemas/common.schema.ts
import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const emailSchema = z.string().email().transform(s => s.toLowerCase().trim())

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate
    }
    return true
  },
  { message: 'startDate must be before endDate' }
)
```

```typescript
// src/adapters/inbound/http/schemas/booking.schema.ts
import { z } from 'zod'
import { uuidSchema } from './common.schema'

export const createBookingSchema = z.object({
  serviceId: uuidSchema,
  availabilityId: uuidSchema,
  quantity: z.number().int().positive().max(100),
  extras: z
    .array(
      z.object({
        extraItemId: uuidSchema,
        quantity: z.number().int().positive().max(10),
      })
    )
    .optional()
    .default([]),
})

// Infer TypeScript type from schema
export type CreateBookingInput = z.infer<typeof createBookingSchema>

export const listBookingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
})

export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>
```

### 5.2 Validation Middleware

```typescript
// src/adapters/inbound/http/middleware/validate.ts
import { FastifyRequest } from 'fastify'
import { z, ZodSchema } from 'zod'
import { ValidationError } from '../../../../domain/errors'

export function validate<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest) => {
    const result = schema.safeParse(request.body)

    if (!result.success) {
      throw new ValidationError(
        'Invalid request body',
        result.error.flatten()
      )
    }

    request.body = result.data
  }
}

export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest) => {
    const result = schema.safeParse(request.query)

    if (!result.success) {
      throw new ValidationError(
        'Invalid query parameters',
        result.error.flatten()
      )
    }

    request.query = result.data
  }
}
```

### 5.3 Best Practices

#### DO

```typescript
// Use safeParse for non-throwing validation
const result = schema.safeParse(data)
if (!result.success) {
  throw new ValidationError('Invalid input', result.error.flatten())
}
// Use result.data (properly typed)

// Use transform for normalization
const emailSchema = z.string().email().transform(s => s.toLowerCase().trim())

// Use refine for custom validations
const passwordSchema = z
  .string()
  .min(8)
  .refine(
    (val) => /[A-Z]/.test(val) && /[0-9]/.test(val),
    'Password must contain uppercase letter and number'
  )

// Reuse schemas with extend/merge
const baseUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})

const createUserSchema = baseUserSchema.extend({
  password: passwordSchema,
})

const updateUserSchema = baseUserSchema.partial()

// Infer types from schemas (single source of truth)
type CreateUser = z.infer<typeof createUserSchema>

// Use coerce for query params (they come as strings)
const querySchema = z.object({
  page: z.coerce.number().default(1),
  active: z.coerce.boolean().default(true),
})
```

#### DON'T

```typescript
// Don't use parse without try/catch
const data = schema.parse(input) // Bad - throws ZodError

// Don't duplicate schemas and types
interface User {
  email: string
  name: string
}
const userSchema = z.object({ email: z.string(), name: z.string() })
// Bad - types can get out of sync

// Use z.infer instead
const userSchema = z.object({ email: z.string().email(), name: z.string() })
type User = z.infer<typeof userSchema>

// Don't ignore validation details
if (!result.success) {
  throw new Error('Invalid input') // Bad - loses error details
}
```

---

## 6. JWT (jsonwebtoken)

### 6.1 Configuration

```typescript
// src/config/jwt.config.ts
import { z } from 'zod'

const jwtConfigSchema = z.object({
  accessSecret: z.string().min(32),
  refreshSecret: z.string().min(32),
  accessExpiresIn: z.string().default('15m'),
  refreshExpiresIn: z.string().default('7d'),
  issuer: z.string().default('booking-service'),
  audience: z.string().default('booking-api'),
})

export const jwtConfig = jwtConfigSchema.parse({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
})
```

### 6.2 JWT Adapter

```typescript
// src/adapters/outbound/token/jwt.adapter.ts
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken'
import { jwtConfig } from '../../../config/jwt.config'
import { UnauthorizedError } from '../../../domain/errors'

export interface TokenPayload {
  userId: string
  email: string
  establishmentRoles: Array<{
    establishmentId: string
    role: 'OWNER' | 'STAFF'
  }>
}

export class JwtAdapter {
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, jwtConfig.accessSecret, {
      expiresIn: jwtConfig.accessExpiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    })
  }

  generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      jwtConfig.refreshSecret,
      {
        expiresIn: jwtConfig.refreshExpiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }
    )
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, jwtConfig.accessSecret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        algorithms: ['HS256'],
      }) as JwtPayload & TokenPayload

      return {
        userId: decoded.userId,
        email: decoded.email,
        establishmentRoles: decoded.establishmentRoles,
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired')
      }
      throw new UnauthorizedError('Invalid token')
    }
  }

  verifyRefreshToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, jwtConfig.refreshSecret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        algorithms: ['HS256'],
      }) as JwtPayload & { userId: string; type: string }

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type')
      }

      return { userId: decoded.userId }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired')
      }
      throw new UnauthorizedError('Invalid refresh token')
    }
  }
}
```

### 6.3 Best Practices

#### DO

```typescript
// Use strong secrets (minimum 32 characters)
// Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

// Always validate algorithm explicitly
jwt.verify(token, secret, { algorithms: ['HS256'] })

// Use short expiration for access tokens
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' })

// Include issuer and audience
jwt.sign(payload, secret, { issuer: 'booking-service', audience: 'booking-api' })
jwt.verify(token, secret, { issuer: 'booking-service', audience: 'booking-api' })

// Store refresh tokens in HttpOnly cookies
reply.setCookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/v1/auth/refresh',
  maxAge: 7 * 24 * 60 * 60, // 7 days
})
```

#### DON'T

```typescript
// Don't use weak secrets
const secret = 'secret' // Bad
const secret = 'my-jwt-secret' // Bad - predictable

// Don't store tokens in localStorage (XSS vulnerable)
localStorage.setItem('token', accessToken) // Bad

// Don't put sensitive data in payload
jwt.sign({
  userId: '123',
  password: 'secret', // NEVER!
  creditCard: '4111...', // NEVER!
}, secret)

// Don't ignore expiration
jwt.verify(token, secret, { ignoreExpiration: true }) // Bad

// Don't create tokens without expiration
jwt.sign(payload, secret) // Bad - no expiresIn
```

---

## 7. Argon2

### 7.1 Configuration

```typescript
// src/config/argon2.config.ts
import argon2 from 'argon2'

export const argon2Options: argon2.Options = {
  type: argon2.argon2id,   // Recommended for passwords
  memoryCost: 65536,       // 64 MB
  timeCost: 3,             // 3 iterations
  parallelism: 4,          // 4 parallel threads
}
```

### 7.2 Password Service

```typescript
// src/application/password.service.ts
import argon2 from 'argon2'
import { argon2Options } from '../config/argon2.config'

export class PasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, argon2Options)
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password)
    } catch {
      return false
    }
  }

  async needsRehash(hash: string): Promise<boolean> {
    return argon2.needsRehash(hash, argon2Options)
  }
}
```

### 7.3 Best Practices

#### DO

```typescript
// Use argon2id (hybrid, best general protection)
await argon2.hash(password, { type: argon2.argon2id })

// Tune parameters for your hardware
// Test that hashing takes ~0.5s to 1s
const start = Date.now()
await argon2.hash('test')
console.log(`Hash time: ${Date.now() - start}ms`)

// Use needsRehash for parameter migration
if (await argon2.needsRehash(storedHash, newOptions)) {
  const newHash = await argon2.hash(password, newOptions)
  await updateUserHash(userId, newHash)
}

// Store the complete hash (includes salt and parameters)
// $argon2id$v=19$m=65536,t=3,p=4$salt$hash

// Use try/catch when verifying
try {
  const isValid = await argon2.verify(hash, password)
} catch {
  return false // Corrupted or invalid hash
}
```

#### DON'T

```typescript
// Don't use parameters that are too low
await argon2.hash(password, {
  memoryCost: 1024, // Bad - too low (1 MB)
  timeCost: 1,      // Bad - too low
})

// Don't store salt separately (already in hash)
const salt = crypto.randomBytes(16) // Unnecessary

// Don't compare hashes with ===
if (storedHash === await argon2.hash(password)) // Bad
// Each hash generates different salt

// Use verify instead
const isValid = await argon2.verify(storedHash, password)

// Don't use argon2d for passwords (vulnerable to side-channel)
await argon2.hash(password, { type: argon2.argon2d }) // Bad

// Don't log passwords or hashes in production
console.log(`Password: ${password}`) // NEVER!
```

---

## 8. Pino Logger

### 8.1 Configuration

Pino is built into Fastify. Configure it in the app initialization:

```typescript
// src/adapters/inbound/http/http.adapter.ts
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

    // Redact sensitive data
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.passwordHash',
        '*.token',
        '*.accessToken',
        '*.refreshToken',
      ],
      remove: true,
    },

    // Development pretty printing
    ...(isProduction ? {} : {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    }),
  },
})
```

### 8.2 Best Practices

#### DO

```typescript
// Use structured logging (objects)
request.log.info({ bookingId, userId }, 'Booking created')
request.log.error({ err, bookingId }, 'Failed to create booking')

// Use appropriate log levels
logger.debug('Debugging info')     // Development only
logger.info('Normal operation')    // Normal operations
logger.warn('Warning')             // Unexpected but not error
logger.error('Error')              // Errors
logger.fatal('Fatal error')        // App will crash

// Use child loggers for context
const bookingLogger = logger.child({ module: 'booking', establishmentId })
bookingLogger.info({ bookingId }, 'Processing booking')

// Include correlation ID
const correlationId = request.headers['x-correlation-id'] || randomUUID()
request.log = request.log.child({ correlationId })

// Redact sensitive data in configuration
```

#### DON'T

```typescript
// Don't use console.log in production
console.log('User created') // Bad

// Don't log sensitive data
logger.info({ user }) // Bad - may include passwordHash
logger.info({ password }) // NEVER!

// Don't use string interpolation for structured data
logger.info(`User ${userId} created booking ${bookingId}`) // Bad

// Use objects instead
logger.info({ userId, bookingId }, 'User created booking')

// Don't use pino-pretty in production (performance overhead)

// Don't ignore errors
try {
  await operation()
} catch (error) {
  // Bad - not logging
}

// Always log errors
try {
  await operation()
} catch (error) {
  logger.error({ err: error }, 'Operation failed')
  throw error
}
```

---

## 9. Common Scenarios

### 9.1 Booking Creation with Transaction

```typescript
// src/application/booking.service.ts
import { prisma } from '../adapters/outbound/prisma/prisma.client'
import { ConflictError, NotFoundError } from '../domain/errors'

export class BookingService {
  async create(userId: string, data: CreateBookingInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Get service with current price
      const service = await tx.service.findUnique({
        where: { id: data.serviceId, active: true },
        include: { extraItems: { where: { active: true } } },
      })

      if (!service) {
        throw new NotFoundError('Service')
      }

      // 2. Check and lock availability
      const availability = await tx.availability.findUnique({
        where: { id: data.availabilityId },
      })

      if (!availability || availability.capacity < data.quantity) {
        throw new ConflictError('No available capacity for this slot')
      }

      // 3. Calculate total price
      let totalPrice = service.basePrice.mul(data.quantity)

      const bookingExtras = []
      for (const extra of data.extras || []) {
        const extraItem = service.extraItems.find(e => e.id === extra.extraItemId)

        if (!extraItem) {
          throw new NotFoundError(`Extra item ${extra.extraItemId}`)
        }

        totalPrice = totalPrice.add(extraItem.price.mul(extra.quantity))

        bookingExtras.push({
          extraItemId: extra.extraItemId,
          quantity: extra.quantity,
          priceAtBooking: extraItem.price, // Freeze price
        })
      }

      // 4. Reduce capacity
      await tx.availability.update({
        where: { id: data.availabilityId },
        data: { capacity: { decrement: data.quantity } },
      })

      // 5. Create booking
      return tx.booking.create({
        data: {
          userId,
          establishmentId: service.establishmentId,
          serviceId: data.serviceId,
          availabilityId: data.availabilityId,
          quantity: data.quantity,
          totalPrice,
          status: 'CONFIRMED',
          extraItems: { create: bookingExtras },
        },
        include: { service: true, extraItems: true },
      })
    })
  }
}
```

### 9.2 Booking Cancellation

```typescript
async cancel(bookingId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      throw new NotFoundError('Booking')
    }

    if (booking.userId !== userId) {
      throw new ForbiddenError('Cannot cancel another user\'s booking')
    }

    if (booking.status === 'CANCELLED') {
      throw new ConflictError('Booking already cancelled')
    }

    // Restore capacity
    await tx.availability.update({
      where: { id: booking.availabilityId },
      data: { capacity: { increment: booking.quantity } },
    })

    return tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    })
  })
}
```

### 9.3 ACL Middleware

```typescript
// src/adapters/inbound/http/middleware/acl.middleware.ts
import { FastifyRequest } from 'fastify'
import { ForbiddenError } from '../../../../domain/errors'

type Role = 'OWNER' | 'STAFF'

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest) => {
    const { establishmentId } = request.params as { establishmentId?: string }

    if (!establishmentId) {
      throw new Error('establishmentId required for authorization')
    }

    const userRole = request.user.establishmentRoles.find(
      r => r.establishmentId === establishmentId
    )

    if (!userRole || !roles.includes(userRole.role)) {
      throw new ForbiddenError('Insufficient permissions')
    }
  }
}

// Usage in route
app.post(
  '/establishments/:establishmentId/services',
  { preHandler: [authenticate, requireRole('OWNER')] },
  createServiceHandler
)
```

### 9.4 Availability Overlap Validation

```typescript
async createAvailability(serviceId: string, data: CreateAvailabilityInput) {
  // Check for overlaps
  const overlapping = await prisma.availability.findFirst({
    where: {
      serviceId,
      date: data.date,
      OR: [
        {
          startTime: { lte: data.startTime },
          endTime: { gt: data.startTime },
        },
        {
          startTime: { lt: data.endTime },
          endTime: { gte: data.endTime },
        },
        {
          startTime: { gte: data.startTime },
          endTime: { lte: data.endTime },
        },
      ],
    },
  })

  if (overlapping) {
    throw new ConflictError('Time slot overlaps with existing availability')
  }

  return prisma.availability.create({
    data: { serviceId, ...data },
  })
}
```

---

## 10. Anti-Patterns to Avoid

### 10.1 General

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Sensitive data in logs | Exposes passwords, tokens | Use redact in Pino |
| N+1 queries | Poor performance | Use include/select in Prisma |
| Non-atomic transactions | Race conditions | Use $transaction |
| Hardcoded secrets | Security risk | Use environment variables |
| `any` in TypeScript | Loses type safety | Define explicit types |
| Sync heavy operations | Blocks event loop | Use async/await |

### 10.2 Security Checklist

- [ ] JWT secrets minimum 32 characters
- [ ] Access tokens with short expiration (15min)
- [ ] Refresh tokens in HttpOnly cookies
- [ ] Passwords hashed with Argon2id
- [ ] Sensitive data redacted in logs
- [ ] Input validation on all routes
- [ ] Rate limiting on auth endpoints
- [ ] HTTPS in production
- [ ] Security headers (Helmet)
- [ ] CORS configured correctly

### 10.3 Performance Checklist

- [ ] Indexes on frequently queried fields
- [ ] Select only required fields
- [ ] Pagination on list endpoints
- [ ] Connection pooling configured
- [ ] Async logging (don't block event loop)
- [ ] Avoid heavy sync operations

---

## References

- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zod Documentation](https://zod.dev/)
- [zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi) - OpenAPI generation from Zod schemas
- [JWT Best Practices](https://curity.io/resources/learn/jwt-best-practices/)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Pino Logger](https://getpino.io/)

### Sources

- [Fastify Releases](https://github.com/fastify/fastify/releases) - v5.6.x
- [Prisma Changelog](https://www.prisma.io/changelog) - v7.2.x
- [Zod Releases](https://github.com/colinhacks/zod/releases) - v4.2.x
- [jsonwebtoken npm](https://www.npmjs.com/package/jsonwebtoken) - v9.0.x
- [argon2 npm](https://www.npmjs.com/package/argon2) - v0.44.x
- [Pino npm](https://www.npmjs.com/package/pino) - v10.1.x
- [Vitest Releases](https://github.com/vitest-dev/vitest/releases) - v4.0.x

---

*Last updated: December 2025*
