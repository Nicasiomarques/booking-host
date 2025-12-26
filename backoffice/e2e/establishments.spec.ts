import { test, expect, type Page } from '@playwright/test'

// Helper to setup routes and authentication
async function setupAuthenticatedUser(page: Page, targetUrl: string) {
  // Setup auth mock
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

  // First navigate to login to get a valid origin for localStorage
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'mock-token')
  })

  // Then navigate to target
  await page.goto(targetUrl)
}

test.describe('Establishments Page', () => {
  test.describe('List View', () => {
    test('shows loading spinner while fetching', async ({ page }) => {
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

      // Use a longer delay and don't fulfill yet
      let resolveRoute: () => void
      const routePromise = new Promise<void>((resolve) => {
        resolveRoute = resolve
      })

      await page.route('**/v1/establishments/my', async (route) => {
        await routePromise
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('accessToken', 'mock-token')
      })
      await page.goto('/establishments')

      // Check spinner is visible while waiting
      await expect(page.locator('.loading-spinner')).toBeVisible()

      // Now resolve the route
      resolveRoute!()
    })

    test('shows empty state when no establishments', async ({ page }) => {
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

      await page.route('**/v1/establishments/my', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('accessToken', 'mock-token')
      })
      await page.goto('/establishments')

      // Wait for the page to load properly
      await page.waitForLoadState('networkidle')

      await expect(page.getByText(/no establishments yet/i)).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('button', { name: /create establishment/i })).toBeVisible()
    })

    test('shows establishments list', async ({ page }) => {
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

      await page.route('**/v1/establishments/my', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'est-1',
              name: 'Test Establishment',
              description: 'A test establishment',
              address: '123 Test Street',
              timezone: 'Europe/Lisbon',
              createdAt: '2025-01-01T00:00:00Z',
            },
            {
              id: 'est-2',
              name: 'Another Place',
              description: null,
              address: '456 Another Ave',
              timezone: 'Europe/London',
              createdAt: '2025-01-02T00:00:00Z',
            },
          ]),
        })
      })

      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('accessToken', 'mock-token')
      })
      await page.goto('/establishments')

      await expect(page.getByRole('heading', { name: 'Test Establishment' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Another Place' })).toBeVisible()
      await expect(page.getByText('123 Test Street')).toBeVisible()
    })

    test('navigates to establishment details when clicking View Details', async ({ page }) => {
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

      await page.route('**/v1/establishments/my', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'est-1',
              name: 'Test Establishment',
              description: 'A test establishment',
              address: '123 Test Street',
              timezone: 'Europe/Lisbon',
              createdAt: '2025-01-01T00:00:00Z',
            },
          ]),
        })
      })

      await page.route('**/v1/establishments/est-1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'est-1',
            name: 'Test Establishment',
            description: 'A test establishment',
            address: '123 Test Street',
            timezone: 'Europe/Lisbon',
            createdAt: '2025-01-01T00:00:00Z',
          }),
        })
      })

      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('accessToken', 'mock-token')
      })
      await page.goto('/establishments')

      // Wait for the page to load properly
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: 'Test Establishment' })).toBeVisible({ timeout: 10000 })

      await page.getByRole('link', { name: /view details/i }).click()

      await page.waitForURL(/\/establishments\/est-1/)
      await expect(page.getByRole('heading', { name: 'Test Establishment' })).toBeVisible()
    })
  })

  test.describe('Create Establishment', () => {
    test('opens create modal when clicking Add Establishment', async ({ page }) => {
      await page.route('**/v1/auth/me', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
            establishmentRoles: [],
          }),
        })
      })

      await page.route('**/v1/establishments/my', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('accessToken', 'mock-token')
      })
      await page.goto('/establishments')

      await page.getByRole('button', { name: /add establishment/i }).click()

      await expect(page.getByRole('heading', { name: /create establishment/i })).toBeVisible()
      await expect(page.getByLabel(/name/i)).toBeVisible()
      await expect(page.getByLabel(/address/i)).toBeVisible()
    })

    test('validates required fields', async ({ page }) => {
      await page.route('**/v1/auth/me', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
            establishmentRoles: [],
          }),
        })
      })

      await page.route('**/v1/establishments/my', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('accessToken', 'mock-token')
      })
      await page.goto('/establishments')

      await page.getByRole('button', { name: /add establishment/i }).click()

      // Submit empty form
      await page.getByRole('button', { name: /^create$/i }).click()

      await expect(page.getByText(/name must be at least 2 characters/i)).toBeVisible()
      await expect(page.getByText(/address is required/i)).toBeVisible()
      await expect(page.getByText(/timezone is required/i)).toBeVisible()
    })

    test('creates establishment successfully', async ({ page }) => {
      await page.route('**/v1/auth/me', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
            establishmentRoles: [],
          }),
        })
      })

      let establishmentsList: object[] = []

      await page.route('**/v1/establishments/my', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(establishmentsList),
        })
      })

      await page.route('**/v1/establishments', async (route) => {
        if (route.request().method() === 'POST') {
          const newEstablishment = {
            id: 'new-est',
            name: 'New Establishment',
            description: 'Test description',
            address: '789 New Street',
            timezone: 'Europe/Lisbon',
            createdAt: new Date().toISOString(),
          }
          establishmentsList = [newEstablishment]
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newEstablishment),
          })
        }
      })

      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('accessToken', 'mock-token')
      })
      await page.goto('/establishments')

      await page.getByRole('button', { name: /add establishment/i }).click()

      await page.getByLabel(/name/i).fill('New Establishment')
      await page.getByLabel(/description/i).fill('Test description')
      await page.getByLabel(/address/i).fill('789 New Street')
      await page.getByLabel(/timezone/i).selectOption('Europe/Lisbon')

      await page.getByRole('button', { name: /^create$/i }).click()

      // Modal should close and toast should appear
      await expect(page.getByText(/establishment created successfully/i)).toBeVisible()
    })
  })
})

test.describe('Establishment Details Page', () => {
  test('shows establishment details', async ({ page }) => {
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
        body: JSON.stringify({
          id: 'est-1',
          name: 'Test Establishment',
          description: 'A test establishment description',
          address: '123 Test Street',
          timezone: 'Europe/Lisbon',
          createdAt: '2025-01-01T00:00:00Z',
        }),
      })
    })

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/establishments/est-1')

    await expect(page.getByRole('heading', { name: 'Test Establishment' })).toBeVisible()
    await expect(page.getByText('123 Test Street')).toBeVisible()
    await expect(page.getByText('A test establishment description')).toBeVisible()
    await expect(page.getByText('Europe/Lisbon')).toBeVisible()
  })

  test('shows edit button for owners', async ({ page }) => {
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
        body: JSON.stringify({
          id: 'est-1',
          name: 'Test Establishment',
          description: 'A test establishment',
          address: '123 Test Street',
          timezone: 'Europe/Lisbon',
          createdAt: '2025-01-01T00:00:00Z',
        }),
      })
    })

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/establishments/est-1')

    await expect(page.getByRole('button', { name: /edit/i })).toBeVisible()
  })

  test('shows quick action links', async ({ page }) => {
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
        body: JSON.stringify({
          id: 'est-1',
          name: 'Test Establishment',
          description: 'A test establishment',
          address: '123 Test Street',
          timezone: 'Europe/Lisbon',
          createdAt: '2025-01-01T00:00:00Z',
        }),
      })
    })

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/establishments/est-1')

    await expect(page.getByText(/services/i).first()).toBeVisible()
    await expect(page.getByText(/availability/i).first()).toBeVisible()
    await expect(page.getByText(/bookings/i).first()).toBeVisible()
  })

  test('opens edit modal when clicking Edit button', async ({ page }) => {
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
        body: JSON.stringify({
          id: 'est-1',
          name: 'Test Establishment',
          description: 'A test establishment',
          address: '123 Test Street',
          timezone: 'Europe/Lisbon',
          createdAt: '2025-01-01T00:00:00Z',
        }),
      })
    })

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/establishments/est-1')

    await page.getByRole('button', { name: /edit/i }).click()

    await expect(page.getByRole('heading', { name: /edit establishment/i })).toBeVisible()
    await expect(page.getByLabel(/name/i)).toHaveValue('Test Establishment')
  })

  test('updates establishment successfully', async ({ page }) => {
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
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'est-1',
            name: 'Test Establishment',
            description: 'A test establishment',
            address: '123 Test Street',
            timezone: 'Europe/Lisbon',
            createdAt: '2025-01-01T00:00:00Z',
          }),
        })
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'est-1',
            name: 'Updated Establishment',
            description: 'A test establishment',
            address: '123 Test Street',
            timezone: 'Europe/Lisbon',
            createdAt: '2025-01-01T00:00:00Z',
          }),
        })
      }
    })

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/establishments/est-1')

    await page.getByRole('button', { name: /edit/i }).click()

    await page.getByLabel(/name/i).clear()
    await page.getByLabel(/name/i).fill('Updated Establishment')

    await page.getByRole('button', { name: /save changes/i }).click()

    await expect(page.getByText(/establishment updated successfully/i)).toBeVisible()
  })
})

test.describe('Dashboard', () => {
  test('shows dashboard after login', async ({ page }) => {
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

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test('shows stats cards', async ({ page }) => {
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

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/')

    await expect(page.getByText(/establishments/i).first()).toBeVisible()
    await expect(page.getByText(/today's bookings/i)).toBeVisible()
  })

  test('shows quick actions', async ({ page }) => {
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

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/')

    await expect(page.getByText(/view establishments/i)).toBeVisible()
  })
})

test.describe('Layout', () => {
  test('sidebar shows navigation links', async ({ page }) => {
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

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Establishments', exact: true })).toBeVisible()
  })

  test('header shows user info', async ({ page }) => {
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

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/')

    // Check for user initials in avatar
    await expect(page.getByText('TU')).toBeVisible() // "Test User" initials
  })

  test('theme toggle switches theme', async ({ page }) => {
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

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/')

    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'light')

    // Click theme toggle
    await page.locator('label.swap').click()

    await expect(html).toHaveAttribute('data-theme', 'dark')
  })

  test('logout redirects to login', async ({ page }) => {
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

    await page.route('**/v1/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token')
    })
    await page.goto('/')

    // Open user dropdown
    await page.getByRole('button', { name: /tu/i }).click()

    // Click logout
    await page.getByRole('button', { name: /logout/i }).click()

    await page.waitForURL(/login/)
  })
})
