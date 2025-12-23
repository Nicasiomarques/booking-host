# Booking API

API de gestao de reservas para estabelecimentos multi-tenant.

## Visao Geral

Esta API permite que estabelecimentos:

- Registem servicos reservaveis
- Definam disponibilidade por data/horario
- Oferecem itens extras opcionais
- Recebam e gerenciem reservas
- Controlem acessos via ACL (OWNER/STAFF)

---

## Stack Tecnologico

| Componente | Tecnologia | Versao |
|------------|------------|--------|
| Runtime | Node.js | 22+ |
| Framework | Fastify | 5.x |
| Linguagem | TypeScript | 5.x |
| Base de Dados | PostgreSQL | - |
| ORM | Prisma | 7.x |
| Validacao | Zod | 4.x |
| Auth | JWT (jsonwebtoken) | 9.x |
| Password | Argon2 | 0.44.x |
| Testes | Vitest | 4.x |
| Docs | Swagger/OpenAPI | - |

---

## Arquitetura

O projeto segue **Arquitetura Hexagonal (Ports & Adapters)**:

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
    end

    subgraph "Domain"
        DT[Types & Errors]
    end

    subgraph "Adapters Outbound"
        PR[Prisma Repositories]
        JWT[JWT Adapter]
    end

    subgraph "Infrastructure"
        DB[(PostgreSQL)]
    end

    HTTP --> MW
    MW --> AS & ES & SS & AVS & EIS & BS
    AS & ES & SS & AVS & EIS & BS --> DT
    AS & ES & SS & AVS & EIS & BS --> PR & JWT
    PR --> DB
```

### Estrutura de Diretorios

```
src/
├── domain/                    # Logica de dominio (sem deps externas)
│   ├── errors.ts             # DomainError, NotFoundError, etc.
│   └── types.ts              # Role types
├── application/              # Servicos de negocio
│   ├── auth.service.ts
│   ├── booking.service.ts
│   ├── establishment.service.ts
│   ├── service.service.ts
│   ├── availability.service.ts
│   ├── extra-item.service.ts
│   └── password.service.ts
├── adapters/
│   ├── inbound/http/         # Camada HTTP (Fastify)
│   │   ├── routes/           # Rotas por dominio
│   │   ├── middleware/       # Auth, ACL, Validation
│   │   ├── schemas/          # Schemas Zod
│   │   └── plugins/          # Prisma, Error Handler
│   └── outbound/
│       ├── prisma/           # Repositorios
│       └── token/            # JWT adapter
└── config/                   # Configuracoes
```

---

## Modelo de Dados (ERD)

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
        boolean active
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
        int quantity
        decimal totalPrice
        enum status "PENDING | CONFIRMED | CANCELLED"
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
    Availability ||--o{ Booking : "used in"
    Booking ||--o{ BookingExtraItem : "includes"
    ExtraItem ||--o{ BookingExtraItem : "added to"
```

---

## Fluxos Principais

### Fluxo de Autenticacao

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

### Fluxo de Reserva

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

### Fluxo de Cancelamento

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

### Fluxo de Criacao de Estabelecimento

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

### Fluxo de Gestao de Servicos

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

### Fluxo de Gestao de Disponibilidade

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

### Fluxo de Gestao de Extras

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

### Fluxo Completo: Usuario ate Reserva

```mermaid
sequenceDiagram
    participant U as User
    participant API as API
    participant DB as Database

    Note over U,DB: 1. Registo
    U->>API: POST /v1/auth/register
    API->>DB: Create User
    API-->>U: { accessToken } + Cookie

    Note over U,DB: 2. Explorar Estabelecimentos
    U->>API: GET /v1/establishments/{id}
    API->>DB: Get Establishment
    API-->>U: { establishment }

    Note over U,DB: 3. Ver Servicos
    U->>API: GET /v1/establishments/{id}/services
    API->>DB: Get Services (active only)
    API-->>U: [ services ]

    Note over U,DB: 4. Ver Disponibilidade
    U->>API: GET /v1/services/{id}/availabilities
    Note right of U: ?startDate=2025-01-20&endDate=2025-01-25
    API->>DB: Get Availabilities (filtered)
    API-->>U: [ availabilities ]

    Note over U,DB: 5. Ver Extras
    U->>API: GET /v1/services/{id}/extras
    API->>DB: Get ExtraItems (active only)
    API-->>U: [ extras ]

    Note over U,DB: 6. Criar Reserva
    U->>API: POST /v1/bookings
    Note right of U: { serviceId, availabilityId,<br/>quantity, extras }
    API->>DB: Transaction: Create Booking
    API-->>U: 201 { booking }
```

---

## API Endpoints

Base URL: `/v1`

### Autenticacao

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | `/auth/register` | Registo de utilizador | - |
| POST | `/auth/login` | Login | - |
| POST | `/auth/refresh` | Renovar access token | Cookie |
| POST | `/auth/logout` | Logout (limpa cookie) | - |

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

### Estabelecimentos

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | `/establishments` | Criar estabelecimento | Bearer |
| GET | `/establishments/:id` | Obter por ID | - |
| GET | `/establishments/my` | Meus estabelecimentos | Bearer |
| PUT | `/establishments/:id` | Atualizar | OWNER |

### Servicos

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | `/establishments/:id/services` | Criar servico | OWNER |
| GET | `/establishments/:id/services` | Listar servicos | - |
| GET | `/services/:id` | Obter servico | - |
| PUT | `/services/:id` | Atualizar servico | OWNER |
| DELETE | `/services/:id` | Soft delete | OWNER |

### Itens Extras

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | `/services/:id/extras` | Criar extra | OWNER |
| GET | `/services/:id/extras` | Listar extras | - |
| PUT | `/extras/:id` | Atualizar extra | OWNER |
| DELETE | `/extras/:id` | Soft delete | OWNER |

### Disponibilidade

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | `/services/:id/availabilities` | Criar slot | OWNER |
| GET | `/services/:id/availabilities` | Listar slots | - |
| PUT | `/availabilities/:id` | Atualizar slot | OWNER |
| DELETE | `/availabilities/:id` | Remover slot | OWNER |

### Reservas

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | `/bookings` | Criar reserva | Bearer |
| GET | `/bookings/:id` | Obter reserva | Bearer |
| GET | `/bookings/my` | Minhas reservas | Bearer |
| GET | `/establishments/:id/bookings` | Reservas do estabelecimento | STAFF+ |
| PUT | `/bookings/:id/cancel` | Cancelar reserva | Owner |

---

## ACL - Controle de Acesso

| Acao | OWNER | STAFF | User |
|------|-------|-------|------|
| Criar/Editar servico | ✅ | ❌ | ❌ |
| Gerir extras | ✅ | ❌ | ❌ |
| Gerir disponibilidade | ✅ | ❌ | ❌ |
| Ver reservas do estabelecimento | ✅ | ✅ | ❌ |
| Criar reserva | ✅ | ✅ | ✅ |
| Cancelar propria reserva | ✅ | ✅ | ✅ |

---

## Seguranca

### Autenticacao JWT

- **Access Token**: 15 minutos (configuravel)
- **Refresh Token**: 7 dias, HttpOnly cookie
- **Algoritmo**: HS256
- **Validacao**: Issuer + Audience

### Password

- **Algoritmo**: Argon2id
- **Memoria**: 64MB
- **Iteracoes**: 3
- **Rehash automatico** em login se parametros mudarem

### HTTP Security

- **Helmet**: Headers de seguranca
- **CORS**: Configuravel por ambiente
- **Rate Limiting**: 5 req/min em auth (prod)
- **Cookie Flags**: HttpOnly, Secure (prod), SameSite=strict

### Validacao

- **Zod** em todos os inputs
- **Email normalizacao** (lowercase)
- **UUID validation** em parametros

---

## Error Handling

### Formato de Erro

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Service not found"
  }
}
```

### Codigos de Erro

| Codigo | HTTP | Descricao |
|--------|------|-----------|
| VALIDATION_ERROR | 422 | Input invalido |
| UNAUTHORIZED | 401 | Token invalido/ausente |
| FORBIDDEN | 403 | Sem permissao |
| NOT_FOUND | 404 | Recurso nao encontrado |
| CONFLICT | 409 | Conflito (ex: sem capacidade) |
| TOO_MANY_REQUESTS | 429 | Rate limit excedido |
| INTERNAL_ERROR | 500 | Erro interno |

---

## Quick Start

### Pre-requisitos

- Node.js 22+
- PostgreSQL
- npm/yarn/pnpm

### Instalacao

```bash
# Clonar e instalar
git clone <repo>
cd booking-service
npm install

# Configurar ambiente
cp .env.example .env
# Editar .env com as suas configuracoes

# Configurar base de dados
npm run db:migrate

# Iniciar em desenvolvimento
npm run dev
```

### Variaveis de Ambiente

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

### Scripts Disponiveis

```bash
npm run dev          # Desenvolvimento com hot-reload
npm run build        # Compilar TypeScript
npm start            # Producao
npm test             # Testes em watch mode
npm run test:e2e     # Testes E2E
npm run db:generate  # Gerar Prisma Client
npm run db:migrate   # Executar migracoes
npm run db:push      # Sync schema (dev)
npm run db:studio    # Prisma Studio GUI
```

---

## Documentacao API

Swagger UI disponivel em `/docs` quando o servidor esta a correr.

---

## Regras de Negocio

### Reservas

- Criacao sempre em **transacao**
- **Capacidade atomica** - decrementada na criacao, restaurada no cancelamento
- **Preco calculado** no backend (nao confiavel do cliente)
- **Extras com preco congelado** (price_at_booking)

### Disponibilidade

- **Sem overlaps** de horarios no mesmo servico
- **Capacidade minima** de 1
- **Nao pode eliminar** se houver reservas associadas

### Soft Delete

- Servicos e ExtraItems usam flag `active`
- Permite manter historico de reservas

---

## Testes

```bash
# Executar todos os testes
npm run test:e2e

# Watch mode
npm test
```

Testes E2E cobrem:
- Fluxos de autenticacao
- CRUD de todas as entidades
- ACL e permissoes
- Cenarios de booking (sucesso, conflito, cancelamento)
