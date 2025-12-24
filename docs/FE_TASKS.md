# Booking Service Backoffice - Development Tasks

## Overview

This document tracks all development tasks for the Booking Service Backoffice (Frontend). Each task includes subtasks, acceptance criteria, and a changelog.

**Rules:**
- Tasks are only marked as `[x]` (completed) after manual testing in browser
- Each task includes test scenarios
- Changelog updated with each significant change
- **Each completed phase requires a separate git commit**

**Commit Format:**
```
feat(fe-X.Y): short description

- Bullet point explaining what was done
- Another bullet point with details

Tested:
- Using e2e test using Playwright
```

---

## Task Status Legend

- `[ ]` - Not started
- `[~]` - In progress
- `[x]` - Completed (tested in browser)
- `[!]` - Blocked

---

## Phase 1: Project Setup

### 1.1 Initialize Project

- [x] **1.1.1** Create SolidJS project with TypeScript template
  ```bash
  npx degit solidjs/templates/vanilla/with-tailwindcss backoffice
  cd backoffice
  npm install
  ```

- [x] **1.1.2** Install core dependencies
  ```bash
  npm install @solidjs/router @tanstack/solid-query zod
  npm install -D @types/node
  ```

- [x] **1.1.3** Install UI dependencies
  ```bash
  npm install daisyui @kobalte/core
  ```

- [x] **1.1.4** Configure TailwindCSS with DaisyUI
  - Update tailwind.config.js
  - Add DaisyUI themes (light, dark, corporate)

- [x] **1.1.5** Configure TypeScript paths
  - tsconfig.json path aliases (@/ for src/)
  - vite.config.ts resolve aliases

- [x] **1.1.6** Create folder structure
  ```
  src/
  ├── components/ui/
  ├── components/layout/
  ├── components/shared/
  ├── features/
  ├── hooks/
  ├── lib/
  ├── stores/
  └── pages/
  ```

- [x] **1.1.7** Create environment configuration
  - .env.example with VITE_API_URL
  - .env.development
  - src/lib/constants.ts

**Test:**
```bash
npm run dev
# Verify: App runs at http://localhost:5173
# Verify: TailwindCSS styles are applied
# Verify: DaisyUI theme switching works
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Project initialized with all dependencies and folder structure | Claude |

---

### 1.2 Base Components

- [x] **1.2.1** Create Button component
  - src/components/ui/Button.tsx
  - Variants: primary, secondary, ghost, outline, accent, error
  - Sizes: xs, sm, md, lg
  - Loading state with spinner

- [x] **1.2.2** Create Input component
  - src/components/ui/Input.tsx
  - Support for error state
  - Also includes Textarea and Select components

- [x] **1.2.3** Create Card component
  - src/components/ui/Card.tsx
  - CardBody, CardTitle, CardActions slots

- [x] **1.2.4** Create Modal component
  - src/components/ui/Modal.tsx
  - Portal-based rendering
  - Close on backdrop click
  - Close on Escape key
  - Also includes ConfirmModal variant

- [x] **1.2.5** Create Table component
  - src/components/ui/Table.tsx
  - Zebra stripes option
  - TableHead, TableBody, TableRow, TableHeader, TableCell
  - TableEmpty and TableSkeleton components

- [x] **1.2.6** Create Spinner/Loading component
  - src/components/ui/Spinner.tsx
  - Multiple sizes (xs, sm, md, lg)
  - FullPageSpinner variant

- [x] **1.2.7** Create Alert component
  - src/components/ui/Alert.tsx
  - Types: success, error, warning, info
  - Default icons for each type

- [x] **1.2.8** Create Badge component
  - src/components/ui/Badge.tsx
  - Color variants and outline option

- [x] **1.2.9** Create barrel exports
  - src/components/ui/index.ts

**Test:**
- Create a test page with all components
- Verify all variants render correctly
- Verify interactions (click, hover, focus)

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | All base UI components created with DaisyUI styling | Claude |

---

## Phase 2: Core Infrastructure

### 2.1 API Client

- [x] **2.1.1** Create API client
  - src/lib/api.ts
  - Base URL from environment
  - Request/response interceptors
  - Error handling

- [x] **2.1.2** Implement authentication header injection
  - Read token from auth store
  - Add Authorization: Bearer header

- [x] **2.1.3** Implement token refresh logic
  - Detect 401 responses
  - Call refresh endpoint
  - Retry original request
  - Logout on refresh failure

- [x] **2.1.4** Create ApiError class
  - Custom error type
  - Include status code and error code

**Test:**
```bash
# Test with mock API or backend running
# Verify requests include auth header
# Verify 401 triggers refresh
# Verify errors are properly formatted
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | API client implemented and E2E tested | Claude |

---

### 2.2 State Management

- [x] **2.2.1** Create auth store
  - src/stores/auth.store.ts
  - user signal
  - accessToken signal
  - isAuthenticated derived
  - login/logout methods
  - hasRole method
  - Persist token to localStorage

- [x] **2.2.2** Create UI store
  - src/stores/ui.store.ts
  - theme signal (light/dark)
  - sidebarCollapsed signal
  - Persist theme to localStorage

- [x] **2.2.3** Create barrel export
  - src/stores/index.ts

**Test:**
- Login and verify user stored
- Refresh page and verify auth persisted
- Toggle theme and verify persistence

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Stores implemented and E2E tested | Claude |

---

### 2.3 Routing

- [x] **2.3.1** Create route definitions
  - src/routes.tsx
  - Public routes (login)
  - Protected routes (dashboard, establishments, etc.)
  - 404 route

- [x] **2.3.2** Create App with Router
  - src/App.tsx
  - QueryClientProvider
  - Router with routes
  - ToastContainer

- [x] **2.3.3** Create MainLayout (protected)
  - src/components/layout/MainLayout.tsx
  - Auth check with redirect
  - Sidebar + Header + Content

- [x] **2.3.4** Create Sidebar
  - src/components/layout/Sidebar.tsx
  - Navigation links
  - Collapsible
  - Active state highlighting

- [x] **2.3.5** Create Header
  - src/components/layout/Header.tsx
  - User info
  - Theme toggle
  - Logout button

**Test:**
- Navigate between routes
- Verify protected routes redirect to login
- Verify sidebar active states

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Routing and layouts implemented and E2E tested | Claude |

---

### 2.4 Toast Notifications

- [x] **2.4.1** Create toast hook
  - src/hooks/useToast.ts
  - success, error, warning, info methods
  - Auto-dismiss after 5 seconds

- [x] **2.4.2** Create ToastContainer
  - src/components/ui/ToastContainer.tsx
  - Positioned bottom-right
  - Stacked toasts

**Test:**
- Trigger different toast types
- Verify auto-dismiss
- Verify multiple toasts stack

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Toast system implemented and E2E tested | Claude |

---

## Phase 3: Authentication Feature

### 3.1 Auth Service

- [x] **3.1.1** Create auth service
  - Implemented directly via api.ts and authStore
  - login(email, password) - via Login.tsx
  - logout() - via Header.tsx
  - me() - via MainLayout.tsx

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Auth functionality implemented and E2E tested | Claude |

---

### 3.2 Auth Hook

- [x] **3.2.1** Create useAuth hook
  - Auth logic integrated into MainLayout.tsx and Login.tsx
  - Check auth on mount
  - login method
  - logout method
  - Redirect after login/logout

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Auth logic implemented and E2E tested | Claude |

---

### 3.3 Login Page

- [x] **3.3.1** Create Login page
  - src/pages/Login.tsx
  - Email input
  - Password input
  - Submit button
  - Error display
  - Loading state

- [x] **3.3.2** Form validation
  - Email format validation
  - Password required

**Test:**
```
# Test scenarios:
1. Login with valid credentials -> redirects to dashboard
2. Login with invalid credentials -> shows error
3. Access protected route -> redirects to login
4. Already logged in + access login -> redirects to dashboard
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Login page implemented and E2E tested | Claude |

---

## Phase 4: Dashboard

### 4.1 Dashboard Page

- [x] **4.1.1** Create Dashboard page
  - src/pages/Dashboard.tsx
  - Welcome message with user name
  - Quick stats cards (placeholder values)

- [x] **4.1.2** Create StatsCard component
  - Stats cards implemented inline in Dashboard.tsx
  - Title, value, icon (trend to be added when API ready)

- [ ] **4.1.3** Create RecentBookings widget
  - src/features/dashboard/components/RecentBookings.tsx
  - Show 5 most recent bookings
  - Link to bookings page

- [x] **4.1.4** Create QuickActions widget
  - Quick actions implemented inline in Dashboard.tsx
  - View establishments link

**Test:**
- Verify dashboard loads after login
- Verify stats display correctly
- Verify recent bookings show data

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Dashboard page implemented and E2E tested | Claude |

---

## Phase 5: Establishments Feature

### 5.1 Establishment Service

- [x] **5.1.1** Create establishment service
  - src/features/establishments/services/establishment.service.ts
  - getMyEstablishments()
  - getById(id)
  - create(data)
  - update(id, data)

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Establishment service implemented and E2E tested | Claude |

---

### 5.2 Establishment Hooks

- [x] **5.2.1** Create establishment hooks
  - src/features/establishments/hooks/useEstablishments.ts
  - useEstablishments() - list query
  - useEstablishment(id) - single query
  - useCreateEstablishment() - mutation
  - useUpdateEstablishment() - mutation

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | TanStack Query hooks implemented and E2E tested | Claude |

---

### 5.3 Establishments List Page

- [x] **5.3.1** Create Establishments page
  - src/pages/Establishments.tsx
  - List of establishment cards
  - Empty state
  - Loading state
  - "Create new" button

- [x] **5.3.2** Create EstablishmentCard component
  - Cards implemented inline in Establishments.tsx
  - Name, address, description
  - Link to details

**Test:**
```
1. List shows all user's establishments
2. Empty state when no establishments
3. Loading spinner while fetching
4. Click card navigates to details
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Establishments list page implemented and E2E tested | Claude |

---

### 5.4 Establishment Form

- [x] **5.4.1** Create EstablishmentForm component
  - src/features/establishments/components/EstablishmentForm.tsx
  - Name field (required)
  - Description field
  - Address field (required)
  - Timezone select (required)
  - Zod validation
  - Error display

- [x] **5.4.2** Create CreateEstablishmentModal
  - src/features/establishments/components/CreateEstablishmentModal.tsx
  - Modal with EstablishmentForm
  - Success toast on create

**Test:**
```
1. Form validates required fields
2. Create establishment shows success toast
3. List updates after creation
4. Form clears after submit
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | EstablishmentForm and CreateModal implemented and E2E tested | Claude |

---

### 5.5 Establishment Details Page

- [x] **5.5.1** Create EstablishmentDetails page
  - src/pages/EstablishmentDetails.tsx
  - Establishment info header
  - Quick links: Services, Availability, Bookings
  - Edit button (owner only)

- [x] **5.5.2** Create EditEstablishmentModal
  - src/features/establishments/components/EditEstablishmentModal.tsx
  - Pre-filled form
  - Update on submit

**Test:**
```
1. Details page shows establishment info
2. Tabs switch content
3. Edit button only visible for owners
4. Update reflects immediately
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | EstablishmentDetails and EditModal implemented and E2E tested | Claude |

---

## Phase 6: Services Feature

### 6.1 Service Service

- [x] **6.1.1** Create service service
  - src/features/services/services/service.service.ts
  - getByEstablishment(establishmentId)
  - getById(id)
  - create(establishmentId, data)
  - update(id, data)
  - delete(id)

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Service service implemented and E2E tested | Claude |

---

### 6.2 Service Hooks

- [x] **6.2.1** Create service hooks
  - src/features/services/hooks/useServices.ts
  - useServices(establishmentId) - list query
  - useService(id) - single query
  - useCreateService() - mutation
  - useUpdateService() - mutation
  - useDeleteService() - mutation

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Service hooks implemented and E2E tested | Claude |

---

### 6.3 Services Page

- [x] **6.3.1** Create Services page
  - src/pages/Services.tsx
  - List of services as table
  - Create button
  - Edit/Delete actions per row

- [x] **6.3.2** Create ServiceForm component
  - src/features/services/components/ServiceForm.tsx
  - Name, description, basePrice, durationMinutes, capacity
  - Zod validation

- [x] **6.3.3** Create ServiceModal (create/edit)
  - src/features/services/components/ServiceModal.tsx
  - Reuse ServiceForm
  - Create or edit mode

- [x] **6.3.4** Create DeleteConfirmModal
  - src/features/services/components/DeleteServiceModal.tsx
  - Uses existing ConfirmModal component
  - Danger styling

**Test:**
```
1. Services list shows all services for establishment
2. Create service adds to list
3. Edit service updates row
4. Delete service removes from list (after confirm)
5. Cannot delete service with active bookings (error from API)
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| 2025-12-24 | Services page with full CRUD implemented and E2E tested (13 tests) | Claude |

---

## Phase 7: Extra Items Feature

### 7.1 Extra Item Service & Hooks

- [ ] **7.1.1** Create extra item service
  - src/features/services/services/extra-item.service.ts
  - getByService(serviceId)
  - create(serviceId, data)
  - update(id, data)
  - delete(id)

- [ ] **7.1.2** Create extra item hooks
  - src/features/services/hooks/useExtraItems.ts

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

### 7.2 Extra Items UI

- [ ] **7.2.1** Create ExtraItemsList component
  - src/features/services/components/ExtraItemsList.tsx
  - Table of extra items
  - Add, edit, delete actions

- [ ] **7.2.2** Create ExtraItemForm
  - Name, price, maxQuantity fields
  - Zod validation

- [ ] **7.2.3** Integrate into Services page
  - Expandable row or modal to manage extras

**Test:**
```
1. View extras for a service
2. Create extra item
3. Edit extra item
4. Delete extra item
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

## Phase 8: Availability Feature

### 8.1 Availability Service & Hooks

- [ ] **8.1.1** Create availability service
  - src/features/availability/services/availability.service.ts
  - getByService(serviceId, dateRange)
  - create(serviceId, data)
  - update(id, data)
  - delete(id)

- [ ] **8.1.2** Create availability hooks
  - src/features/availability/hooks/useAvailability.ts

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

### 8.2 Availability Page

- [ ] **8.2.1** Create Availability page
  - src/pages/Availability.tsx
  - Service selector
  - Date range filter
  - List/Calendar view toggle

- [ ] **8.2.2** Create AvailabilityTable component
  - src/features/availability/components/AvailabilityTable.tsx
  - Date, time, capacity columns
  - Edit/Delete actions

- [ ] **8.2.3** Create AvailabilityForm
  - src/features/availability/components/AvailabilityForm.tsx
  - Date picker
  - Start time, end time
  - Capacity

- [ ] **8.2.4** Create AvailabilityModal
  - Create or edit availability slot

**Test:**
```
1. Filter availabilities by date range
2. Create new availability slot
3. Edit existing slot
4. Delete slot
5. Overlap prevention (error from API)
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

### 8.3 Calendar View (Optional Enhancement)

- [ ] **8.3.1** Create CalendarView component
  - src/features/availability/components/CalendarView.tsx
  - Monthly calendar grid
  - Show slots per day
  - Click to add/view

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

## Phase 9: Bookings Feature

### 9.1 Booking Service & Hooks

- [ ] **9.1.1** Create booking service
  - src/features/bookings/services/booking.service.ts
  - getByEstablishment(establishmentId, filters)
  - getById(id)
  - cancel(id)

- [ ] **9.1.2** Create booking hooks
  - src/features/bookings/hooks/useBookings.ts

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

### 9.2 Bookings Page

- [ ] **9.2.1** Create Bookings page
  - src/pages/Bookings.tsx
  - Establishment selector (if multiple)
  - Status filter (pending, confirmed, cancelled)
  - Date range filter
  - Pagination

- [ ] **9.2.2** Create BookingsTable component
  - src/features/bookings/components/BookingsTable.tsx
  - ID, Service, Customer, Date, Status, Total columns
  - Status badges
  - View/Cancel actions

- [ ] **9.2.3** Create BookingDetailsModal
  - src/features/bookings/components/BookingDetailsModal.tsx
  - Full booking information
  - Service details
  - Extra items
  - Cancel button (if not cancelled)

**Test:**
```
1. List bookings with filters
2. Pagination works
3. View booking details
4. Cancel booking -> status updates
5. Cannot cancel already cancelled booking
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

## Phase 10: Polish & UX

### 10.1 Loading States

- [ ] **10.1.1** Add skeleton loaders
  - Card skeletons
  - Table row skeletons
  - Form skeletons

- [ ] **10.1.2** Add page transitions
  - Fade in on route change

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

### 10.2 Error Handling

- [ ] **10.2.1** Create ErrorBoundary component
  - src/components/ErrorBoundary.tsx
  - Catch and display errors gracefully

- [ ] **10.2.2** Create NotFound page
  - src/pages/NotFound.tsx
  - 404 design
  - Link back to dashboard

- [ ] **10.2.3** API error handling
  - Show toast on API errors
  - Specific messages for known error codes

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

### 10.3 Responsive Design

- [ ] **10.3.1** Mobile sidebar
  - Drawer on mobile
  - Hamburger menu button
  - Overlay backdrop

- [ ] **10.3.2** Responsive tables
  - Card layout on mobile
  - Horizontal scroll on tablet

- [ ] **10.3.3** Form layouts
  - Stack on mobile
  - Grid on desktop

**Test:**
- Test on mobile viewport (375px)
- Test on tablet viewport (768px)
- Test on desktop viewport (1280px+)

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

### 10.4 Accessibility

- [ ] **10.4.1** Keyboard navigation
  - Tab through all interactive elements
  - Enter/Space to activate
  - Escape to close modals

- [ ] **10.4.2** ARIA labels
  - Add aria-label to icon buttons
  - Add aria-describedby for form errors

- [ ] **10.4.3** Focus management
  - Focus trap in modals
  - Focus return on modal close

**Test:**
- Navigate entire app with keyboard only
- Test with screen reader (VoiceOver/NVDA)

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

## Phase 11: E2E Testing

### 11.1 Playwright Setup

- [ ] **11.1.1** Install Playwright
  ```bash
  npm install -D @playwright/test
  npx playwright install
  ```

- [ ] **11.1.2** Configure Playwright
  - playwright.config.ts
  - Base URL configuration
  - Browser settings (Chromium, Firefox, WebKit)

- [ ] **11.1.3** Create test utilities
  - e2e/fixtures/auth.fixture.ts (login helper)
  - e2e/fixtures/api.fixture.ts (API mocking)

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

### 11.2 Auth E2E Tests

- [ ] **11.2.1** Test login flow
  - e2e/auth/login.spec.ts
  - Valid credentials -> redirect to dashboard
  - Invalid credentials -> error message
  - Form validation errors

- [ ] **11.2.2** Test protected routes
  - Unauthenticated access -> redirect to login
  - Authenticated access -> allowed
  - Logout -> redirect to login

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

### 11.3 Feature E2E Tests

- [ ] **11.3.1** Test establishments CRUD
  - e2e/establishments/establishments.spec.ts
  - List establishments
  - Create new establishment
  - Edit establishment
  - View establishment details

- [ ] **11.3.2** Test services CRUD
  - e2e/services/services.spec.ts
  - List services for establishment
  - Create/Edit/Delete service

- [ ] **11.3.3** Test bookings flow
  - e2e/bookings/bookings.spec.ts
  - List bookings with filters
  - View booking details
  - Cancel booking

**Test:**
```bash
npm run test:e2e
# All E2E tests should pass
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

## Phase 12: Build & Deploy

### 12.1 Production Build

- [ ] **12.1.1** Configure build
  - vite.config.ts production settings
  - Environment variables

- [ ] **12.1.2** Build optimization
  - Code splitting
  - Asset optimization
  - Gzip compression

**Test:**
```bash
npm run build
npm run preview
# Verify production build works
```

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

### 12.2 Deployment Setup

- [ ] **12.2.1** Create Dockerfile
  - Multi-stage build
  - Nginx for static serving

- [ ] **12.2.2** Create docker-compose.yml
  - Include with backend
  - Nginx reverse proxy

- [ ] **12.2.3** CI/CD pipeline (optional)
  - GitHub Actions workflow
  - Build, test, deploy

**Changelog:**
| Date | Change | Author |
|------|--------|--------|
| - | - | - |

---

## Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| 1. Project Setup | 16 subtasks | Completed |
| 2. Core Infrastructure | 14 subtasks | Completed (E2E tested) |
| 3. Authentication | 5 subtasks | Completed (E2E tested) |
| 4. Dashboard | 4 subtasks | In Progress (3/4 completed, RecentBookings pending) |
| 5. Establishments | 10 subtasks | Completed (E2E tested) |
| 6. Services | 7 subtasks | Completed (E2E tested) |
| 7. Extra Items | 5 subtasks | Not started |
| 8. Availability | 7 subtasks | Not started |
| 9. Bookings | 5 subtasks | Not started |
| 10. Polish & UX | 10 subtasks | Not started |
| 11. E2E Testing | 8 subtasks | Partial (43 tests passing) |
| 12. Build & Deploy | 5 subtasks | Not started |

**Total: 97 subtasks**

---

## Global Changelog

| Date | Phase | Change | Author |
|------|-------|--------|--------|
| 2025-12-24 | - | Initial task list created | Claude |
| 2025-12-24 | 1 | Phase 1 completed: Project setup and base UI components | Claude |
| 2025-12-24 | 2 | Phase 2 code implemented: API client, stores, routing, layouts, toasts | Claude |
| 2025-12-24 | 3 | Phase 3 code implemented: Authentication flow with login page | Claude |
| 2025-12-24 | 4 | Phase 4 code implemented: Dashboard with stats and quick actions | Claude |
| 2025-12-24 | 5 | Phase 5 code implemented: Establishments feature with service, hooks, and CRUD | Claude |
| 2025-12-24 | 2-5 | E2E tests created and passing (30 tests) - Phases 2-5 validated | Claude |
| 2025-12-24 | 6 | Phase 6 completed: Services feature with full CRUD and E2E tests (13 new tests) | Claude |

---

*Last updated: December 2025*
