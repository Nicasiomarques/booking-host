import { test, expect } from '@playwright/test'

const mockEstablishment = {
  id: 'est-1',
  name: 'Test Establishment',
  description: 'A test establishment',
  address: '123 Test Street',
  timezone: 'Europe/Lisbon',
  createdAt: '2025-01-01T00:00:00Z',
}

const mockService = {
  id: 'service-1',
  establishmentId: 'est-1',
  name: 'Haircut',
  description: 'A standard haircut',
  basePrice: 25.0,
  durationMinutes: 30,
  capacity: 1,
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

const mockAvailabilitySlots = [
  {
    id: 'slot-1',
    serviceId: 'service-1',
    date: '2025-01-15',
    startTime: '09:00',
    endTime: '10:00',
    capacity: 2,
    bookedCount: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'slot-2',
    serviceId: 'service-1',
    date: '2025-01-15',
    startTime: '10:00',
    endTime: '11:00',
    capacity: 2,
    bookedCount: 1,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'slot-3',
    serviceId: 'service-1',
    date: '2025-01-16',
    startTime: '14:00',
    endTime: '15:00',
    capacity: 1,
    bookedCount: 1,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
]

async function setupAuthAndMocks(page: import('@playwright/test').Page) {
  await page.route('**/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        establishmentRoles: [{ establishmentId: 'est-1', role: 'OWNER' }],
      }),
    })
  })

  await page.route('**/v1/establishments/est-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockEstablishment),
    })
  })

  await page.route('**/v1/services/service-1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockService),
      })
    }
  })

  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'mock-token')
  })
}

test.describe('Availability Page', () => {
  test.describe('List View', () => {
    test('shows empty state when no availability slots', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText(/no availability slots yet/i)).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('button', { name: /create slot/i })).toBeVisible()
    })

    test('shows availability slots list', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAvailabilitySlots),
        })
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('09:00 - 10:00')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('10:00 - 11:00')).toBeVisible()
      await expect(page.getByText('14:00 - 15:00')).toBeVisible()
    })

    test('shows status badges for availability', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAvailabilitySlots),
        })
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('Available', { exact: true })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Partial', { exact: true })).toBeVisible()
      await expect(page.getByText('Full', { exact: true })).toBeVisible()
    })

    test('shows breadcrumb navigation', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('.breadcrumbs').getByRole('link', { name: 'Establishments' })).toBeVisible()
      await expect(page.locator('.breadcrumbs').getByRole('link', { name: 'Test Establishment' })).toBeVisible()
      await expect(page.locator('.breadcrumbs').getByRole('link', { name: 'Services' })).toBeVisible()
    })
  })

  test.describe('Create Availability Slot', () => {
    test('opens create modal when clicking Add Slot', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /add slot/i }).click()

      await expect(page.getByRole('heading', { name: /create availability slot/i })).toBeVisible()
      await expect(page.getByLabel(/date/i)).toBeVisible()
      await expect(page.getByLabel(/start time/i)).toBeVisible()
      await expect(page.getByLabel(/end time/i)).toBeVisible()
      await expect(page.getByLabel(/capacity/i)).toBeVisible()
    })

    test('validates end time after start time', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /add slot/i }).click()

      // Set end time before start time
      await page.getByLabel(/start time/i).fill('14:00')
      await page.getByLabel(/end time/i).fill('10:00')
      await page.getByRole('button', { name: /^create$/i }).click()

      await expect(page.getByText(/end time must be after start time/i)).toBeVisible()
    })

    test('creates availability slot successfully', async ({ page }) => {
      await setupAuthAndMocks(page)

      let slotsList: object[] = []

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(slotsList),
          })
        } else if (route.request().method() === 'POST') {
          const newSlot = {
            id: 'new-slot',
            serviceId: 'service-1',
            date: '2025-01-20',
            startTime: '09:00',
            endTime: '10:00',
            capacity: 3,
            bookedCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          slotsList = [newSlot]
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newSlot),
          })
        }
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /add slot/i }).click()

      await page.getByLabel(/date/i).fill('2025-01-20')
      await page.getByLabel(/start time/i).fill('09:00')
      await page.getByLabel(/end time/i).fill('10:00')
      await page.getByLabel(/capacity/i).fill('3')

      await page.getByRole('button', { name: /^create$/i }).click()

      await expect(page.getByText(/availability slot created successfully/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Edit Availability Slot', () => {
    test('opens edit modal when clicking Edit button', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAvailabilitySlots),
        })
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /^edit$/i }).first().click()

      await expect(page.getByRole('heading', { name: /edit availability slot/i })).toBeVisible()
    })

    test('updates availability slot successfully', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAvailabilitySlots),
        })
      })

      await page.route('**/v1/availability/slot-1', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockAvailabilitySlots[0],
              capacity: 5,
            }),
          })
        }
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /^edit$/i }).first().click()

      await page.getByLabel(/capacity/i).clear()
      await page.getByLabel(/capacity/i).fill('5')

      await page.getByRole('button', { name: /save changes/i }).click()

      await expect(page.getByText(/availability slot updated successfully/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Delete Availability Slot', () => {
    test('shows delete confirmation modal', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAvailabilitySlots),
        })
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      // Click first Delete button (the one that's not disabled)
      await page.getByRole('button', { name: /^delete$/i }).first().click()

      await expect(page.getByRole('heading', { name: /delete availability slot/i })).toBeVisible()
      await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible()
    })

    test('deletes availability slot successfully', async ({ page }) => {
      await setupAuthAndMocks(page)

      let slotsList = [...mockAvailabilitySlots]

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(slotsList),
        })
      })

      await page.route('**/v1/availability/slot-1', async (route) => {
        if (route.request().method() === 'DELETE') {
          slotsList = slotsList.filter((s) => s.id !== 'slot-1')
          await route.fulfill({
            status: 204,
            contentType: 'application/json',
            body: '',
          })
        }
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /^delete$/i }).first().click()
      // Click confirm button in modal
      await page.locator('.modal').getByRole('button', { name: 'Delete' }).click()

      await expect(page.getByText(/availability slot deleted successfully/i)).toBeVisible({ timeout: 10000 })
    })

    test('can cancel delete', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAvailabilitySlots),
        })
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /^delete$/i }).first().click()
      await page.getByRole('button', { name: /cancel/i }).click()

      // Modal should close
      await expect(page.getByRole('heading', { name: /delete availability slot/i })).not.toBeVisible()
    })

    test('disables delete for slots with bookings', async ({ page }) => {
      await setupAuthAndMocks(page)

      // Slot with bookedCount > 0 should have disabled delete button
      const slotsWithBookings = [
        {
          ...mockAvailabilitySlots[2], // slot-3 has bookedCount: 1
        },
      ]

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(slotsWithBookings),
        })
      })

      await page.goto('/establishments/est-1/services/service-1/availability')
      await page.waitForLoadState('networkidle')

      // The delete button should be disabled
      await expect(page.getByRole('button', { name: /^delete$/i })).toBeDisabled()
    })
  })

  test.describe('Navigation', () => {
    test('navigates from services page to availability', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockService]),
        })
      })

      await page.route('**/v1/services/service-1/availability**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByRole('link', { name: /availability/i }).click()

      await page.waitForURL(/\/establishments\/est-1\/services\/service-1\/availability/)
      await expect(page.getByRole('heading', { name: 'Availability', exact: true })).toBeVisible()
    })
  })
})
