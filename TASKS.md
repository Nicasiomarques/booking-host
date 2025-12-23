# Booking Service - Development Tasks

## Overview

This document tracks all development tasks for the Booking Service MVP. Each task includes subtasks, acceptance criteria, and a changelog.

**Rules:**
- Tasks are only marked as `[x]` (completed) after successful curl testing
- Each task includes test commands and expected responses
- Changelog updated with each significant change
- **Each completed task requires a separate git commit (no co-author)**
- **Commit after testing**: When a task/phase is tested and fully functional, create a commit immediately

**Commit Format:**
```
feat(X.Y): short description

- Bullet point explaining what was done
- Another bullet point with details
- Include "Tested with curl:" section for routes

Example:
feat(3.5): add establishment routes

- POST /v1/establishments - create establishment (authenticated)
- GET /v1/establishments/:id - get establishment by ID (public)
- Register routes in http.adapter.ts

Tested with curl:
- Create: returns establishment with OWNER role
- Get: returns establishment data
```

---

## Task Status Legend

- `[ ]` - Not started
- `[~]` - In progress
- `[x]` - Completed (tested with curl)
- `[!]` - Blocked

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Initialize Project

- [x] **1.1.1** Initialize Node.js project with TypeScript
  - Create package.json with required scripts
  - Configure tsconfig.json for ES2022 target
  - Set up path aliases (@/ for src/)

- [x] **1.1.2** Install dependencies
  - Runtime: fastify, @fastify/cors, @fastify/helmet, @fastify/cookie, prisma, @prisma/client, zod, jsonwebtoken, argon2
  - Dev: typescript, @types/node, tsx, @types/jsonwebtoken, vitest, supertest, @types/supertest, pino-pretty

- [x] **1.1.3** Create folder structure (Ports & Adapters)
  ```
  src/
  ├── domain/
  ├── application/
  ├── adapters/inbound/http/
  ├── adapters/outbound/prisma/
  ├── adapters/outbound/token/
  └── config/
  ```

- [x] **1.1.4** Create environment configuration
  - .env.example with all required variables
  - .env.test for test environment
  - src/config/app.config.ts

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed project initialization | Claude |

---

### 1.2 Database Setup (Prisma)

- [x] **1.2.1** Create Prisma schema with all models
  - User model
  - Establishment model
  - EstablishmentUser model (junction)
  - Service model
  - ExtraItem model
  - Availability model
  - Booking model
  - BookingExtraItem model
  - BookingStatus enum

- [x] **1.2.2** Configure database connection
  - prisma/schema.prisma datasource
  - src/adapters/outbound/prisma/prisma.client.ts
  - prisma/prisma.config.ts (Prisma 7.x adapter config)

- [x] **1.2.3** Create and apply initial migration
  ```bash
  npx prisma migrate dev --name init
  ```

- [x] **1.2.4** Generate Prisma client
  ```bash
  npx prisma generate
  ```

**Test:**
```bash
# Verify database connection
npx prisma db push --force-reset
npx prisma studio
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Created Prisma schema and client with Prisma 7.x adapter | Claude |

---

### 1.3 Fastify Base Setup

- [x] **1.3.1** Create HTTP adapter with base configuration
  - src/adapters/inbound/http/http.adapter.ts
  - Configure logger with redaction
  - Register cors, helmet, cookie plugins

- [x] **1.3.2** Create Prisma plugin
  - src/adapters/inbound/http/plugins/prisma.plugin.ts
  - Decorate fastify instance with prisma client

- [x] **1.3.3** Create error handler plugin
  - src/adapters/inbound/http/plugins/error-handler.plugin.ts
  - Handle DomainError, validation errors, generic errors

- [x] **1.3.4** Create domain errors
  - src/domain/errors.ts
  - DomainError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError, ValidationError

- [x] **1.3.5** Create server entry point
  - src/server.ts
  - Health check endpoint

**Test:**
```bash
# Start server
npm run dev

# Test health endpoint
curl -X GET http://localhost:3000/health
# Expected: {"status":"ok"}
# Result: {"status":"ok"} ✓
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed Fastify setup with health endpoint tested | Claude |

---

## Phase 2: Authentication System

### 2.1 Password Service

- [x] **2.1.1** Create Argon2 configuration
  - src/config/argon2.config.ts
  - argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4

- [x] **2.1.2** Create password service
  - src/application/password.service.ts
  - hash(), verify(), needsRehash() methods

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed password service | Claude |

---

### 2.2 JWT Configuration

- [x] **2.2.1** Create JWT configuration
  - src/config/jwt.config.ts
  - Validate with Zod (min 32 char secrets)
  - Access token: 15m, Refresh token: 7d

- [x] **2.2.2** Create JWT adapter
  - src/adapters/outbound/token/jwt.adapter.ts
  - generateAccessToken(), generateRefreshToken()
  - verifyAccessToken(), verifyRefreshToken()
  - Include userId, email, establishmentRoles in payload

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed JWT configuration and adapter | Claude |

---

### 2.3 User Repository

- [x] **2.3.1** Create user repository
  - src/adapters/outbound/prisma/user.repository.ts
  - findById(), findByEmail(), create(), update()
  - Include establishmentRoles in queries

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed user repository | Claude |

---

### 2.4 Auth Service

- [x] **2.4.1** Create auth service
  - src/application/auth.service.ts
  - register(), login(), refresh(), logout()

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed auth service | Claude |

---

### 2.5 Auth Schemas

- [x] **2.5.1** Create common schemas
  - src/adapters/inbound/http/schemas/common.schema.ts
  - uuidSchema, paginationSchema, emailSchema

- [x] **2.5.2** Create auth schemas
  - src/adapters/inbound/http/schemas/auth.schema.ts
  - registerSchema, loginSchema, refreshSchema

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed validation schemas | Claude |

---

### 2.6 Auth Middleware

- [x] **2.6.1** Create authentication middleware
  - src/adapters/inbound/http/middleware/auth.middleware.ts
  - Extract Bearer token, verify, attach user to request

- [x] **2.6.2** Create validation middleware
  - src/adapters/inbound/http/middleware/validate.ts
  - validate() for body, validateQuery() for query params

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed auth and validation middleware | Claude |

---

### 2.7 Auth Routes

- [x] **2.7.1** POST /v1/auth/register
  - Validate input with Zod
  - Hash password
  - Create user
  - Return tokens

- [x] **2.7.2** POST /v1/auth/login
  - Validate credentials
  - Return access token + refresh token (HttpOnly cookie)

- [x] **2.7.3** POST /v1/auth/refresh
  - Validate refresh token from cookie
  - Return new access token

- [x] **2.7.4** POST /v1/auth/logout
  - Clear refresh token cookie

**Tests:**
```bash
# Register
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'
# Expected: {"accessToken":"...","user":{"id":"...","email":"...","name":"..."}}

# Login
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}' \
  -c cookies.txt
# Expected: {"accessToken":"...","user":{...}}

# Refresh
curl -X POST http://localhost:3000/v1/auth/refresh \
  -b cookies.txt
# Expected: {"accessToken":"..."}

# Logout
curl -X POST http://localhost:3000/v1/auth/logout \
  -b cookies.txt -c cookies.txt
# Expected: {"success":true}
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed auth routes | Claude |

---

## Phase 3: Establishments

### 3.1 Establishment Repository

- [x] **3.1.1** Create establishment repository
  - src/adapters/outbound/prisma/establishment.repository.ts
  - create(), findById(), findByUserId(), update()

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed establishment repository | Claude |

---

### 3.2 Establishment Service

- [x] **3.2.1** Create establishment service
  - src/application/establishment.service.ts
  - create() - auto-assign creator as OWNER
  - findById(), findUserEstablishments(), update()

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed establishment service | Claude |

---

### 3.3 ACL Middleware

- [x] **3.3.1** Create ACL middleware
  - src/adapters/inbound/http/middleware/acl.middleware.ts
  - requireRole('OWNER'), requireRole('STAFF')
  - Check establishmentRoles from JWT payload

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed ACL middleware | Claude |

---

### 3.4 Establishment Schemas

- [x] **3.4.1** Create establishment schemas
  - src/adapters/inbound/http/schemas/establishment.schema.ts
  - createEstablishmentSchema, updateEstablishmentSchema

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed establishment schemas | Claude |

---

### 3.5 Establishment Routes

- [x] **3.5.1** POST /v1/establishments
  - Create establishment
  - Auto-assign creator as OWNER

- [x] **3.5.2** GET /v1/establishments/:id
  - Get establishment by ID (public)

- [x] **3.5.3** PUT /v1/establishments/:id
  - Update establishment (OWNER only)

- [x] **3.5.4** GET /v1/establishments/my
  - Get user's establishments

**Tests:**
```bash
# Create establishment
curl -X POST http://localhost:3000/v1/establishments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"My Spa","description":"Relaxing spa","address":"123 Main St","timezone":"Europe/Lisbon"}'
# Expected: {"id":"...","name":"My Spa",...}
# Result: ✓

# Get establishment
curl -X GET http://localhost:3000/v1/establishments/{id}
# Expected: {"id":"...","name":"My Spa",...}
# Result: ✓

# Update establishment
curl -X PUT http://localhost:3000/v1/establishments/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"My Updated Spa"}'
# Expected: {"id":"...","name":"My Updated Spa",...}
# Result: ✓

# Get my establishments
curl -X GET http://localhost:3000/v1/establishments/my \
  -H "Authorization: Bearer $TOKEN"
# Expected: [{"id":"...","name":"My Spa",...}]
# Result: ✓
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed establishment routes with tests | Claude |

---

## Phase 4: Services

### 4.1 Service Repository

- [x] **4.1.1** Create service repository
  - src/adapters/outbound/prisma/service.repository.ts
  - create(), findById(), findByEstablishment(), update(), softDelete()

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed service repository | Claude |

---

### 4.2 Service Service

- [x] **4.2.1** Create service service
  - src/application/service.service.ts
  - create(), findById(), findByEstablishment(), update(), delete()
  - Prevent delete if active bookings exist

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed service service | Claude |

---

### 4.3 Service Schemas

- [x] **4.3.1** Create service schemas
  - src/adapters/inbound/http/schemas/service.schema.ts
  - createServiceSchema, updateServiceSchema

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed service schemas | Claude |

---

### 4.4 Service Routes

- [x] **4.4.1** POST /v1/establishments/:establishmentId/services
  - Create service (OWNER only)

- [x] **4.4.2** GET /v1/establishments/:establishmentId/services
  - List services for establishment (public)

- [x] **4.4.3** GET /v1/services/:id
  - Get service by ID (public)

- [x] **4.4.4** PUT /v1/services/:id
  - Update service (OWNER only)

- [x] **4.4.5** DELETE /v1/services/:id
  - Soft delete service (OWNER only)

**Tests:**
```bash
# Create service
curl -X POST http://localhost:3000/v1/establishments/{establishmentId}/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Massage","description":"60min massage","basePrice":50.00,"durationMinutes":60,"capacity":1}'
# Expected: {"id":"...","name":"Massage",...}
# Result: ✓

# List services
curl -X GET http://localhost:3000/v1/establishments/{establishmentId}/services
# Expected: [{"id":"...","name":"Massage",...}]
# Result: ✓

# Get service
curl -X GET http://localhost:3000/v1/services/{id}
# Expected: {"id":"...","name":"Massage",...}
# Result: ✓

# Update service
curl -X PUT http://localhost:3000/v1/services/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"basePrice":55.00}'
# Expected: {"id":"...","basePrice":"55.00",...}
# Result: ✓

# Delete service
curl -X DELETE http://localhost:3000/v1/services/{id} \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"success":true}
# Result: ✓
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed service routes with tests | Claude |

---

## Phase 5: Extra Items

### 5.1 ExtraItem Repository

- [x] **5.1.1** Create extra item repository
  - src/adapters/outbound/prisma/extra-item.repository.ts
  - create(), findById(), findByService(), update(), softDelete()

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed extra item repository | Claude |

---

### 5.2 ExtraItem Service

- [x] **5.2.1** Create extra item service
  - src/application/extra-item.service.ts
  - create(), findByService(), update(), delete()

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed extra item service | Claude |

---

### 5.3 ExtraItem Schemas

- [x] **5.3.1** Create extra item schemas
  - src/adapters/inbound/http/schemas/extra-item.schema.ts
  - createExtraItemSchema, updateExtraItemSchema

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed extra item schemas | Claude |

---

### 5.4 ExtraItem Routes

- [x] **5.4.1** POST /v1/services/:serviceId/extras
  - Create extra item (OWNER only)

- [x] **5.4.2** GET /v1/services/:serviceId/extras
  - List extras for service (public)

- [x] **5.4.3** PUT /v1/extras/:id
  - Update extra item (OWNER only)

- [x] **5.4.4** DELETE /v1/extras/:id
  - Soft delete extra item (OWNER only)

**Tests:**
```bash
# Create extra
curl -X POST http://localhost:3000/v1/services/{serviceId}/extras \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Aromatherapy","price":10.00,"maxQuantity":1}'
# Expected: {"id":"...","name":"Aromatherapy",...}
# Result: ✓

# List extras
curl -X GET http://localhost:3000/v1/services/{serviceId}/extras
# Expected: [{"id":"...","name":"Aromatherapy",...}]
# Result: ✓

# Update extra
curl -X PUT http://localhost:3000/v1/extras/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"price":12.00}'
# Expected: {"id":"...","price":"12.00",...}
# Result: ✓

# Delete extra
curl -X DELETE http://localhost:3000/v1/extras/{id} \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"success":true}
# Result: ✓
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed extra item routes with tests | Claude |

---

## Phase 6: Availability

### 6.1 Availability Repository

- [x] **6.1.1** Create availability repository
  - src/adapters/outbound/prisma/availability.repository.ts
  - create(), findById(), findByService(), findByDateRange(), update(), delete()
  - checkOverlap() method

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed availability repository | Claude |

---

### 6.2 Availability Service

- [x] **6.2.1** Create availability service
  - src/application/availability.service.ts
  - create() with overlap validation
  - findByService(), update(), delete()

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed availability service | Claude |

---

### 6.3 Availability Schemas

- [x] **6.3.1** Create availability schemas
  - src/adapters/inbound/http/schemas/availability.schema.ts
  - createAvailabilitySchema, updateAvailabilitySchema, queryAvailabilitySchema

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed availability schemas | Claude |

---

### 6.4 Availability Routes

- [x] **6.4.1** POST /v1/services/:serviceId/availabilities
  - Create availability slot (OWNER only)
  - Validate no overlap

- [x] **6.4.2** GET /v1/services/:serviceId/availabilities
  - List availabilities with optional date filter (public)

- [x] **6.4.3** PUT /v1/availabilities/:id
  - Update availability (OWNER only)

- [x] **6.4.4** DELETE /v1/availabilities/:id
  - Delete availability (OWNER only)

**Tests:**
```bash
# Create availability
curl -X POST http://localhost:3000/v1/services/{serviceId}/availabilities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2025-01-15","startTime":"09:00","endTime":"10:00","capacity":5}'
# Expected: {"id":"...","date":"2025-01-15",...}
# Result: ✓

# List availabilities
curl -X GET "http://localhost:3000/v1/services/{serviceId}/availabilities?startDate=2025-01-01&endDate=2025-01-31"
# Expected: [{"id":"...","date":"2025-01-15",...}]
# Result: ✓

# Update availability
curl -X PUT http://localhost:3000/v1/availabilities/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"capacity":10}'
# Expected: {"id":"...","capacity":10,...}
# Result: ✓

# Delete availability
curl -X DELETE http://localhost:3000/v1/availabilities/{id} \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"success":true}
# Result: ✓

# Test overlap prevention
curl -X POST http://localhost:3000/v1/services/{serviceId}/availabilities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2025-01-15","startTime":"09:30","endTime":"10:30","capacity":5}'
# Expected: {"error":{"code":"CONFLICT","message":"Time slot overlaps..."}}
# Result: ✓
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Completed availability routes with tests | Claude |

---

## Phase 7: Bookings

### 7.1 Booking Repository

- [ ] **7.1.1** Create booking repository
  - src/adapters/outbound/prisma/booking.repository.ts
  - create(), findById(), findByUser(), findByEstablishment(), update()
  - Include service, extras in queries

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | Task created | - |

---

### 7.2 Booking Service

- [ ] **7.2.1** Create booking service with transaction
  - src/application/booking.service.ts
  - create() - full transaction:
    - Validate service exists and active
    - Check availability capacity
    - Calculate total price (base + extras)
    - Decrement availability capacity
    - Create booking with frozen prices
  - findById(), findByUser(), findByEstablishment()
  - cancel() - restore capacity in transaction

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | Task created | - |

---

### 7.3 Booking Schemas

- [ ] **7.3.1** Create booking schemas
  - src/adapters/inbound/http/schemas/booking.schema.ts
  - createBookingSchema (serviceId, availabilityId, quantity, extras[])
  - listBookingsQuerySchema (pagination, status filter)

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | Task created | - |

---

### 7.4 Booking Routes

- [ ] **7.4.1** POST /v1/bookings
  - Create booking (authenticated user)
  - Full transaction with capacity management

- [ ] **7.4.2** GET /v1/bookings/:id
  - Get booking by ID (owner or establishment staff)

- [ ] **7.4.3** GET /v1/bookings/my
  - Get current user's bookings with pagination

- [ ] **7.4.4** GET /v1/establishments/:id/bookings
  - Get establishment bookings (OWNER or STAFF)

- [ ] **7.4.5** PUT /v1/bookings/:id/cancel
  - Cancel booking (owner or establishment OWNER/STAFF)
  - Restore availability capacity

**Tests:**
```bash
# Create booking
curl -X POST http://localhost:3000/v1/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"serviceId":"...","availabilityId":"...","quantity":1,"extras":[{"extraItemId":"...","quantity":1}]}'
# Expected: {"id":"...","status":"CONFIRMED","totalPrice":"60.00",...}

# Get booking
curl -X GET http://localhost:3000/v1/bookings/{id} \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"id":"...","status":"CONFIRMED",...}

# Get my bookings
curl -X GET "http://localhost:3000/v1/bookings/my?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"data":[...],"total":1,"page":1,"limit":10}

# Get establishment bookings
curl -X GET "http://localhost:3000/v1/establishments/{id}/bookings?status=CONFIRMED" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"data":[...],"total":1,...}

# Cancel booking
curl -X PUT http://localhost:3000/v1/bookings/{id}/cancel \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"id":"...","status":"CANCELLED",...}

# Test overbooking prevention
# (Create bookings until capacity is full, then try one more)
# Expected: {"error":{"code":"CONFLICT","message":"No available capacity..."}}
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | Task created | - |

---

## Phase 8: Testing & Quality

### 8.1 E2E Test Setup

- [ ] **8.1.1** Configure Vitest
  - vitest.config.ts
  - tests/e2e/setup.ts (database reset, app instance)
  - tests/e2e/helpers/test-client.ts

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | Task created | - |

---

### 8.2 E2E Tests

- [ ] **8.2.1** Auth E2E tests
  - tests/e2e/auth.e2e.test.ts
  - Register, login, refresh, logout flows

- [ ] **8.2.2** Booking E2E tests
  - tests/e2e/booking.e2e.test.ts
  - Full booking flow
  - Overbooking prevention
  - Cancellation with capacity restore
  - Concurrent booking test

- [ ] **8.2.3** ACL E2E tests
  - tests/e2e/acl.e2e.test.ts
  - OWNER vs STAFF permissions
  - Unauthorized access attempts

**Tests:**
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth.e2e.test.ts
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | Task created | - |

---

## Phase 9: Final Polish

### 9.1 Security Hardening

- [ ] **9.1.1** Rate limiting on auth endpoints
  - Install @fastify/rate-limit
  - Configure for /v1/auth/* routes

- [ ] **9.1.2** Input sanitization review
  - Verify all inputs validated with Zod
  - Check for SQL injection vectors (Prisma handles)
  - XSS prevention (JSON responses)

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | Task created | - |

---

### 9.2 Documentation

- [ ] **9.2.1** API documentation
  - OpenAPI/Swagger spec (optional)
  - Postman collection

- [ ] **9.2.2** Update README with:
  - Setup instructions
  - Environment variables
  - API examples

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | Task created | - |

---

## Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| 1. Project Setup | 15 subtasks | Completed |
| 2. Authentication | 14 subtasks | Completed |
| 3. Establishments | 9 subtasks | Completed |
| 4. Services | 9 subtasks | Completed |
| 5. Extra Items | 8 subtasks | Completed |
| 6. Availability | 8 subtasks | Completed |
| 7. Bookings | 9 subtasks | Not started |
| 8. Testing | 4 subtasks | Not started |
| 9. Final Polish | 4 subtasks | Not started |

**Total: 80 subtasks**

---

## Global Changelog

| Date | Phase | Change | Author |
|------|-------|--------|--------|
| 2025-12-23 | - | Initial task list created | Claude |
| 2025-12-23 | 1 | Phase 1 completed - Project Setup & Infrastructure | Claude |
| 2025-12-23 | 2 | Phase 2 completed - Authentication System | Claude |
| 2025-12-23 | 3 | Phase 3 completed - Establishments | Claude |
| 2025-12-23 | 4 | Phase 4 completed - Services | Claude |
| 2025-12-23 | 5 | Phase 5 completed - Extra Items | Claude |
| 2025-12-23 | 6 | Phase 6 completed - Availability | Claude |
