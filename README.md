# Booking Service

Monorepo containing the booking management API and backoffice for multi-tenant establishments.

## Monorepo Structure

```
booking-service/
├── packages/
│   ├── backend/          # Backend API (Fastify + Prisma)
│   └── backoffice/       # Frontend Backoffice (SolidJS + Vite)
├── docs/                 # Documentation
│   └── MONOREPO_GUIDE.md # Complete monorepo guide
└── package.json          # Workspace root
```

> 📖 **New to monorepos?** Read the [Complete Monorepo Guide](./docs/MONOREPO_GUIDE.md) to understand how it works, advantages, disadvantages, and how to use it.

> 📋 **Development Practices:** See the [Development Practices Guide](./DEVELOPMENT_PRACTICES.md) to learn about naming conventions, imports, commits, code structure, and TypeScript patterns used in the project.

## Packages

### Backend (`packages/backend`)
Booking management API for multi-tenant establishments.

## Overview

This API allows establishments to:

- Register bookable services (SERVICE, HOTEL)
- Define availability by date/time
- Offer optional extra items
- Receive and manage bookings
- Manage rooms for hotel services (create, update, delete)
- Perform check-in/check-out for hotel bookings
- Control access via ACL (OWNER/STAFF)

---

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 22+ |
| Framework | Fastify | 5.x |
| Language | TypeScript | 5.x |
| Database | PostgreSQL | - |
| ORM | Prisma | 7.x |
| Validation | Zod | 4.x |
| Auth | JWT (jsonwebtoken) | 9.x |
| Password | Argon2 | 0.44.x |
| Testing | Vitest | 4.x |
| Docs | Swagger/OpenAPI | - |

---

## Architecture

The project follows **Hexagonal Architecture (Ports & Adapters)**:

```mermaid
graph TB
    subgraph "Adapters Inbound"
        HTTP[HTTP/Fastify Routes]
        MW[Middleware<br/>Auth, ACL, Validation]
    end

    subgraph "Application Layer"
        AS[AuthService]
        ES[EstablishmentService]
        SS[ServiceService]
        AVS[AvailabilityService]
        EIS[ExtraItemService]
        BS[BookingService]
        RS[RoomService]
    end

    subgraph "Domain"
        DT[Types & Errors]
    end

    subgraph "Adapters Outbound"
        PR[Prisma Repositories<br/>per Feature]
        JWT[JWT Adapter]
        UOW[Unit of Work]
    end

    subgraph "Infrastructure"
        DB[(PostgreSQL)]
    end

    HTTP --> MW
    MW --> AS & ES & SS & AVS & EIS & BS & RS
    AS & ES & SS & AVS & EIS & BS & RS --> DT
    AS & ES & SS & AVS & EIS & BS & RS --> PR & JWT
    PR --> DB
```

### Directory Structure

The project follows a modular feature architecture, where each feature is self-contained:

```
src/
├── features/                 # Modular features (each self-contained)
│   ├── auth/
│   │   ├── adapters/
│   │   │   ├── http/
│   │   │   │   ├── endpoints.ts    # HTTP routes
│   │   │   │   ├── index.ts        # Fastify plugin
│   │   │   │   └── schemas.ts      # Zod schemas
│   │   │   └── persistence/
│   │   │       └── user.repository.ts  # Prisma repository
│   │   ├── application/
│   │   │   └── auth.service.ts     # Business logic
│   │   ├── domain/
│   │   │   └── auth.ts             # Entities and interfaces
│   │   └── composition.ts          # Composition module (DI)
│   ├── booking/
│   │   ├── adapters/
│   │   │   ├── http/
│   │   │   │   ├── endpoints.ts
│   │   │   │   ├── mappers.ts      # Response formatting
│   │   │   │   └── index.ts
│   │   │   └── persistence/
│   │   │       └── booking.repository.ts
│   │   ├── application/
│   │   │   ├── booking.service.ts        # Service orchestrator
│   │   │   ├── booking-creation.service.ts  # Creation logic
│   │   │   ├── booking-query.service.ts     # Query logic
│   │   │   └── booking-status.service.ts    # Status transitions
│   │   ├── domain/
│   │   │   └── booking.ts
│   │   └── composition.ts
│   └── [other features: establishment, service, availability, extra-item, room]
├── shared/                    # Shared code
│   ├── adapters/
│   │   ├── http/
│   │   │   ├── routes/
│   │   │   │   └── index.ts        # Centralized route registration
│   │   │   ├── middleware/         # Auth, ACL, Validation
│   │   │   ├── plugins/            # Prisma, Error Handler, Services
│   │   │   ├── utils/              # HTTP utilities
│   │   │   │   ├── endpoint-helpers.ts  # CRUD endpoint helpers
│   │   │   │   ├── either-handler.ts    # Either pattern handlers
│   │   │   │   └── crud-helpers.ts      # Response schemas
│   │   │   └── services/
│   │   │       └── service-factory.ts  # Composition Root
│   │   └── outbound/
│   │       ├── prisma/              # Prisma adapters (UnitOfWork, ErrorHandler)
│   │       ├── crypto/              # Argon2 adapter
│   │       └── token/               # JWT adapter
│   ├── application/
│   │   ├── ports/                  # Interfaces (Ports)
│   │   ├── services/               # Shared service helpers
│   │   └── utils/                  # Shared helpers
│   │       ├── validation.helper.ts    # Entity validation helpers
│   │       └── authorization.helper.ts # Role verification helpers
│   └── domain/
│       ├── errors.ts               # DomainError, NotFoundError, etc.
│       └── user.ts                 # Shared types
└── config/                        # Configuration
```

**Modular Architecture Principles:**

- **Each feature is self-contained**: has its own repositories, adapters, services, and domain
- **Composition modules**: each feature has a `composition.ts` that instantiates its dependencies
- **Separation of concerns**: mappers separated from endpoints, repositories within features
- **Service specialization**: complex services (like booking) can be split into specialized services (creation, query, status)
- **Centralized registration**: routes registered in `shared/adapters/http/routes/index.ts`
- **Reusable helpers**: common HTTP operations use endpoint helpers to reduce boilerplate

---

## Data Model (ERD)

```mermaid
erDiagram
    User {
        uuid id PK
        string email UK
        string passwordHash
        string name
        datetime createdAt
        datetime updatedAt
    }

    Establishment {
        uuid id PK
        string name
        string description
        string address
        string timezone
        boolean active
        datetime createdAt
        datetime updatedAt
    }

    EstablishmentUser {
        uuid userId FK
        uuid establishmentId FK
        enum role "OWNER | STAFF"
    }

    Service {
        uuid id PK
        uuid establishmentId FK
        string name
        string description
        decimal basePrice
        int durationMinutes
        int capacity
        enum type "SERVICE | HOTEL"
        boolean active
        datetime createdAt
        datetime updatedAt
    }

    Room {
        uuid id PK
        uuid serviceId FK
        string number UK
        int floor
        string description
        enum status "AVAILABLE | OCCUPIED | CLEANING | MAINTENANCE | BLOCKED"
        datetime createdAt
        datetime updatedAt
    }

    ExtraItem {
        uuid id PK
        uuid serviceId FK
        string name
        decimal price
        int maxQuantity
        boolean active
        datetime createdAt
        datetime updatedAt
    }

    Availability {
        uuid id PK
        uuid serviceId FK
        date date
        string startTime
        string endTime
        int capacity
        datetime createdAt
        datetime updatedAt
    }

    Booking {
        uuid id PK
        uuid userId FK
        uuid establishmentId FK
        uuid serviceId FK
        uuid availabilityId FK
        uuid roomId FK
        int quantity
        decimal totalPrice
        date checkInDate
        date checkOutDate
        int numberOfNights
        string guestName
        string guestEmail
        string guestDocument
        enum status "PENDING | CONFIRMED | CANCELLED | CHECKED_IN | CHECKED_OUT | NO_SHOW"
        datetime createdAt
        datetime updatedAt
    }

    BookingExtraItem {
        uuid bookingId FK
        uuid extraItemId FK
        int quantity
        decimal priceAtBooking
    }

    User ||--o{ EstablishmentUser : "has roles"
    User ||--o{ Booking : "makes"
    Establishment ||--o{ EstablishmentUser : "has members"
    Establishment ||--o{ Service : "offers"
    Establishment ||--o{ Booking : "receives"
    Service ||--o{ ExtraItem : "has extras"
    Service ||--o{ Availability : "has slots"
    Service ||--o{ Booking : "is booked"
    Service ||--o{ Room : "has rooms"
    Room ||--o{ Booking : "assigned to"
    Availability ||--o{ Booking : "used in"
    Booking ||--o{ BookingExtraItem : "includes"
    ExtraItem ||--o{ BookingExtraItem : "added to"
```

---

## Main Flows

### Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API
    participant DB as Database

    Note over C,DB: Login Flow
    C->>API: POST /v1/auth/login
    API->>DB: Find user by email
    API->>API: Verify password (Argon2)
    API->>API: Generate Access Token (15min)
    API->>API: Generate Refresh Token (7d)
    API-->>C: { accessToken } + HttpOnly Cookie

    Note over C,DB: Token Refresh
    C->>API: POST /v1/auth/refresh (with cookie)
    API->>API: Verify refresh token
    API->>DB: Load user & roles
    API-->>C: { accessToken }

    Note over C,DB: Protected Request
    C->>API: GET /v1/bookings/my (Bearer token)
    API->>API: Verify access token
    API->>DB: Load user bookings
    API-->>C: { bookings }
```

### Booking Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API
    participant DB as Database

    C->>API: POST /v1/bookings
    Note right of C: { serviceId, availabilityId,<br/>quantity, extras[] }

    API->>DB: BEGIN TRANSACTION

    API->>DB: Find Service (validate active)
    API->>DB: Find Availability (validate capacity)

    alt Capacity Insufficient
        API-->>C: 409 CONFLICT - No capacity
    end

    API->>API: Calculate total price
    Note right of API: basePrice * qty +<br/>sum(extra.price * extra.qty)

    API->>DB: Validate & process extras
    API->>DB: Create Booking
    API->>DB: Create BookingExtraItems
    API->>DB: Decrement Availability capacity

    API->>DB: COMMIT
    API-->>C: 201 { booking }
```

### Cancellation Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API
    participant DB as Database

    C->>API: PUT /v1/bookings/{id}/cancel

    API->>DB: Find Booking

    alt Booking not found
        API-->>C: 404 NOT_FOUND
    end

    alt Not owner of booking
        API-->>C: 403 FORBIDDEN
    end

    alt Already cancelled
        API-->>C: 409 CONFLICT
    end

    API->>DB: BEGIN TRANSACTION
    API->>DB: Update status = CANCELLED
    API->>DB: Restore Availability capacity
    API->>DB: COMMIT

    API-->>C: 200 { booking }
```

### Establishment Creation Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API
    participant DB as Database

    C->>API: POST /v1/establishments
    Note right of C: { name, address, timezone }

    API->>API: Authenticate (Bearer token)

    alt Invalid/Missing token
        API-->>C: 401 UNAUTHORIZED
    end

    API->>API: Validate input (Zod)

    alt Validation error
        API-->>C: 422 VALIDATION_ERROR
    end

    API->>DB: Create Establishment
    API->>DB: Create EstablishmentUser (role=OWNER)

    API-->>C: 201 { establishment }
```

### Service Management Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API
    participant DB as Database

    Note over C,DB: Create Service
    C->>API: POST /v1/establishments/{id}/services
    Note right of C: { name, basePrice, durationMinutes }

    API->>API: Authenticate + Check OWNER role

    alt Not OWNER
        API-->>C: 403 FORBIDDEN
    end

    API->>DB: Verify Establishment exists
    API->>DB: Create Service
    API-->>C: 201 { service }

    Note over C,DB: Update Service
    C->>API: PUT /v1/services/{id}
    API->>API: Authenticate
    API->>DB: Find Service + Establishment
    API->>API: Verify user is OWNER
    API->>DB: Update Service
    API-->>C: 200 { service }

    Note over C,DB: Delete Service (Soft)
    C->>API: DELETE /v1/services/{id}
    API->>API: Authenticate + Verify OWNER
    API->>DB: Set active = false
    API-->>C: 200 { success: true }
```

### Availability Management Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API
    participant DB as Database

    C->>API: POST /v1/services/{id}/availabilities
    Note right of C: { date, startTime, endTime, capacity }

    API->>API: Authenticate

    API->>DB: Find Service
    alt Service not found
        API-->>C: 404 NOT_FOUND
    end

    API->>API: Verify OWNER role

    API->>DB: Check for time overlaps
    alt Overlap detected
        API-->>C: 409 CONFLICT
    end

    API->>DB: Create Availability
    API-->>C: 201 { availability }

    Note over C,DB: Delete Availability
    C->>API: DELETE /v1/availabilities/{id}
    API->>DB: Check for existing bookings
    alt Has bookings
        API-->>C: 409 CONFLICT - Cannot delete
    end
    API->>DB: Delete Availability
    API-->>C: 200 { success: true }
```

### Extra Items Management Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API
    participant DB as Database

    C->>API: POST /v1/services/{id}/extras
    Note right of C: { name, price, maxQuantity }

    API->>API: Authenticate

    API->>DB: Find Service + Establishment
    alt Service not found
        API-->>C: 404 NOT_FOUND
    end

    API->>API: Verify OWNER role
    alt Not OWNER
        API-->>C: 403 FORBIDDEN
    end

    API->>DB: Create ExtraItem
    API-->>C: 201 { extraItem }

    Note over C,DB: Price Snapshot on Booking
    C->>API: POST /v1/bookings
    Note right of C: { extras: [{ id, quantity }] }
    API->>DB: Get ExtraItem current price
    API->>DB: Store as priceAtBooking
    Note right of API: Price frozen at booking time
```

### Complete Flow: User to Booking

```mermaid
sequenceDiagram
    participant U as User
    participant API as API
    participant DB as Database

    Note over U,DB: 1. Registration
    U->>API: POST /v1/auth/register
    API->>DB: Create User
    API-->>U: { accessToken } + Cookie

    Note over U,DB: 2. Explore Establishments
    U->>API: GET /v1/establishments/{id}
    API->>DB: Get Establishment
    API-->>U: { establishment }

    Note over U,DB: 3. View Services
    U->>API: GET /v1/establishments/{id}/services
    API->>DB: Get Services (active only)
    API-->>U: [ services ]

    Note over U,DB: 4. View Availability
    U->>API: GET /v1/services/{id}/availabilities
    Note right of U: ?startDate=2025-01-20&endDate=2025-01-25
    API->>DB: Get Availabilities (filtered)
    API-->>U: [ availabilities ]

    Note over U,DB: 5. View Extras
    U->>API: GET /v1/services/{id}/extras
    API->>DB: Get ExtraItems (active only)
    API-->>U: [ extras ]

    Note over U,DB: 6. Create Booking
    U->>API: POST /v1/bookings
    Note right of U: { serviceId, availabilityId,<br/>quantity, extras }
    API->>DB: Transaction: Create Booking
    API-->>U: 201 { booking }
```

---

## API Endpoints

Base URL: `/v1`

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | User registration | - |
| POST | `/auth/login` | Login | - |
| POST | `/auth/refresh` | Refresh access token | Cookie |
| POST | `/auth/logout` | Logout (clears cookie) | - |

**JWT Payload:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "establishmentRoles": [
    { "establishmentId": "uuid", "role": "OWNER" }
  ]
}
```

### Establishments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/establishments` | Create establishment | Bearer |
| GET | `/establishments/:id` | Get by ID | - |
| GET | `/establishments/my` | My establishments | Bearer |
| PUT | `/establishments/:id` | Update | OWNER |

### Services

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/establishments/:id/services` | Create service | OWNER |
| GET | `/establishments/:id/services` | List services | - |
| GET | `/services/:id` | Get service | - |
| PUT | `/services/:id` | Update service | OWNER |
| DELETE | `/services/:id` | Soft delete | OWNER |

### Extra Items

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/services/:id/extras` | Create extra | OWNER |
| GET | `/services/:id/extras` | List extras | - |
| PUT | `/extras/:id` | Update extra | OWNER |
| DELETE | `/extras/:id` | Soft delete | OWNER |

### Availability

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/services/:id/availabilities` | Create slot | OWNER |
| GET | `/services/:id/availabilities` | List slots | - |
| PUT | `/availabilities/:id` | Update slot | OWNER |
| DELETE | `/availabilities/:id` | Remove slot | OWNER |

### Bookings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/bookings` | Create booking (supports hotel with check-in/check-out) | Bearer |
| GET | `/bookings/:id` | Get booking | Bearer |
| GET | `/bookings/my` | My bookings | Bearer |
| GET | `/establishments/:id/bookings` | Establishment bookings | STAFF+ |
| PUT | `/bookings/:id/cancel` | Cancel booking | Owner |
| PUT | `/bookings/:id/confirm` | Confirm pending booking | STAFF+ |
| PUT | `/bookings/:id/check-in` | Check-in hotel booking | STAFF+ |
| PUT | `/bookings/:id/check-out` | Check-out hotel booking | STAFF+ |
| PUT | `/bookings/:id/no-show` | Mark no-show hotel booking | STAFF+ |

### Rooms (Hotel Services)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/services/:serviceId/rooms` | Create room | OWNER |
| GET | `/services/:serviceId/rooms` | List rooms | - |
| GET | `/rooms/:id` | Get room | - |
| PUT | `/rooms/:id` | Update room | OWNER |
| DELETE | `/rooms/:id` | Delete room | OWNER |

---

## ACL - Access Control

| Action | OWNER | STAFF | User |
|--------|-------|-------|------|
| Create/Edit service | ✅ | ❌ | ❌ |
| Manage extras | ✅ | ❌ | ❌ |
| Manage availability | ✅ | ❌ | ❌ |
| Manage rooms | ✅ | ❌ | ❌ |
| View establishment bookings | ✅ | ✅ | ❌ |
| Create booking | ✅ | ✅ | ✅ |
| Cancel own booking | ✅ | ✅ | ✅ |
| Confirm booking | ✅ | ✅ | ❌ |
| Check-in/check-out bookings | ✅ | ✅ | ❌ |

---

## Security

### JWT Authentication

- **Access Token**: 15 minutes (configurable)
- **Refresh Token**: 7 days, HttpOnly cookie
- **Algorithm**: HS256
- **Validation**: Issuer + Audience

### Password

- **Algorithm**: Argon2id
- **Memory**: 64MB
- **Iterations**: 3
- **Automatic rehash** on login if parameters change

### HTTP Security

- **Helmet**: Security headers
- **CORS**: Configurable per environment
- **Rate Limiting**: 5 req/min on auth (prod)
- **Cookie Flags**: HttpOnly, Secure (prod), SameSite=strict

### Validation

- **Zod** on all inputs
- **Email normalization** (lowercase)
- **UUID validation** on parameters

---

## Error Handling

### Error Format

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Service not found"
  }
}
```

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| VALIDATION_ERROR | 422 | Invalid input |
| UNAUTHORIZED | 401 | Invalid/missing token |
| FORBIDDEN | 403 | No permission |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Conflict (e.g., no capacity) |
| TOO_MANY_REQUESTS | 429 | Rate limit exceeded |
| INTERNAL_ERROR | 500 | Internal error |

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 8+
- PostgreSQL

### Installation

```bash
# Clone and install
git clone <repo>
cd booking-service
pnpm install

# Configure backend environment
cd packages/backend
cp .env.example .env
# Edit .env with your configuration

# Setup database
pnpm db:migrate

# Return to root
cd ../..
```

### Development

```bash
# Start backend and backoffice in parallel
pnpm dev:all

# Or start separately
pnpm dev:backend      # Backend only
pnpm dev:backoffice   # Backoffice only
```

### Environment Variables

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

DATABASE_URL=postgresql://user:pass@localhost:5432/booking

JWT_ACCESS_SECRET=<min-32-chars>
JWT_REFRESH_SECRET=<min-32-chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=booking-service
JWT_AUDIENCE=booking-api
```

### Available Scripts (Root)

```bash
# Development
pnpm dev:all             # Backend + Backoffice in parallel
pnpm dev:backend         # Backend only
pnpm dev:backoffice      # Backoffice only

# Build
pnpm build               # Build all packages
pnpm build:backend       # Build backend
pnpm build:backoffice    # Build backoffice

# Tests
pnpm test                # Tests for all packages
pnpm test:backend        # Backend tests
pnpm test:backoffice     # Backoffice E2E tests

# Database (Backend)
pnpm db:generate         # Generate Prisma Client
pnpm db:migrate          # Run migrations
pnpm db:push             # Sync schema (dev)
pnpm db:studio           # Prisma Studio GUI
pnpm db:reset            # Reset database
pnpm db:seed             # Seed database
```

### Scripts by Package

To run specific scripts from a package:

```bash
# Backend
pnpm --filter @booking-service/backend <script>

# Backoffice
pnpm --filter @booking-service/backoffice <script>
```

---

## API Documentation

Swagger UI available at `/docs` when the server is running.

---

## Business Rules

### Bookings

- Creation always in **transaction**
- **Atomic capacity** - decremented on creation, restored on cancellation
- **Price calculated** on backend (not trusted from client)
- **Extras with frozen price** (price_at_booking)
- **Booking status**: Created as CONFIRMED by default, can be changed to PENDING for manual confirmation
- **Confirmation**: Only OWNER/STAFF can confirm pending bookings (cannot confirm already confirmed or cancelled bookings)

### Availability

- **No overlaps** of time slots for the same service
- **Minimum capacity** of 1
- **Cannot delete** if there are associated bookings

### Soft Delete

- Services and ExtraItems use `active` flag
- Allows maintaining booking history

---

## Testing

```bash
# Run all tests
pnpm test

# Backend tests
pnpm test:backend

# Backoffice tests
pnpm test:backoffice

# Watch mode (backend)
pnpm --filter @booking-service/backend test
```

E2E tests cover:
- Authentication flows
- CRUD for all entities
- ACL and permissions
- Booking scenarios (success, conflict, cancellation)
- Hotel bookings (check-in, check-out, no-show)
- Room management
- Validations and edge cases

**Test Coverage**: 94.93% lines, 91.72% statements, 79.17% branches, 97.27% functions
