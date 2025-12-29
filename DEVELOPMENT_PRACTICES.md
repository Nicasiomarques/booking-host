# Development Practices - Booking Service

This document describes the practices and conventions used in the project to maintain consistency in naming, imports, commits, code structure, and TypeScript patterns.

---

## Table of Contents

1. [Naming Conventions](#1-naming-conventions)
2. [Import Organization](#2-import-organization)
3. [Commit Conventions](#3-commit-conventions)
4. [Code Structure](#4-code-structure)
5. [TypeScript Patterns](#5-typescript-patterns)
6. [Path Aliases](#6-path-aliases)
7. [Modular Architecture](#7-modular-architecture)

---

## 1. Naming Conventions

### 1.1 Files

**Rule:** Use `kebab-case` for file names.

**Examples:**
- ✅ `endpoints.ts`
- ✅ `service.service.ts`
- ✅ `auth.middleware.ts`
- ✅ `error-handler.plugin.ts`
- ❌ `Endpoints.ts` (should be `endpoints.ts`)
- ❌ `serviceService.ts`

**Exceptions:**
- Configuration files may use other patterns if necessary (e.g., `tsconfig.json`, `vitest.config.ts`)

### 1.2 Variables and Functions

**Rule:** Use `camelCase` for variables and functions.

**Examples:**
```typescript
// ✅ Correct
const createServiceService = (deps) => { ... }
const requireRole = (...roles) => { ... }
const userId = '123'
const isAuthenticated = true

// ❌ Incorrect
const CreateServiceService = (deps) => { ... }
const require_role = (...roles) => { ... }
const UserId = '123'
```

### 1.3 Interfaces and Types

**Rule:** Use `PascalCase` for interfaces, types, and classes.

**Examples:**
```typescript
// ✅ Correct
export interface ServiceComposition { ... }
export type CreateServiceInput = z.infer<typeof createServiceSchema>
export class DomainError extends Error { ... }

// ❌ Incorrect
export interface serviceComposition { ... }
export type createServiceInput = ...
```

### 1.4 Constants

**Rule:** Use `camelCase` for local constants, `UPPER_SNAKE_CASE` for global/configuration constants.

**Examples:**
```typescript
// ✅ Local constants
const maxRetries = 3
const defaultTimeout = 5000

// ✅ Global/configuration constants
const API_BASE_URL = 'http://localhost:3000'
const MAX_FILE_SIZE = 10 * 1024 * 1024
```

### 1.5 Enums

**Rule:** Use `PascalCase` for enum names and `UPPER_SNAKE_CASE` for enum values.

**Examples:**
```typescript
// ✅ Correct
enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

enum Role {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}
```

---

## 2. Import Organization

### 2.1 Import Order

**Rule:** Organize imports in the following order:

1. **External imports** (npm packages)
2. **Internal imports with path aliases** (grouped by module)
3. **Relative imports** (use only when necessary)

**Example:**
```typescript
// 1. External imports
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

// 2. Internal imports with path aliases (grouped by module)
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'
import type * as Ports from '#shared/application/ports/index.js'
import { requireRole } from '#shared/adapters/http/middleware/index.js'

// 3. Relative imports (avoid when possible)
import type { Service } from '../domain/index.js'
import { createServiceSchema } from './schemas.js'
```

### 2.2 Type Import Separation

**Rule:** Use `import type` for imports that are only types/interfaces.

**Examples:**
```typescript
// ✅ Correct - types separated
import type * as Domain from '#shared/domain/index.js'
import type { Service } from '../domain/index.js'
import { requireRole } from '#shared/adapters/http/middleware/index.js'

// ✅ Also correct - inline types when mixed with values
import { z, type ZodSchema } from 'zod'
```

### 2.3 File Extensions

**Rule:** Always include the `.js` extension in imports (ESM requirement).

**Examples:**
```typescript
// ✅ Correct
import { createServiceService } from './application/service.service.js'
import type * as Domain from '#shared/domain/index.js'

// ❌ Incorrect
import { createServiceService } from './application/service.service'
import type * as Domain from '#shared/domain/index'
```

### 2.4 Import Grouping

**Rule:** Group related imports and separate groups with a blank line.

**Example:**
```typescript
// Group 1: External
import { FastifyInstance } from 'fastify'
import { z } from 'zod'

// Group 2: Domain types
import type * as Domain from '#shared/domain/index.js'
import type * as ServiceDomain from '../domain/index.js'

// Group 3: Shared utilities
import * as DomainValues from '#shared/domain/index.js'
import { requireRole } from '#shared/adapters/http/middleware/index.js'

// Group 4: Local
import { createServiceSchema } from './schemas.js'
```

---

## 3. Commit Conventions

### 3.1 Commit Format

**Rule:** Use conventional commit format with phase/task prefix.

**Format:**
```
<type>(<scope>): <short description>

- Bullet point explaining what was done
- Another bullet point with details
- Include "Tested:" section when applicable
```

### 3.2 Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance tasks

### 3.3 Scope by Package

**Backend:**
- Format: `feat(X.Y): description`
- Example: `feat(3.5): add establishment routes`

**Frontend:**
- Format: `feat(fe-X.Y): description`
- Example: `feat(fe-5.1): create establishment service`

### 3.4 Commit Examples

**Backend:**
```
feat(3.5): add establishment routes

- POST /v1/establishments - create establishment (authenticated)
- GET /v1/establishments/:id - get establishment by ID (public)
- Register routes in http.adapter.ts

Tested with curl:
- Create: returns establishment with OWNER role
- Get: returns establishment data
```

**Frontend:**
```
feat(fe-5.1): create establishment service

- Implement establishment.service.ts with CRUD methods
- Add useEstablishments hook with TanStack Query
- Create EstablishmentForm component with Zod validation

Tested:
- Using e2e test using Playwright
```

**Refactoring:**
```
refactor(10.1): move repositories to feature modules

- Moved all repositories from shared/adapters/outbound/prisma/ to features/{feature}/adapters/persistence/
- Each feature now contains its own repository implementation
- Created index.ts exports for each repository module
```

---

## 4. Code Structure

### 4.1 Feature Structure

Each feature should follow this structure:

```
features/
├── {feature-name}/
│   ├── domain/
│   │   ├── {feature}.ts          # Domain entities and types
│   │   └── index.ts               # Public exports
│   ├── application/
│   │   ├── {feature}.service.ts   # Business logic
│   │   └── index.ts
│   ├── adapters/
│   │   ├── repository.ts          # Prisma repository (or persistence/)
│   │   ├── endpoints.ts           # HTTP routes (or http/endpoints.ts)
│   │   ├── schemas.ts             # Zod schemas
│   │   └── index.ts               # Fastify plugin (if applicable)
│   └── composition.ts             # Composition module (DI)
```

### 4.2 File Names by Type

| Type | File Name | Example |
|------|-----------|---------|
| Service | `{feature}.service.ts` | `service.service.ts` |
| Repository | `repository.ts` or `{feature}.repository.ts` | `repository.ts` |
| Endpoints | `endpoints.ts` | `endpoints.ts` |
| Schemas | `schemas.ts` | `schemas.ts` |
| Composition | `composition.ts` | `composition.ts` |
| Domain | `{feature}.ts` | `service.ts` |

### 4.3 Code Organization within Files

**Recommended order:**

1. Imports (following order defined in section 2)
2. Types/Interfaces (if not in separate file)
3. Constants
4. Helper/auxiliary functions
5. Main/exported functions
6. Exports

**Example:**
```typescript
// 1. Imports
import { z } from 'zod'
import type * as Domain from '#shared/domain/index.js'

// 2. Types
export interface CreateServiceInput {
  name: string
  basePrice: number
}

// 3. Constants
const DEFAULT_CAPACITY = 1

// 4. Helpers
function validatePrice(price: number): boolean {
  return price > 0
}

// 5. Main functions
export const createServiceService = (deps) => {
  // ...
}

// 6. Exports (if necessary)
export default createServiceService
```

---

## 5. TypeScript Patterns

### 5.1 Either Pattern

**Rule:** Use the `Either<L, R>` pattern for error handling instead of throwing exceptions.

**Example:**
```typescript
import type * as Domain from '#shared/domain/index.js'
import * as DomainValues from '#shared/domain/index.js'

async function findById(id: string): Promise<Domain.Either<Domain.DomainError, Service>> {
  const result = await repository.findById(id)
  if (DomainValues.isLeft(result)) {
    return result // Return error
  }
  return DomainValues.right(result.value) // Return success
}
```

### 5.2 Factory Functions

**Rule:** Use factory functions for creating services and repositories.

**Example:**
```typescript
export const createServiceService = (deps: {
  repository: Ports.ServiceRepositoryPort
  establishmentRepository: Ports.EstablishmentRepositoryPort
}) => ({
  async create(...) { ... },
  async findById(...) { ... },
  // ...
})
```

### 5.3 Type Imports

**Rule:** Separate type imports using `import type`.

**Example:**
```typescript
// ✅ Correct
import type * as Domain from '#shared/domain/index.js'
import type { Service } from '../domain/index.js'
import { requireRole } from '#shared/adapters/http/middleware/index.js'

// ❌ Avoid (but acceptable in some cases)
import { requireRole, type Domain } from '#shared/...'
```

### 5.4 Interfaces vs Types

**Rule:** 
- Use `interface` for objects that can be extended
- Use `type` for unions, intersections, and primitive types

**Example:**
```typescript
// ✅ Interface for objects
export interface ServiceComposition {
  repository: Ports.ServiceRepositoryPort
  service: ReturnType<typeof createServiceService>
}

// ✅ Type for unions/primitives
export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'
```

### 5.5 Validation with Zod

**Rule:** Use Zod for schema validation and type inference.

**Example:**
```typescript
import { z } from 'zod'

export const createServiceSchema = z.object({
  name: z.string().min(1),
  basePrice: z.number().positive(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
```

---

## 6. Path Aliases

### 6.1 Available Aliases

The project uses the following path aliases configured in `tsconfig.json`:

| Alias | Path | Description |
|-------|------|-------------|
| `#shared` | `src/shared` | Code shared between features |
| `#features` | `src/features` | Modular features |
| `#config` | `src/config` | Application configuration |
| `#domain` | `src/shared/domain` | Shared domain |
| `#application` | `src/shared/application` | Shared application layer |
| `#adapters` | `src/shared/adapters` | Shared adapters |

### 6.2 Using Path Aliases

**Rule:** Use path aliases for internal imports instead of relative paths when possible.

**Examples:**
```typescript
// ✅ Correct - using path aliases
import type * as Domain from '#shared/domain/index.js'
import { requireRole } from '#shared/adapters/http/middleware/index.js'
import { createServiceService } from '#features/service/application/service.service.js'

// ✅ Acceptable - relative imports within the same feature
import type { Service } from '../domain/index.js'
import { createServiceSchema } from './schemas.js'

// ❌ Avoid - very deep relative paths
import { something } from '../../../../shared/domain/index.js'
```

### 6.3 Import Structure with Aliases

**Recommended order when using aliases:**

1. `#shared/domain` (domain types)
2. `#shared/application` (ports, utils)
3. `#shared/adapters` (middleware, HTTP utils)
4. `#features/{feature}` (other features)
5. `#config` (configuration)
6. Relative imports (within the same feature)

---

## 7. Modular Architecture

### 7.1 Principles

- **Each feature is self-contained**: has its own repositories, adapters, services, and domain
- **Composition modules**: each feature has a `composition.ts` that instantiates its dependencies
- **Separation of concerns**: mappers separated from endpoints, repositories within features
- **Centralized registration**: routes registered in `shared/adapters/http/routes/index.ts`

### 7.2 Composition Structure

**Rule:** Each feature should have a `composition.ts` file that exports a factory function.

**Example:**
```typescript
import { PrismaClient } from '@prisma/client'
import { createServiceService } from './application/service.service.js'
import { createServiceRepository } from './adapters/repository.js'
import type * as Ports from '#shared/application/ports/index.js'

export interface ServiceComposition {
  repository: Ports.ServiceRepositoryPort
  service: ReturnType<typeof createServiceService>
}

export function createServiceComposition(
  prisma: PrismaClient,
  dependencies: {
    errorHandler: Ports.RepositoryErrorHandlerPort
  }
): ServiceComposition {
  const repository = createServiceRepository(prisma, dependencies.errorHandler)
  const service = createServiceService({ repository })

  return { repository, service }
}
```

### 7.3 HTTP Endpoints

**Rule:** Endpoints should use helpers when possible to reduce repetitive code.

**Example:**
```typescript
import { registerGetByIdEndpoint, registerUpdateEndpoint } from '#shared/adapters/http/utils/endpoint-helpers.js'

export default async function serviceEndpoints(fastify: FastifyInstance) {
  const { service } = fastify.services

  registerGetByIdEndpoint(fastify, {
    path: '/services/:id',
    tags: ['Services'],
    entityName: 'Service',
    responseSchema: serviceResponseSchema,
    service: { findById: (id) => service.findById(id) },
    formatter: formatServiceResponse,
  })
}
```

### 7.4 Zod Schemas

**Rule:** Schemas should include OpenAPI metadata when applicable.

**Example:**
```typescript
import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const createServiceSchema = z
  .object({
    name: z.string().min(1).openapi({
      description: 'Service name',
      example: 'Massage Therapy',
    }),
    basePrice: z.number().positive().openapi({
      description: 'Base price in currency units',
      example: 50.00,
    }),
  })
  .openapi({
    title: 'CreateServiceInput',
    description: 'Input for creating a new service',
  })
```

### 7.5 Service Specialization

**Rule:** Complex services can be split into specialized services for better organization.

**Example:**
For services with multiple responsibilities (like booking), split into:
- `{feature}-creation.service.ts` - Logic for creating entities
- `{feature}-query.service.ts` - Logic for querying/reading entities
- `{feature}-status.service.ts` - Logic for status transitions/state changes
- `{feature}.service.ts` - Main orchestrator that combines all specialized services

```typescript
// booking.service.ts (orchestrator)
export const createBookingService = (deps: BookingServiceDependencies) => {
  const creationService = createBookingCreationService({...})
  const queryService = createBookingQueryService({...})
  const statusService = createBookingStatusService({...})

  return {
    create: creationService.create.bind(creationService),
    findById: queryService.findById.bind(queryService),
    findByUser: queryService.findByUser.bind(queryService),
    cancel: statusService.cancel.bind(statusService),
    confirm: statusService.confirm.bind(statusService),
    checkIn: statusService.checkIn.bind(statusService),
    // ...
  }
}
```

---

## 8. Additional Best Practices

### 8.1 Logging

**Rule:** Use Fastify's logger for structured logging.

**Example:**
```typescript
request.log.info({ userId, establishmentId }, 'Creating service')
request.log.error({ error }, 'Failed to create service')
```

### 8.2 Error Handling

**Rule:** Use DomainError and its subclasses for domain errors.

**Example:**
```typescript
import * as DomainValues from '#shared/domain/index.js'

if (!service) {
  throw new DomainValues.NotFoundError('Service')
}

if (capacity < 0) {
  throw new DomainValues.ValidationError('Capacity must be positive')
}
```

### 8.3 Validation

**Rule:** Validate inputs with Zod before processing.

**Example:**
```typescript
import { validate } from '#shared/adapters/http/middleware/validate.js'

fastify.post('/services', {
  preHandler: [authenticate, validate(createServiceSchema)],
  handler: async (request, reply) => {
    // request.body is already validated
  }
})
```

### 8.4 Authorization

**Rule:** Use authorization middleware to verify permissions.

**Example:**
```typescript
import { requireRole } from '#shared/adapters/http/middleware/acl.middleware.js'

fastify.post('/services', {
  preHandler: [authenticate, requireRole('OWNER')],
  handler: async (request, reply) => {
    // User has already been verified as OWNER
  }
})
```

### 8.5 Endpoint Helpers

**Rule:** Use endpoint helpers to reduce boilerplate for common CRUD operations.

**Available Helpers:**
- `registerGetByIdEndpoint` - GET by ID endpoint
- `registerCreateEndpoint` - POST create endpoint
- `registerUpdateEndpoint` - PUT update endpoint
- `registerDeleteEndpoint` - DELETE endpoint
- `registerListEndpoint` - GET list endpoint

**Example:**
```typescript
import { registerGetByIdEndpoint, registerUpdateEndpoint } from '#shared/adapters/http/utils/endpoint-helpers.js'

export default async function serviceEndpoints(fastify: FastifyInstance) {
  const { service } = fastify.services

  registerGetByIdEndpoint(fastify, {
    path: '/services/:id',
    tags: ['Services'],
    entityName: 'Service',
    responseSchema: serviceResponseSchema,
    service: { findById: (id) => service.findById(id) },
    formatter: formatServiceResponse,
  })

  registerUpdateEndpoint(fastify, {
    path: '/services/:id',
    tags: ['Services'],
    entityName: 'Service',
    updateSchema: updateServiceSchema,
    responseSchema: serviceResponseSchema,
    service: { update: (id, data, userId) => service.update(id, data, userId) },
    formatter: formatServiceResponse,
    preHandler: [requireRole('OWNER')],
  })
}
```

### 8.6 Either Pattern Handling

**Rule:** Use `handleEitherAsync` helper to convert Either results to HTTP responses.

**Example:**
```typescript
import { handleEitherAsync } from '#shared/adapters/http/utils/either-handler.js'

fastify.post('/services', {
  handler: async (request, reply) => {
    return handleEitherAsync(
      service.create(data, request.user.userId),
      reply,
      (result) => formatServiceResponse(result),
      201 // success status code
    )
  }
})
```

### 8.7 Validation Helpers

**Rule:** Use validation helpers for common validation patterns.

**Available Helpers:**
- `requireEntity(entity, entityName)` - Ensures entity exists, returns Either<NotFoundError, T>
- `isLeft(either)` - Type guard to check if Either is Left (error)

**Example:**
```typescript
import * as Validation from '#shared/application/utils/validation.helper.js'

const serviceResult = await repository.findById(id)
if (Validation.isLeft(serviceResult)) return serviceResult;

const serviceEither = Validation.requireEntity(serviceResult.value, 'Service')
if (Validation.isLeft(serviceEither)) return serviceEither;
const service = serviceEither.value
```

### 8.8 Authorization Helpers

**Rule:** Use authorization helpers for role verification in services.

**Available Helpers:**
- `requireOwnerRole(getUserRole, userId, establishmentId, action?)` - Verifies user has OWNER role

**Example:**
```typescript
import * as Authorization from '#shared/application/utils/authorization.helper.js'

const ownerResult = await Authorization.requireOwnerRole(
  (userId, estId) => establishmentRepository.getUserRole(userId, estId),
  userId,
  establishmentId,
  'create services'
)
if (Validation.isLeft(ownerResult)) return ownerResult;
```

---

## 9. Review Checklist

Before committing, verify:

- [ ] Naming follows conventions (kebab-case for files, camelCase for functions)
- [ ] Imports are organized (external → internal with aliases)
- [ ] Imports include `.js` extension
- [ ] Type imports use `import type`
- [ ] Commit follows format `feat(X.Y): description`
- [ ] Code uses Either pattern for errors
- [ ] Factory functions for services/repositories
- [ ] Zod schemas with OpenAPI metadata when applicable
- [ ] Composition.ts exports factory function
- [ ] Endpoints use helpers when possible (registerGetByIdEndpoint, etc.)
- [ ] Complex services split into specialized services when appropriate
- [ ] Validation helpers used for entity checks (requireEntity)
- [ ] Either results handled with handleEitherAsync

---

## 10. References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev/)
- [Fastify Documentation](https://www.fastify.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

*Last updated: January 2025*
