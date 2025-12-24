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
]

const mockExtraItems = [
  {
    id: 'extra-1',
    serviceId: 'service-1',
    name: 'Premium Shampoo',
    price: 5.0,
    maxQuantity: 2,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'extra-2',
    serviceId: 'service-1',
    name: 'Hair Mask',
    price: 10.0,
    maxQuantity: 1,
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

  await page.route('**/v1/establishments/est-1/services', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockServices),
    })
  })

  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'mock-token')
  })
}

test.describe('Extra Items Feature', () => {
  test.describe('Expand/Collapse Service Row', () => {
    test('shows expand button on service rows', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await expect(page.getByLabel(/expand extras/i)).toBeVisible({ timeout: 10000 })
    })

    test('expands service row to show extra items section', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockExtraItems),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()

      await expect(page.getByText('Extra Items')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Premium Shampoo', { exact: true })).toBeVisible()
      await expect(page.getByText('Hair Mask', { exact: true })).toBeVisible()
    })

    test('collapses service row when clicking expand button again', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockExtraItems),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      // Expand
      await page.getByLabel(/expand extras/i).click()
      await expect(page.getByText('Extra Items')).toBeVisible({ timeout: 10000 })

      // Collapse
      await page.getByLabel(/collapse extras/i).click()
      await expect(page.getByText('Extra Items')).not.toBeVisible()
    })
  })

  test.describe('Extra Items List', () => {
    test('shows empty state when no extra items', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()

      await expect(page.getByText(/no extra items yet/i)).toBeVisible({ timeout: 10000 })
    })

    test('shows extra items with price and max quantity', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockExtraItems),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()

      await expect(page.getByText('5,00 €')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('10,00 €')).toBeVisible()
      await expect(page.getByText(/max 2/)).toBeVisible()
      await expect(page.getByText(/max 1/)).toBeVisible()
    })
  })

  test.describe('Create Extra Item', () => {
    test('shows add extra form when clicking Add Extra button', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()
      await page.getByRole('button', { name: /add extra/i }).click()

      await expect(page.getByText('New Extra Item')).toBeVisible({ timeout: 10000 })
      await expect(page.getByLabel(/name/i)).toBeVisible()
      await expect(page.getByLabel(/price/i)).toBeVisible()
      await expect(page.getByLabel(/max quantity/i)).toBeVisible()
    })

    test('validates required fields', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()
      await page.getByRole('button', { name: /add extra/i }).click()

      // Clear name and submit
      await page.getByLabel(/name/i).fill('a')
      await page.getByLabel(/name/i).clear()
      await page.getByRole('button', { name: /^add$/i }).click()

      await expect(page.getByText(/name must be at least 2 characters/i)).toBeVisible()
    })

    test('creates extra item successfully', async ({ page }) => {
      await setupAuthAndMocks(page)

      let extrasList: object[] = []

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(extrasList),
          })
        } else if (route.request().method() === 'POST') {
          const newExtra = {
            id: 'new-extra',
            serviceId: 'service-1',
            name: 'New Extra',
            price: 7.5,
            maxQuantity: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          extrasList = [newExtra]
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newExtra),
          })
        }
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()
      await page.getByRole('button', { name: /add extra/i }).click()

      await page.getByLabel(/name/i).fill('New Extra')
      await page.getByLabel(/price/i).fill('7.50')
      await page.getByLabel(/max quantity/i).fill('3')

      await page.getByRole('button', { name: /^add$/i }).click()

      // Form should close after successful creation
      await expect(page.getByText('New Extra Item')).not.toBeVisible({ timeout: 10000 })
    })

    test('can cancel adding extra item', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()
      await page.getByRole('button', { name: /add extra/i }).click()

      await expect(page.getByText('New Extra Item')).toBeVisible({ timeout: 10000 })

      await page.getByRole('button', { name: /cancel/i }).click()

      await expect(page.getByText('New Extra Item')).not.toBeVisible()
    })
  })

  test.describe('Edit Extra Item', () => {
    test('shows edit form when clicking Edit button', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockExtraItems),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()
      // Wait for extra items to load, then click Edit on the first extra item
      await expect(page.getByText('Premium Shampoo', { exact: true })).toBeVisible({ timeout: 10000 })
      // Click Edit button that's a sibling of Premium Shampoo text
      const extraItemRow = page.locator('.rounded-lg').filter({ hasText: 'Premium Shampoo' }).filter({ hasText: '5,00 €' })
      await extraItemRow.getByRole('button', { name: /^edit$/i }).click()

      await expect(page.getByText('Edit Extra Item')).toBeVisible({ timeout: 10000 })
      await expect(page.getByLabel(/name/i)).toHaveValue('Premium Shampoo')
    })

    test('updates extra item successfully', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockExtraItems),
        })
      })

      await page.route('**/v1/extra-items/extra-1', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockExtraItems[0],
              name: 'Updated Shampoo',
            }),
          })
        }
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()
      // Wait for extra items to load, then click Edit on the first extra item
      await expect(page.getByText('Premium Shampoo', { exact: true })).toBeVisible({ timeout: 10000 })
      const extraItemRow = page.locator('.rounded-lg').filter({ hasText: 'Premium Shampoo' }).filter({ hasText: '5,00 €' })
      await extraItemRow.getByRole('button', { name: /^edit$/i }).click()

      await page.getByLabel(/name/i).clear()
      await page.getByLabel(/name/i).fill('Updated Shampoo')

      await page.getByRole('button', { name: /save/i }).click()

      // Form should close after successful update
      await expect(page.getByText('Edit Extra Item')).not.toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Delete Extra Item', () => {
    test('shows delete confirmation modal', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockExtraItems),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()
      // Wait for extra items to load, then click Delete on the first extra item
      await expect(page.getByText('Premium Shampoo', { exact: true })).toBeVisible({ timeout: 10000 })
      const extraItemRow = page.locator('.rounded-lg').filter({ hasText: 'Premium Shampoo' }).filter({ hasText: '5,00 €' })
      await extraItemRow.getByRole('button', { name: /^delete$/i }).click()

      await expect(page.getByText('Delete Extra Item')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible()
    })

    test('deletes extra item successfully', async ({ page }) => {
      await setupAuthAndMocks(page)

      let extrasList = [...mockExtraItems]

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(extrasList),
        })
      })

      await page.route('**/v1/extra-items/extra-1', async (route) => {
        if (route.request().method() === 'DELETE') {
          extrasList = extrasList.filter((e) => e.id !== 'extra-1')
          await route.fulfill({
            status: 204,
            contentType: 'application/json',
            body: '',
          })
        }
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()
      // Wait for extra items to load, then click Delete on the first extra item
      await expect(page.getByText('Premium Shampoo', { exact: true })).toBeVisible({ timeout: 10000 })
      const extraItemRow = page.locator('.rounded-lg').filter({ hasText: 'Premium Shampoo' }).filter({ hasText: '5,00 €' })
      await extraItemRow.getByRole('button', { name: /^delete$/i }).click()

      // Click confirm button in modal
      await page.locator('.modal').getByRole('button', { name: 'Delete' }).click()

      // Modal should close after successful deletion
      await expect(page.getByText('Delete Extra Item')).not.toBeVisible({ timeout: 10000 })
    })

    test('can cancel delete', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/services/service-1/extra-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockExtraItems),
        })
      })

      await page.goto('/establishments/est-1/services')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/expand extras/i).click()
      // Wait for extra items to load, then click Delete on the first extra item
      await expect(page.getByText('Premium Shampoo', { exact: true })).toBeVisible({ timeout: 10000 })
      const extraItemRow = page.locator('.rounded-lg').filter({ hasText: 'Premium Shampoo' }).filter({ hasText: '5,00 €' })
      await extraItemRow.getByRole('button', { name: /^delete$/i }).click()

      await expect(page.getByText('Delete Extra Item')).toBeVisible({ timeout: 10000 })

      await page.getByRole('button', { name: /cancel/i }).click()

      // Modal should close, extra still visible
      await expect(page.getByText('Delete Extra Item')).not.toBeVisible()
      await expect(page.getByText('Premium Shampoo', { exact: true })).toBeVisible()
    })
  })
})
