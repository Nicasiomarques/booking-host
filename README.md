# Booking Service API

A booking management API for establishments built with Fastify, Prisma, and TypeScript.

## Features

- **Authentication**: JWT-based auth with access/refresh token pattern
- **Establishments**: Create and manage business establishments
- **Services**: Define services with pricing and duration
- **Extra Items**: Add-ons for services (aromatherapy, hot stones, etc.)
- **Availabilities**: Manage time slots with capacity
- **Bookings**: Full booking flow with capacity management and cancellation
- **Rate Limiting**: Brute force protection on auth endpoints
- **API Documentation**: OpenAPI/Swagger UI at `/docs`

## Tech Stack

- **Runtime**: Node.js 22+
- **Framework**: Fastify 5
- **Database**: PostgreSQL with Prisma 7
- **Authentication**: JWT (jsonwebtoken) + Argon2
- **Validation**: Zod
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL 15+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd booking-service

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials and JWT secrets
```

### Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Open Prisma Studio
npm run db:studio
```

### Running the Server

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

The server will start at `http://localhost:3000`.

## API Documentation

Interactive API documentation is available at:

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/docs/json

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_ACCESS_SECRET` | Access token secret (min 32 chars) | - |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 32 chars) | - |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `JWT_ISSUER` | JWT issuer claim | `booking-service` |
| `JWT_AUDIENCE` | JWT audience claim | `booking-api` |

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/register` | Register new user |
| POST | `/v1/auth/login` | Login user |
| POST | `/v1/auth/refresh` | Refresh access token |
| POST | `/v1/auth/logout` | Logout user |

### Establishments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/establishments` | Create establishment (auth required) |
| GET | `/v1/establishments/:id` | Get establishment by ID |
| PUT | `/v1/establishments/:id` | Update establishment (owner only) |
| GET | `/v1/establishments/my` | Get user's establishments (auth required) |

### Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/establishments/:id/services` | Create service (owner only) |
| GET | `/v1/establishments/:id/services` | List services |
| GET | `/v1/services/:id` | Get service by ID |
| PUT | `/v1/services/:id` | Update service (owner only) |
| DELETE | `/v1/services/:id` | Delete service (owner only) |

### Extra Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/services/:id/extras` | Create extra item (owner only) |
| GET | `/v1/services/:id/extras` | List extra items |
| PUT | `/v1/extras/:id` | Update extra item (owner only) |
| DELETE | `/v1/extras/:id` | Delete extra item (owner only) |

### Availabilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/services/:id/availabilities` | Create availability (owner only) |
| GET | `/v1/services/:id/availabilities` | List availabilities |
| PUT | `/v1/availabilities/:id` | Update availability (owner only) |
| DELETE | `/v1/availabilities/:id` | Delete availability (owner only) |

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/bookings` | Create booking (auth required) |
| GET | `/v1/bookings/:id` | Get booking by ID (owner/staff) |
| GET | `/v1/bookings/my` | Get user's bookings (auth required) |
| GET | `/v1/establishments/:id/bookings` | Get establishment bookings (staff only) |
| PUT | `/v1/bookings/:id/cancel` | Cancel booking (owner/staff) |

## Testing

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in watch mode
npm test
```

## Project Structure

```
src/
├── adapters/
│   ├── inbound/http/       # HTTP routes, middleware, schemas
│   └── outbound/
│       ├── prisma/         # Database repositories
│       └── token/          # JWT adapter
├── application/            # Business logic services
├── config/                 # Configuration modules
└── domain/                 # Domain errors
```

## License

ISC
