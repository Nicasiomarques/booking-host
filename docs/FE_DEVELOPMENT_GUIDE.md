# Frontend Development Guide - Booking Service Backoffice

This guide documents best practices, patterns, and anti-patterns for the Booking Service Backoffice development.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Project Structure](#2-project-structure)
3. [SolidJS](#3-solidjs)
4. [Routing (solid-router)](#4-routing-solid-router)
5. [State Management](#5-state-management)
6. [API Integration](#6-api-integration)
7. [Forms & Validation](#7-forms--validation)
8. [Styling (TailwindCSS + DaisyUI)](#8-styling-tailwindcss--daisyui)
9. [Authentication](#9-authentication)
10. [E2E Testing (Playwright)](#10-e2e-testing-playwright)
11. [Common Patterns](#11-common-patterns)
12. [Anti-Patterns to Avoid](#12-anti-patterns-to-avoid)

---

## 1. Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| SolidJS | 1.9.x | Reactive UI framework |
| solid-router | 0.15.x | Client-side routing |
| TypeScript | 5.x | Static typing |
| Vite | 7.x | Build tool & dev server |
| TailwindCSS | 4.x | Utility-first CSS |
| DaisyUI | 5.x | Component library for TailwindCSS |
| Kobalte | 0.13.x | Accessible UI primitives |
| Zod | 4.x | Schema validation |
| @tanstack/solid-query | 5.x | Server state management |
| Playwright | 1.57.x | E2E testing framework |

### Installation

```bash
# Create project from template
npx degit solidjs/templates/vanilla/with-tailwindcss backoffice
cd backoffice

# Core dependencies
npm install @solidjs/router
npm install @tanstack/solid-query
npm install @kobalte/core
npm install zod
npm install daisyui

# Dev dependencies
npm install -D typescript @types/node
npm install -D tailwindcss postcss autoprefixer

# E2E Testing
npm install -D @playwright/test
npx playwright install chromium
```

---

## 2. Project Structure

```
backoffice/
├── public/
│   └── favicon.ico
│
├── src/
│   ├── assets/                    # Static assets (images, fonts)
│   │
│   ├── components/                # Reusable UI components
│   │   ├── ui/                    # Base UI components (Button, Input, Modal)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Card.tsx
│   │   │   └── index.ts
│   │   ├── layout/                # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   └── index.ts
│   │   └── shared/                # Shared domain components
│   │       ├── BookingCard.tsx
│   │       ├── ServiceCard.tsx
│   │       └── index.ts
│   │
│   ├── features/                  # Feature modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   └── index.ts
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── StatsCard.tsx
│   │   │   │   └── RecentBookings.tsx
│   │   │   └── index.ts
│   │   ├── establishments/
│   │   │   ├── components/
│   │   │   │   ├── EstablishmentForm.tsx
│   │   │   │   └── EstablishmentList.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useEstablishments.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── components/
│   │   │   │   ├── ServiceForm.tsx
│   │   │   │   └── ServiceList.tsx
│   │   │   └── index.ts
│   │   ├── availability/
│   │   │   ├── components/
│   │   │   │   ├── CalendarView.tsx
│   │   │   │   └── AvailabilityForm.tsx
│   │   │   └── index.ts
│   │   └── bookings/
│   │       ├── components/
│   │       │   ├── BookingList.tsx
│   │       │   └── BookingDetails.tsx
│   │       └── index.ts
│   │
│   ├── hooks/                     # Global hooks
│   │   ├── useApi.ts
│   │   ├── useToast.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── lib/                       # Utilities and helpers
│   │   ├── api.ts                 # API client (fetch wrapper)
│   │   ├── utils.ts               # General utilities
│   │   ├── constants.ts           # App constants
│   │   └── validators.ts          # Zod schemas
│   │
│   ├── stores/                    # Global state (signals/stores)
│   │   ├── auth.store.ts
│   │   ├── ui.store.ts
│   │   └── index.ts
│   │
│   ├── pages/                     # Route pages
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Establishments.tsx
│   │   ├── EstablishmentDetails.tsx
│   │   ├── Services.tsx
│   │   ├── Availability.tsx
│   │   ├── Bookings.tsx
│   │   └── NotFound.tsx
│   │
│   ├── routes.tsx                 # Route definitions
│   ├── App.tsx                    # Root component
│   ├── index.tsx                  # Entry point
│   └── index.css                  # Global styles + Tailwind
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

### Layer Responsibilities

| Layer | Purpose |
|-------|---------|
| **components/ui** | Reusable, stateless UI primitives |
| **components/layout** | Page layout structure |
| **features** | Feature-specific components, hooks, services |
| **hooks** | Reusable logic across features |
| **lib** | Utilities, API client, validators |
| **stores** | Global application state |
| **pages** | Route entry points (compose features) |

---

## 3. SolidJS

### 3.1 Component Patterns

```tsx
// src/components/ui/Button.tsx
import { JSX, splitProps, Component } from 'solid-js'

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button: Component<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, ['variant', 'size', 'loading', 'children', 'class'])

  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
  }

  const sizes = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  }

  return (
    <button
      class={`btn ${variants[local.variant ?? 'primary']} ${sizes[local.size ?? 'md']} ${local.class ?? ''}`}
      disabled={local.loading || rest.disabled}
      {...rest}
    >
      {local.loading && <span class="loading loading-spinner loading-sm" />}
      {local.children}
    </button>
  )
}
```

### 3.2 Reactivity Best Practices

#### DO

```tsx
import { createSignal, createEffect, createMemo, Show, For } from 'solid-js'

// Use signals for reactive state
const [count, setCount] = createSignal(0)

// Use createMemo for derived state
const doubled = createMemo(() => count() * 2)

// Use createEffect for side effects
createEffect(() => {
  console.log('Count changed:', count())
})

// Use Show for conditional rendering
<Show when={user()} fallback={<LoginForm />}>
  {(user) => <Dashboard user={user()} />}
</Show>

// Use For for lists (keyed by default)
<For each={items()}>
  {(item, index) => <div>{item.name} - {index()}</div>}
</For>

// Access signal values in JSX by calling them
<div>{count()}</div>
```

#### DON'T

```tsx
// Don't destructure props (loses reactivity)
const MyComponent = ({ name, value }) => { // BAD
  return <div>{name}</div>
}

// Do this instead
const MyComponent = (props) => {
  return <div>{props.name}</div>
}

// Don't access signals outside reactive context
const value = count() // BAD - won't update
const handler = () => {
  const current = count() // OK - inside function
}

// Don't mutate arrays/objects directly
setItems([...items(), newItem]) // Good
items().push(newItem) // BAD - no reactivity
```

### 3.3 Component Organization

```tsx
// Feature component with hooks
// src/features/bookings/components/BookingList.tsx
import { Component, For, Show } from 'solid-js'
import { useBookings } from '../hooks/useBookings'
import { BookingCard } from '@/components/shared'
import { Spinner } from '@/components/ui'

interface BookingListProps {
  establishmentId: string
}

export const BookingList: Component<BookingListProps> = (props) => {
  const { bookings, isLoading, error } = useBookings(() => props.establishmentId)

  return (
    <div class="space-y-4">
      <Show when={isLoading()}>
        <Spinner />
      </Show>

      <Show when={error()}>
        <div class="alert alert-error">{error()?.message}</div>
      </Show>

      <Show when={bookings()?.length === 0}>
        <div class="text-center text-base-content/60">
          No bookings found
        </div>
      </Show>

      <For each={bookings()}>
        {(booking) => <BookingCard booking={booking} />}
      </For>
    </div>
  )
}
```

---

## 4. Routing (solid-router)

### 4.1 Route Configuration

```tsx
// src/routes.tsx
import { lazy } from 'solid-js'
import { RouteDefinition } from '@solidjs/router'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Establishments = lazy(() => import('./pages/Establishments'))
const EstablishmentDetails = lazy(() => import('./pages/EstablishmentDetails'))
const Services = lazy(() => import('./pages/Services'))
const Availability = lazy(() => import('./pages/Availability'))
const Bookings = lazy(() => import('./pages/Bookings'))
const NotFound = lazy(() => import('./pages/NotFound'))

export const routes: RouteDefinition[] = [
  {
    path: '/login',
    component: Login,
  },
  {
    path: '/',
    component: lazy(() => import('./components/layout/MainLayout')),
    children: [
      { path: '/', component: Dashboard },
      { path: '/establishments', component: Establishments },
      { path: '/establishments/:id', component: EstablishmentDetails },
      { path: '/establishments/:id/services', component: Services },
      { path: '/establishments/:id/services/:serviceId/availability', component: Availability },
      { path: '/establishments/:id/bookings', component: Bookings },
    ],
  },
  { path: '*', component: NotFound },
]
```

### 4.2 App Entry

```tsx
// src/App.tsx
import { Router, useRoutes } from '@solidjs/router'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { routes } from './routes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

export default function App() {
  const Routes = useRoutes(routes)

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes />
      </Router>
    </QueryClientProvider>
  )
}
```

### 4.3 Navigation & Params

```tsx
import { useNavigate, useParams, useSearchParams, A } from '@solidjs/router'

// Navigation
const navigate = useNavigate()
navigate('/establishments')
navigate('/establishments/123', { replace: true })

// Route params
const params = useParams<{ id: string; serviceId?: string }>()
console.log(params.id) // Reactive access

// Query params
const [searchParams, setSearchParams] = useSearchParams()
setSearchParams({ page: '2', status: 'confirmed' })

// Links
<A href="/establishments" class="link">Establishments</A>
<A href={`/establishments/${id}`} activeClass="font-bold">Details</A>
```

### 4.4 Protected Routes

```tsx
// src/components/layout/MainLayout.tsx
import { Component, Show, createEffect } from 'solid-js'
import { Outlet, useNavigate } from '@solidjs/router'
import { useAuth } from '@/features/auth'
import { Sidebar, Header } from '@/components/layout'

export const MainLayout: Component = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  createEffect(() => {
    if (!isLoading() && !isAuthenticated()) {
      navigate('/login', { replace: true })
    }
  })

  return (
    <Show when={isAuthenticated()} fallback={<div class="loading" />}>
      <div class="flex h-screen">
        <Sidebar />
        <div class="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main class="flex-1 overflow-y-auto p-6 bg-base-200">
            <Outlet />
          </main>
        </div>
      </div>
    </Show>
  )
}

export default MainLayout
```

---

## 5. State Management

### 5.1 Local State (Signals)

```tsx
import { createSignal } from 'solid-js'

// Simple state
const [isOpen, setIsOpen] = createSignal(false)

// With initial value from props
const [value, setValue] = createSignal(props.initialValue)

// Toggle pattern
const toggle = () => setIsOpen(prev => !prev)
```

### 5.2 Global State (Stores)

```tsx
// src/stores/auth.store.ts
import { createSignal, createRoot } from 'solid-js'

interface User {
  id: string
  email: string
  name: string
  establishmentRoles: Array<{
    establishmentId: string
    role: 'OWNER' | 'STAFF'
  }>
}

function createAuthStore() {
  const [user, setUser] = createSignal<User | null>(null)
  const [accessToken, setAccessToken] = createSignal<string | null>(null)

  const isAuthenticated = () => !!accessToken()

  const login = (userData: User, token: string) => {
    setUser(userData)
    setAccessToken(token)
    localStorage.setItem('accessToken', token)
  }

  const logout = () => {
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem('accessToken')
  }

  const hasRole = (establishmentId: string, role: 'OWNER' | 'STAFF') => {
    return user()?.establishmentRoles.some(
      r => r.establishmentId === establishmentId && r.role === role
    ) ?? false
  }

  // Initialize from localStorage
  const storedToken = localStorage.getItem('accessToken')
  if (storedToken) {
    setAccessToken(storedToken)
  }

  return {
    user,
    accessToken,
    isAuthenticated,
    login,
    logout,
    hasRole,
  }
}

export const authStore = createRoot(createAuthStore)
```

### 5.3 Server State (TanStack Query)

```tsx
// src/features/establishments/hooks/useEstablishments.ts
import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { establishmentService } from '../services/establishment.service'

export function useEstablishments() {
  return createQuery(() => ({
    queryKey: ['establishments', 'my'],
    queryFn: () => establishmentService.getMyEstablishments(),
  }))
}

export function useEstablishment(id: () => string) {
  return createQuery(() => ({
    queryKey: ['establishments', id()],
    queryFn: () => establishmentService.getById(id()),
    enabled: !!id(),
  }))
}

export function useCreateEstablishment() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: establishmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishments'] })
    },
  }))
}

export function useUpdateEstablishment() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({ id, data }: { id: string; data: UpdateEstablishmentInput }) =>
      establishmentService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['establishments', id] })
      queryClient.invalidateQueries({ queryKey: ['establishments', 'my'] })
    },
  }))
}
```

---

## 6. API Integration

### 6.1 API Client

```tsx
// src/lib/api.ts
import { authStore } from '@/stores/auth.store'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options

  // Build URL with query params
  const url = new URL(`${API_BASE_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  // Add auth header
  const token = authStore.accessToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...init.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers,
    credentials: 'include', // For cookies (refresh token)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))

    // Handle 401 - refresh token or logout
    if (response.status === 401) {
      const refreshed = await refreshToken()
      if (refreshed) {
        // Retry original request
        return request(endpoint, options)
      }
      authStore.logout()
      window.location.href = '/login'
    }

    throw new ApiError(
      response.status,
      error.error?.code || 'UNKNOWN_ERROR',
      error.error?.message || 'An error occurred'
    )
  }

  return response.json()
}

async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (response.ok) {
      const data = await response.json()
      authStore.login(authStore.user()!, data.accessToken)
      return true
    }
  } catch {
    // Refresh failed
  }
  return false
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
}

export { ApiError }
```

### 6.2 Service Layer

```tsx
// src/features/establishments/services/establishment.service.ts
import { api } from '@/lib/api'

interface Establishment {
  id: string
  name: string
  description: string
  address: string
  timezone: string
  createdAt: string
}

interface CreateEstablishmentInput {
  name: string
  description?: string
  address: string
  timezone: string
}

interface UpdateEstablishmentInput {
  name?: string
  description?: string
  address?: string
  timezone?: string
}

export const establishmentService = {
  getMyEstablishments: () =>
    api.get<Establishment[]>('/v1/establishments/my'),

  getById: (id: string) =>
    api.get<Establishment>(`/v1/establishments/${id}`),

  create: (data: CreateEstablishmentInput) =>
    api.post<Establishment>('/v1/establishments', data),

  update: (id: string, data: UpdateEstablishmentInput) =>
    api.put<Establishment>(`/v1/establishments/${id}`, data),
}
```

---

## 7. Forms & Validation

### 7.1 Form Patterns

```tsx
// src/features/establishments/components/EstablishmentForm.tsx
import { Component, createSignal, Show } from 'solid-js'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'

const establishmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  address: z.string().min(5, 'Address is required'),
  timezone: z.string().min(1, 'Timezone is required'),
})

type EstablishmentFormData = z.infer<typeof establishmentSchema>

interface EstablishmentFormProps {
  initialData?: Partial<EstablishmentFormData>
  onSubmit: (data: EstablishmentFormData) => Promise<void>
  isLoading?: boolean
}

export const EstablishmentForm: Component<EstablishmentFormProps> = (props) => {
  const [errors, setErrors] = createSignal<Record<string, string>>({})
  const [formData, setFormData] = createSignal<Partial<EstablishmentFormData>>(
    props.initialData ?? {}
  )

  const updateField = (field: keyof EstablishmentFormData) => (
    e: Event & { currentTarget: HTMLInputElement | HTMLTextAreaElement }
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.currentTarget.value }))
    // Clear error on change
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    const result = establishmentSchema.safeParse(formData())

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    await props.onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Name *</span>
        </label>
        <Input
          type="text"
          value={formData().name ?? ''}
          onInput={updateField('name')}
          class={errors().name ? 'input-error' : ''}
          placeholder="My Establishment"
        />
        <Show when={errors().name}>
          <label class="label">
            <span class="label-text-alt text-error">{errors().name}</span>
          </label>
        </Show>
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text">Description</span>
        </label>
        <textarea
          class="textarea textarea-bordered"
          value={formData().description ?? ''}
          onInput={updateField('description')}
          placeholder="A brief description..."
          rows={3}
        />
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text">Address *</span>
        </label>
        <Input
          type="text"
          value={formData().address ?? ''}
          onInput={updateField('address')}
          class={errors().address ? 'input-error' : ''}
          placeholder="123 Main St, City"
        />
        <Show when={errors().address}>
          <label class="label">
            <span class="label-text-alt text-error">{errors().address}</span>
          </label>
        </Show>
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text">Timezone *</span>
        </label>
        <select
          class={`select select-bordered w-full ${errors().timezone ? 'select-error' : ''}`}
          value={formData().timezone ?? ''}
          onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.currentTarget.value }))}
        >
          <option value="">Select timezone</option>
          <option value="Europe/Lisbon">Europe/Lisbon</option>
          <option value="Europe/London">Europe/London</option>
          <option value="America/New_York">America/New_York</option>
          <option value="America/Los_Angeles">America/Los_Angeles</option>
        </select>
        <Show when={errors().timezone}>
          <label class="label">
            <span class="label-text-alt text-error">{errors().timezone}</span>
          </label>
        </Show>
      </div>

      <div class="flex justify-end gap-2">
        <Button type="submit" loading={props.isLoading}>
          Save
        </Button>
      </div>
    </form>
  )
}
```

---

## 8. Styling (TailwindCSS + DaisyUI)

### 8.1 Configuration

```js
// tailwind.config.js
import daisyui from 'daisyui'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: ['light', 'dark', 'corporate'],
    darkTheme: 'dark',
  },
}
```

### 8.2 Component Styling Patterns

```tsx
// Use DaisyUI classes for consistent UI
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary btn-outline">Secondary</button>
<button class="btn btn-ghost btn-sm">Small Ghost</button>

// Cards
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Title</h2>
    <p>Content</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary">Action</button>
    </div>
  </div>
</div>

// Tables
<div class="overflow-x-auto">
  <table class="table table-zebra">
    <thead>
      <tr>
        <th>Name</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <For each={items()}>
        {(item) => (
          <tr>
            <td>{item.name}</td>
            <td><span class="badge badge-success">{item.status}</span></td>
            <td><button class="btn btn-ghost btn-xs">Edit</button></td>
          </tr>
        )}
      </For>
    </tbody>
  </table>
</div>

// Alerts
<div class="alert alert-success">
  <span>Operation completed successfully!</span>
</div>

// Loading states
<span class="loading loading-spinner loading-lg" />
<div class="skeleton h-32 w-full" />
```

### 8.3 Theme Switching

```tsx
// src/stores/ui.store.ts
import { createSignal, createRoot, createEffect } from 'solid-js'

function createUiStore() {
  const [theme, setTheme] = createSignal<'light' | 'dark' | 'corporate'>(
    (localStorage.getItem('theme') as 'light' | 'dark' | 'corporate') || 'light'
  )

  createEffect(() => {
    document.documentElement.setAttribute('data-theme', theme())
    localStorage.setItem('theme', theme())
  })

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return { theme, setTheme, toggleTheme }
}

export const uiStore = createRoot(createUiStore)
```

---

## 9. Authentication

### 9.1 Auth Hook

```tsx
// src/features/auth/hooks/useAuth.ts
import { createSignal, createEffect } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { authStore } from '@/stores/auth.store'
import { authService } from '../services/auth.service'

export function useAuth() {
  const [isLoading, setIsLoading] = createSignal(true)
  const navigate = useNavigate()

  // Check auth on mount
  createEffect(async () => {
    const token = authStore.accessToken()
    if (token) {
      try {
        const user = await authService.me()
        authStore.login(user, token)
      } catch {
        authStore.logout()
      }
    }
    setIsLoading(false)
  })

  const login = async (email: string, password: string) => {
    const { accessToken, user } = await authService.login(email, password)
    authStore.login(user, accessToken)
    navigate('/', { replace: true })
  }

  const logout = async () => {
    await authService.logout()
    authStore.logout()
    navigate('/login', { replace: true })
  }

  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole: authStore.hasRole,
  }
}
```

### 9.2 Login Page

```tsx
// src/pages/Login.tsx
import { Component, createSignal, Show } from 'solid-js'
import { useAuth } from '@/features/auth'
import { Button, Input } from '@/components/ui'

const Login: Component = () => {
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(false)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email(), password())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div class="min-h-screen flex items-center justify-center bg-base-200">
      <div class="card w-96 bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title justify-center text-2xl mb-4">
            Booking Backoffice
          </h2>

          <Show when={error()}>
            <div class="alert alert-error mb-4">
              <span>{error()}</span>
            </div>
          </Show>

          <form onSubmit={handleSubmit} class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Email</span>
              </label>
              <Input
                type="email"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                placeholder="email@example.com"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Password</span>
              </label>
              <Input
                type="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                placeholder="********"
                required
              />
            </div>

            <Button type="submit" class="w-full" loading={isLoading()}>
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
```

---

## 10. E2E Testing (Playwright)

### 10.1 Setup & Configuration

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install chromium
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 10.2 Test Organization

```
e2e/
├── fixtures/              # Reusable test fixtures
│   ├── auth.fixture.ts    # Login/logout helpers
│   └── api.fixture.ts     # API mocking utilities
├── auth/                  # Auth-related tests
│   └── login.spec.ts
├── establishments/        # Feature tests
│   └── establishments.spec.ts
├── services/
│   └── services.spec.ts
└── bookings/
    └── bookings.spec.ts
```

### 10.3 Best Practices

#### Test User-Visible Behavior
Focus on what users see and interact with, not implementation details.

```ts
// GOOD - Tests user behavior
test('user can login with valid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('user@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByText('Dashboard')).toBeVisible()
})

// BAD - Tests implementation details
test('login sets token in localStorage', async ({ page }) => {
  // Don't test internal state directly
})
```

#### Use Role-Based Locators (Recommended)
Prioritize accessibility-focused locators that mirror how users interact.

```ts
// BEST - Role-based locators
await page.getByRole('button', { name: 'Submit' }).click()
await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com')
await page.getByRole('link', { name: 'Dashboard' }).click()

// GOOD - Label-based
await page.getByLabel('Email').fill('test@example.com')
await page.getByPlaceholder('Enter your email').fill('test@example.com')
await page.getByText('Welcome').isVisible()

// ACCEPTABLE - Test IDs (when no semantic option exists)
await page.getByTestId('submit-button').click()

// AVOID - CSS selectors (fragile, break on refactoring)
await page.locator('.btn-primary').click()
await page.locator('#submit').click()
```

#### Test Isolation
Each test must be independent and not rely on previous test state.

```ts
// GOOD - Each test sets up its own state
test.describe('Bookings', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state for each test
    await page.route('**/v1/auth/me', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ id: '1', email: 'test@example.com' })
      })
    })
  })

  test('shows booking list', async ({ page }) => {
    // Each test starts fresh
  })
})
```

#### API Mocking for Reliable Tests
Use Playwright's route API to mock backend responses.

```ts
test('handles login error gracefully', async ({ page }) => {
  // Mock failed login
  await page.route('**/v1/auth/login', async route => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      })
    })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('wrong@example.com')
  await page.getByLabel('Password').fill('wrongpassword')
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page.getByRole('alert')).toContainText('Invalid email or password')
})
```

#### Use Web-First Assertions
Playwright's assertions auto-wait for conditions, reducing flaky tests.

```ts
// GOOD - Auto-waits for element
await expect(page.getByText('Success')).toBeVisible()
await expect(page.getByRole('button')).toBeEnabled()
await expect(page).toHaveURL('/dashboard')

// BAD - Manual waits
await page.waitForTimeout(1000) // Avoid fixed delays
await page.waitForSelector('.success') // Prefer expect assertions
```

### 10.4 Common Patterns

#### Authentication Fixture

```ts
// e2e/fixtures/auth.fixture.ts
import { test as base, Page } from '@playwright/test'

type AuthFixtures = {
  authenticatedPage: Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Mock successful auth
    await page.route('**/v1/auth/me', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          establishmentRoles: [{ establishmentId: 'est-1', role: 'OWNER' }]
        })
      })
    })

    // Set auth token
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })

    await use(page)
  }
})

// Usage in tests
test('dashboard shows user name', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/')
  await expect(authenticatedPage.getByText('Test User')).toBeVisible()
})
```

#### Testing Loading States

```ts
test('shows loading spinner during API call', async ({ page }) => {
  // Mock slow API
  await page.route('**/v1/establishments', async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.fulfill({
      status: 200,
      body: JSON.stringify([])
    })
  })

  await page.goto('/establishments')

  // Check loading state appears
  await expect(page.getByRole('progressbar')).toBeVisible()

  // Check loading state disappears
  await expect(page.getByRole('progressbar')).not.toBeVisible()
})
```

#### Testing Form Validation

```ts
test('validates required fields', async ({ page }) => {
  await page.goto('/establishments/new')

  // Submit empty form
  await page.getByRole('button', { name: 'Save' }).click()

  // Check validation errors
  await expect(page.getByText('Name is required')).toBeVisible()
  await expect(page.getByText('Address is required')).toBeVisible()

  // Fill required fields
  await page.getByLabel('Name').fill('My Establishment')
  await expect(page.getByText('Name is required')).not.toBeVisible()
})
```

### 10.5 Running Tests

```bash
# Run all tests
npm run test:e2e

# Run with UI mode (debugging)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/auth/login.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Generate test code by recording
npx playwright codegen localhost:5173
```

### 10.6 CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: cd backoffice && npm ci
      - name: Install Playwright
        run: cd backoffice && npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: cd backoffice && npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: backoffice/playwright-report/
```

### 10.7 Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Fixed `waitForTimeout` | Flaky, slow tests | Use web-first assertions |
| Testing third-party sites | Unreliable, slow | Mock external dependencies |
| Sharing state between tests | Test interdependence | Isolate each test |
| CSS/XPath selectors | Break on refactoring | Use role-based locators |
| Testing implementation details | Brittle tests | Test user behavior |
| Not mocking APIs | Slow, unreliable | Mock backend responses |
| Large monolithic tests | Hard to debug | Split into focused tests |

---

## 11. Common Patterns

### 11.1 List with Pagination

```tsx
// src/features/bookings/components/BookingList.tsx
import { Component, createSignal, For, Show } from 'solid-js'
import { createQuery } from '@tanstack/solid-query'
import { bookingService } from '../services/booking.service'

interface BookingListProps {
  establishmentId: string
}

export const BookingList: Component<BookingListProps> = (props) => {
  const [page, setPage] = createSignal(1)
  const [status, setStatus] = createSignal<string>()

  const query = createQuery(() => ({
    queryKey: ['bookings', props.establishmentId, page(), status()],
    queryFn: () => bookingService.getByEstablishment(props.establishmentId, {
      page: page(),
      limit: 10,
      status: status(),
    }),
  }))

  return (
    <div class="space-y-4">
      {/* Filters */}
      <div class="flex gap-2">
        <select
          class="select select-bordered"
          value={status() ?? ''}
          onChange={(e) => setStatus(e.currentTarget.value || undefined)}
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Loading */}
      <Show when={query.isLoading}>
        <div class="flex justify-center p-8">
          <span class="loading loading-spinner loading-lg" />
        </div>
      </Show>

      {/* Data */}
      <Show when={query.data}>
        {(data) => (
          <>
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Service</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={data().data}>
                    {(booking) => (
                      <tr>
                        <td>{booking.id.slice(0, 8)}</td>
                        <td>{booking.service.name}</td>
                        <td>{new Date(booking.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span class={`badge ${
                            booking.status === 'CONFIRMED' ? 'badge-success' :
                            booking.status === 'CANCELLED' ? 'badge-error' :
                            'badge-warning'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td>{booking.totalPrice}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div class="flex justify-center gap-2">
              <button
                class="btn btn-sm"
                disabled={page() === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span class="btn btn-sm btn-ghost">
                Page {page()} of {Math.ceil(data().total / data().limit)}
              </span>
              <button
                class="btn btn-sm"
                disabled={page() >= Math.ceil(data().total / data().limit)}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </Show>
    </div>
  )
}
```

### 11.2 Modal Dialog

```tsx
// src/components/ui/Modal.tsx
import { Component, JSX, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: JSX.Element
}

export const Modal: Component<ModalProps> = (props) => {
  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class="modal modal-open">
          <div class="modal-box">
            <button
              class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={props.onClose}
            >
              ✕
            </button>
            <h3 class="font-bold text-lg mb-4">{props.title}</h3>
            {props.children}
          </div>
          <div class="modal-backdrop" onClick={props.onClose} />
        </div>
      </Portal>
    </Show>
  )
}
```

### 11.3 Toast Notifications

```tsx
// src/hooks/useToast.ts
import { createSignal } from 'solid-js'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

const [toasts, setToasts] = createSignal<Toast[]>([])
let nextId = 0

export function useToast() {
  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  return {
    toasts,
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    warning: (msg: string) => addToast(msg, 'warning'),
    info: (msg: string) => addToast(msg, 'info'),
  }
}

// src/components/ui/ToastContainer.tsx
import { Component, For } from 'solid-js'
import { useToast } from '@/hooks/useToast'

export const ToastContainer: Component = () => {
  const { toasts } = useToast()

  const typeClasses = {
    success: 'alert-success',
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info',
  }

  return (
    <div class="toast toast-end">
      <For each={toasts()}>
        {(toast) => (
          <div class={`alert ${typeClasses[toast.type]}`}>
            <span>{toast.message}</span>
          </div>
        )}
      </For>
    </div>
  )
}
```

---

## 12. Anti-Patterns to Avoid

### 12.1 Reactivity Issues

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Destructuring props | Loses reactivity | Use `props.name` directly |
| Accessing signals outside reactive context | Value won't update | Access in JSX or createEffect |
| Mutating arrays/objects | No reactivity trigger | Create new references with spread |
| Using index as key in For | Incorrect updates | Use unique IDs |

### 12.2 Performance Issues

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Creating signals in render | Memory leaks | Use createSignal at component level |
| Not using lazy loading | Large initial bundle | Use `lazy()` for route components |
| Fetching without caching | Unnecessary requests | Use TanStack Query |
| Large component trees | Slow re-renders | Split into smaller components |

### 12.3 Security Issues

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Storing tokens in localStorage | XSS vulnerable | Use httpOnly cookies for refresh token |
| Not validating inputs | Invalid data | Use Zod schemas |
| Trusting client-side checks | Bypassable | Validate on server |
| Exposing sensitive data in URLs | Logged/cached | Use POST for sensitive data |

---

## References

- [SolidJS Documentation](https://docs.solidjs.com/)
- [solid-router Documentation](https://docs.solidjs.com/solid-router)
- [TanStack Query for Solid](https://tanstack.com/query/latest/docs/solid/overview)
- [DaisyUI Components](https://daisyui.com/components/)
- [Kobalte Documentation](https://kobalte.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Zod Documentation](https://zod.dev/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

---

*Last updated: December 2025*
