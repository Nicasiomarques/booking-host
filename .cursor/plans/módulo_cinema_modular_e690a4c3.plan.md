---
name: Módulo Cinema Modular com Reaproveitamento
overview: Criar módulo específico para booking de cinema reutilizando as entidades e regras genéricas existentes (Service, Availability, Booking), adicionando apenas as funcionalidades específicas de cinema (salas, assentos) que serão habilitadas via ENABLE_CINEMA_MODULE.
todos:
  - id: feature-config
    content: Criar features.config.ts com feature flag ENABLE_CINEMA_MODULE
    status: completed
  - id: prisma-schema-cinema
    content: Adicionar models de cinema no schema.prisma (Room, Seat, BookingSeat) - reutilizando Service e Availability
    status: completed
    dependencies:
      - feature-config
  - id: domain-entities-cinema
    content: Criar entidades de domínio específicas de cinema (Room, Seat) e tipos auxiliares
    status: completed
    dependencies:
      - prisma-schema-cinema
  - id: prisma-repositories-cinema
    content: Criar repositórios Prisma para Room e Seat (reutiliza repositórios genéricos para Service/Availability/Booking)
    status: completed
    dependencies:
      - domain-entities-cinema
  - id: cinema-service
    content: Criar CinemaBookingService que reutiliza BookingService genérico e adiciona lógica de assentos específicos
    status: completed
    dependencies:
      - prisma-repositories-cinema
  - id: cinema-mappers
    content: Criar mappers/correlação entre entidades genéricas e cinema (Service→Movie, Availability→Showtime)
    status: completed
    dependencies:
      - domain-entities-cinema
  - id: http-schemas-cinema
    content: Criar schemas Zod para validação das rotas de cinema (reutilizando schemas genéricos onde possível)
    status: completed
    dependencies:
      - cinema-mappers
  - id: http-routes-cinema
    content: Criar rotas HTTP para cinema (CRUD salas, visualização assentos, reserva com assentos específicos)
    status: completed
    dependencies:
      - http-schemas-cinema
      - cinema-service
  - id: service-factory-cinema
    content: Atualizar service-factory para incluir serviços de cinema condicionalmente (reutilizando serviços genéricos)
    status: completed
    dependencies:
      - cinema-service
  - id: http-adapter-integration
    content: Integrar módulo de cinema no http.adapter.ts com registro condicional
    status: completed
    dependencies:
      - http-routes-cinema
      - service-factory-cinema
---

# Módulo de Cinema Modular com Reaproveitamento

Criar um módulo específico para booking de cinema que **reaproveita as entidades e regras genéricas existentes** (Service, Availability, Booking), adicionando apenas as funcionalidades específicas de cinema (salas e assentos).

## Mapeamento de Entidades Genéricas → Cinema

- **Service** → **Movie** (um filme é um serviço)
- Reutiliza toda a estrutura: name, description, basePrice, durationMinutes
- Campos específicos de cinema podem ser adicionados via metadados ou extensão futura
- **Availability** → **Showtime** (uma sessão é uma disponibilidade)
- Reutiliza: date, startTime, endTime, capacity
- Adiciona relação com **Room** (sala onde a sessão acontece)
- **Booking** → **CinemaBooking** (reutiliza booking genérico)
- Reutiliza: userId, establishmentId, serviceId, availabilityId, quantity, totalPrice, status
- Adiciona: relação com assentos específicos via **BookingSeat**
- **Novas Entidades** (específicas de cinema):
- **Room**: Salas do cinema (name, capacity, layout_config)
- **Seat**: Assentos (roomId, row, number, seatType, price)
- **BookingSeat**: Relação many-to-many entre Booking e Seat

## Arquitetura do Módulo

```javascript
src/
├── modules/
│   └── cinema/
│       ├── domain/
│       │   ├── entities/
│       │   │   ├── room.ts           # Sala (nome, capacidade, layout)
│       │   │   ├── seat.ts           # Assento (row, number, tipo, preço)
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── application/
│       │   ├── cinema-booking.service.ts  # Reutiliza BookingService + lógica de assentos
│       │   ├── mappers.ts                  # Correlação Service→Movie, Availability→Showtime
│       │   └── index.ts
│       ├── adapters/
│       │   ├── inbound/
│       │   │   └── http/
│       │   │       ├── routes/
│       │   │       │   ├── room.routes.ts        # CRUD de salas
│       │   │       │   ├── showtime.routes.ts    # Visualizar sessões e assentos disponíveis
│       │   │       │   └── cinema-booking.routes.ts  # Reservas com assentos específicos
│       │   │       └── schemas/
│       │   │           └── cinema.schemas.ts     # Schemas Zod específicos
│       │   └── outbound/
│       │       └── prisma/
│       │           ├── repositories/
│       │           │   ├── room.repository.ts
│       │           │   ├── seat.repository.ts
│       │           │   └── booking-seat.repository.ts
│       │           └── index.ts
│       └── index.ts
└── config/
    └── features.config.ts  # Feature flags (ENABLE_CINEMA_MODULE)
```



## Estrutura de Dados (Prisma Schema)

### Novas Tabelas (adicionar ao schema.prisma)

```prisma
model Room {
  id          String   @id @default(uuid())
  establishmentId String @map("establishment_id")
  name        String
  capacity    Int
  layoutConfig Json?   @map("layout_config")  // Configuração do layout (rows, columns, etc.)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  establishment Establishment @relation(fields: [establishmentId], references: [id], onDelete: Cascade)
  seats         Seat[]
  availabilities Availability[]  // Relação com Availability (showtimes)

  @@index([establishmentId])
  @@map("rooms")
}

model Seat {
  id        String   @id @default(uuid())
  roomId    String   @map("room_id")
  row       String   // Ex: "A", "B", "C"
  number    Int      // Número do assento na fileira
  seatType  String   @map("seat_type") @default("STANDARD")  // STANDARD, VIP, DISABLED
  price     Decimal? @db.Decimal(10, 2)  // Preço específico do assento (opcional, usa service.basePrice se null)
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  room          Room          @relation(fields: [roomId], references: [id], onDelete: Cascade)
  bookingSeats  BookingSeat[]

  @@unique([roomId, row, number])
  @@index([roomId])
  @@map("seats")
}

model BookingSeat {
  bookingId String @map("booking_id")
  seatId    String @map("seat_id")

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  seat    Seat    @relation(fields: [seatId], references: [id])

  @@id([bookingId, seatId])
  @@map("booking_seats")
}
```



### Modificações nas Tabelas Existentes

- **Availability**: Adicionar campo opcional `roomId` (nullable, apenas para showtimes de cinema)
- **Booking**: Reutilizar estrutura existente (sem mudanças)

## Reaproveitamento de Serviços

### CinemaBookingService

O `CinemaBookingService` irá:

1. **Reutilizar BookingService genérico** para operações básicas (validações, cálculos, transações)
2. **Adicionar lógica específica de assentos**:

- Validar que assentos pertencem à sala da sessão (availability.roomId)
- Verificar disponibilidade de assentos específicos
- Criar relações BookingSeat ao criar booking
- Remover relações BookingSeat ao cancelar booking
- Calcular preço baseado em assentos (se tiverem preço específico)

### Estrutura do Serviço

```typescript
export class CinemaBookingService {
  constructor(
    private readonly bookingService: BookingService,  // Reutiliza serviço genérico
    private readonly seatRepository: SeatRepositoryPort,
    private readonly bookingSeatRepository: BookingSeatRepositoryPort,
    private readonly roomRepository: RoomRepositoryPort
  ) {}

  async createWithSeats(input: CreateCinemaBookingInput, userId: string) {
    // 1. Validar assentos pertencem à sala da sessão
    // 2. Verificar disponibilidade dos assentos
    // 3. Calcular preço considerando assentos específicos
    // 4. Chamar bookingService.create() com quantidade = número de assentos
    // 5. Criar relações BookingSeat
  }
}
```



## Configuração

1. **Feature Flag**: Criar `src/config/features.config.ts` com validação Zod para `ENABLE_CINEMA_MODULE`
2. **Registro Condicional**: No `http.adapter.ts`, registrar rotas do cinema apenas se a feature flag estiver ativa
3. **Service Factory**: Adicionar factories condicionais, reutilizando serviços genéricos existentes

## Implementação

### 1. Configuração de Feature Flag

- Criar `features.config.ts` que lê `ENABLE_CINEMA_MODULE` (boolean)
- Exportar `isCinemaModuleEnabled`

### 2. Domain Layer

- Criar apenas entidades específicas: `Room`, `Seat`
- Tipos auxiliares para mapeamento Service→Movie, Availability→Showtime

### 3. Application Layer

- **CinemaBookingService**: Wrapper que reutiliza `BookingService` + lógica de assentos
- **Mappers**: Funções auxiliares para correlacionar entidades genéricas com cinema

### 4. Adapters Layer

**Outbound (Prisma)**:

- Repositórios apenas para entidades novas: `RoomRepository`, `SeatRepository`, `BookingSeatRepository`
- Reutiliza repositórios genéricos: `ServiceRepository`, `AvailabilityRepository`, `BookingRepository`

**Inbound (HTTP)**:

- Rotas REST específicas para:
- CRUD de salas (`/v1/cinema/rooms`)
- Visualização de assentos disponíveis por sessão (`/v1/cinema/showtimes/:id/seats`)
- Criar reserva com assentos específicos (`/v1/cinema/bookings`)
- Cancelar reserva (reutiliza endpoint genérico ou estende)
- Schemas Zod específicos para validação de assentos

### 5. Integração no App

- Modificar `http.adapter.ts` para registrar rotas de cinema condicionalmente
- Adicionar tag "Cinema" no Swagger quando habilitado
- Atualizar `service-factory.ts` para incluir serviços de cinema condicionalmente, passando serviços genéricos como dependências

## Principais Diferenças/Extensões do Sistema Genérico