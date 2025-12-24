import { test, expect } from '@playwright/test'

const mockEstablishment = {
  id: 'est-1',
  name: 'Test Establishment',
  description: 'A test establishment',
  address: '123 Test Street',
  timezone: 'Europe/Lisbon',
  createdAt: '2025-01-01T00:00:00Z',
}

const mockServices = [
  {
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
  },
  {
    id: 'service-2',
    establishmentId: 'est-1',
    name: 'Beard Trim',
    description: null,
    basePrice: 15.0,
    durationMinutes: 15,
    capacity: 1,
    isActive: false,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
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

  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'mock-token')
  })
}

test.describe('Services Page', () => {
  test.describe('List View', () => {
    test('shows empty state when no services', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText(/no services yet/i)).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('button', { name: /create service/i })).toBeVisible()
    })

    test('shows services list', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockServices),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('Haircut', { exact: true })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Beard Trim', { exact: true })).toBeVisible()
      await expect(page.getByText('25,00 €')).toBeVisible()
      await expect(page.getByText('30 min')).toBeVisible()
    })

    test('shows active/inactive badges', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockServices),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('Active', { exact: true })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Inactive', { exact: true })).toBeVisible()
    })

    test('shows breadcrumb navigation', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('.breadcrumbs').getByRole('link', { name: 'Establishments' })).toBeVisible()
      await expect(page.locator('.breadcrumbs').getByRole('link', { name: 'Test Establishment' })).toBeVisible()
    })
  })

  test.describe('Create Service', () => {
    test('opens create modal when clicking Add Service', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /add service/i }).click()

      await expect(page.getByRole('heading', { name: /create service/i })).toBeVisible()
      await expect(page.getByLabel(/name/i)).toBeVisible()
      await expect(page.getByLabel(/base price/i)).toBeVisible()
      await expect(page.getByLabel(/duration/i)).toBeVisible()
    })

    test('validates required fields', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /add service/i }).click()

      // Clear name and submit
      await page.getByLabel(/name/i).fill('')
      await page.getByRole('button', { name: /^create$/i }).click()

      await expect(page.getByText(/name must be at least 2 characters/i)).toBeVisible()
    })

    test('creates service successfully', async ({ page }) => {
      await setupAuthAndMocks(page)

      let servicesList: object[] = []

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(servicesList),
          })
        } else if (route.request().method() === 'POST') {
          const newService = {
            id: 'new-service',
            establishmentId: 'est-1',
            name: 'New Service',
            description: 'Test description',
            basePrice: 50.0,
            durationMinutes: 60,
            capacity: 2,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          servicesList = [newService]
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newService),
          })
        }
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /add service/i }).click()

      await page.getByLabel(/name/i).fill('New Service')
      await page.getByLabel(/description/i).fill('Test description')
      await page.getByLabel(/base price/i).fill('50')
      await page.getByLabel(/duration/i).selectOption('60')
      await page.getByLabel(/capacity/i).fill('2')

      await page.getByRole('button', { name: /^create$/i }).click()

      await expect(page.getByText(/service created successfully/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Edit Service', () => {
    test('opens edit modal when clicking Edit button', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockServices),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      // Click first Edit button
      await page.getByRole('button', { name: /edit/i }).first().click()

      await expect(page.getByRole('heading', { name: /edit service/i })).toBeVisible()
      await expect(page.getByLabel(/name/i)).toHaveValue('Haircut')
    })

    test('updates service successfully', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockServices),
        })
      })

      await page.route('**/v1/services/service-1', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockServices[0],
              name: 'Updated Haircut',
            }),
          })
        }
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /edit/i }).first().click()

      await page.getByLabel(/name/i).clear()
      await page.getByLabel(/name/i).fill('Updated Haircut')

      await page.getByRole('button', { name: /save changes/i }).click()

      await expect(page.getByText(/service updated successfully/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Delete Service', () => {
    test('shows delete confirmation modal', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockServices),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      // Click first Delete button
      await page.getByRole('button', { name: /delete/i }).first().click()

      await expect(page.getByRole('heading', { name: /delete service/i })).toBeVisible()
      await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible()
    })

    test('deletes service successfully', async ({ page }) => {
      await setupAuthAndMocks(page)

      let servicesList = [...mockServices]

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(servicesList),
        })
      })

      await page.route('**/v1/services/service-1', async (route) => {
        if (route.request().method() === 'DELETE') {
          servicesList = servicesList.filter((s) => s.id !== 'service-1')
          await route.fulfill({
            status: 204,
            contentType: 'application/json',
            body: '',
          })
        }
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /delete/i }).first().click()
      // Click confirm button in modal
      await page.locator('.modal').getByRole('button', { name: 'Delete' }).click()

      await expect(page.getByText(/service deleted successfully/i)).toBeVisible({ timeout: 10000 })
    })

    test('can cancel delete', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockServices),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /delete/i }).first().click()
      await page.getByRole('button', { name: /cancel/i }).click()

      // Modal should close, services still visible
      await expect(page.getByRole('heading', { name: /delete service/i })).not.toBeVisible()
      await expect(page.getByText('Haircut', { exact: true })).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('navigates from establishment details to services', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/services', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1')
      await page.waitForLoadState('networkidle')

      // Click on Services card
      await page.getByText('Manage your services').click()

      await page.waitForURL(/\/establishments\/est-1\/services/)
      await expect(page.getByRole('heading', { name: 'Services', exact: true })).toBeVisible()
    })
  })
})
