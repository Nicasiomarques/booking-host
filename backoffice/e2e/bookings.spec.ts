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
    description: 'A beard trim',
    basePrice: 15.0,
    durationMinutes: 15,
    capacity: 1,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
]

// API format (what the backend returns)
const mockApiBookings = [
  {
    id: 'booking-1',
    userId: 'user-customer-1',
    establishmentId: 'est-1',
    serviceId: 'service-1',
    availabilityId: 'slot-1',
    quantity: 1,
    totalPrice: 35.0,
    status: 'CONFIRMED' as const,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
    service: {
      name: 'Haircut',
      durationMinutes: 30,
      basePrice: 25.0,
    },
    availability: {
      date: '2025-01-15',
      startTime: '09:00',
      endTime: '09:30',
    },
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    extras: [
      {
        id: 'extra-1',
        extraItemId: 'item-1',
        quantity: 1,
        priceAtBooking: 10.0,
        extraItem: {
          name: 'Hair Gel',
        },
      },
    ],
  },
  {
    id: 'booking-2',
    userId: 'user-customer-2',
    establishmentId: 'est-1',
    serviceId: 'service-1',
    availabilityId: 'slot-2',
    quantity: 1,
    totalPrice: 25.0,
    status: 'PENDING' as const,
    createdAt: '2025-01-11T14:00:00Z',
    updatedAt: '2025-01-11T14:00:00Z',
    service: {
      name: 'Haircut',
      durationMinutes: 30,
      basePrice: 25.0,
    },
    availability: {
      date: '2025-01-16',
      startTime: '10:00',
      endTime: '10:30',
    },
    user: {
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
    extras: [],
  },
  {
    id: 'booking-3',
    userId: 'user-customer-3',
    establishmentId: 'est-1',
    serviceId: 'service-2',
    availabilityId: 'slot-3',
    quantity: 1,
    totalPrice: 15.0,
    status: 'CANCELLED' as const,
    createdAt: '2025-01-09T09:00:00Z',
    updatedAt: '2025-01-12T11:00:00Z',
    service: {
      name: 'Beard Trim',
      durationMinutes: 15,
      basePrice: 15.0,
    },
    availability: {
      date: '2025-01-14',
      startTime: '14:00',
      endTime: '14:15',
    },
    user: {
      name: 'Bob Wilson',
      email: 'bob@example.com',
    },
    extras: [],
  },
  {
    id: 'booking-4',
    userId: 'user-customer-4',
    establishmentId: 'est-1',
    serviceId: 'service-1',
    availabilityId: 'slot-4',
    quantity: 1,
    totalPrice: 25.0,
    status: 'COMPLETED' as const,
    createdAt: '2025-01-05T08:00:00Z',
    updatedAt: '2025-01-10T12:00:00Z',
    service: {
      name: 'Haircut',
      durationMinutes: 30,
      basePrice: 25.0,
    },
    availability: {
      date: '2025-01-10',
      startTime: '11:00',
      endTime: '11:30',
    },
    user: {
      name: 'Alice Brown',
      email: 'alice@example.com',
    },
    extras: [],
  },
]

const mockPaginatedBookings = {
  data: mockApiBookings,
  meta: {
    total: 4,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
}

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
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEstablishment),
      })
    }
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

test.describe('Bookings Page', () => {
  test.describe('List View', () => {
    test('shows empty state when no bookings', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            meta: {
              total: 0,
              page: 1,
              limit: 10,
              totalPages: 0,
            },
          }),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText(/no bookings found/i)).toBeVisible({ timeout: 10000 })
    })

    test('shows bookings list', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('John Doe')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Jane Smith')).toBeVisible()
      await expect(page.getByText('Bob Wilson')).toBeVisible()
      await expect(page.getByText('Alice Brown')).toBeVisible()
    })

    test('shows status badges', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('CONFIRMED', { exact: true })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
      await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible()
      await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible()
    })

    test('shows breadcrumb navigation', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await expect(
        page.locator('.breadcrumbs').getByRole('link', { name: 'Establishments' })
      ).toBeVisible()
      await expect(
        page.locator('.breadcrumbs').getByRole('link', { name: 'Test Establishment' })
      ).toBeVisible()
    })
  })

  test.describe('Filters', () => {
    test('shows filter controls', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await expect(page.getByLabel(/status/i)).toBeVisible()
      await expect(page.getByLabel(/service/i)).toBeVisible()
      await expect(page.getByLabel(/start date/i)).toBeVisible()
      await expect(page.getByLabel(/end date/i)).toBeVisible()
    })

    test('filters by status', async ({ page }) => {
      await setupAuthAndMocks(page)

      const requestUrls: string[] = []
      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        requestUrls.push(route.request().url())
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/status/i).selectOption('CONFIRMED')

      // Wait for the filter request to be made
      await expect(async () => {
        expect(requestUrls.some((url) => url.includes('status=CONFIRMED'))).toBe(true)
      }).toPass({ timeout: 5000 })
    })

    test('filters by service', async ({ page }) => {
      await setupAuthAndMocks(page)

      const requestUrls: string[] = []
      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        requestUrls.push(route.request().url())
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/service/i).selectOption('service-1')

      // Wait for the filter request to be made
      await expect(async () => {
        expect(requestUrls.some((url) => url.includes('serviceId=service-1'))).toBe(true)
      }).toPass({ timeout: 5000 })
    })

    test('filters by date range', async ({ page }) => {
      await setupAuthAndMocks(page)

      const requestUrls: string[] = []
      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        requestUrls.push(route.request().url())
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await page.getByLabel(/start date/i).fill('2025-01-01')

      // Wait for the filter request to be made
      await expect(async () => {
        expect(requestUrls.some((url) => url.includes('startDate=2025-01-01'))).toBe(true)
      }).toPass({ timeout: 5000 })

      await page.getByLabel(/end date/i).fill('2025-01-31')

      // Wait for the filter request to be made
      await expect(async () => {
        expect(requestUrls.some((url) => url.includes('endDate=2025-01-31'))).toBe(true)
      }).toPass({ timeout: 5000 })
    })
  })

  test.describe('View Booking Details', () => {
    test('opens details modal when clicking View', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /^view$/i }).first().click()

      await expect(page.getByRole('heading', { name: /booking details/i })).toBeVisible()
    })

    test('shows booking details in modal', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      // Mock the booking details endpoint
      await page.route('**/v1/bookings/booking-1**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockApiBookings[0]),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /^view$/i }).first().click()

      // Wait for modal to appear
      await expect(page.getByRole('heading', { name: /booking details/i })).toBeVisible()

      // Should show customer info
      await expect(page.locator('.modal').getByText('John Doe')).toBeVisible()
      await expect(page.locator('.modal').getByText('john@example.com')).toBeVisible()
      // Phone is not supported in the current system, so we skip this check

      // Should show service
      await expect(page.locator('.modal').getByText('Haircut')).toBeVisible()

      // Should show extra items
      await expect(page.locator('.modal').getByText('Hair Gel')).toBeVisible()
    })

    test('closes modal when clicking Close', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /^view$/i }).first().click()
      await expect(page.getByRole('heading', { name: /booking details/i })).toBeVisible()

      await page.locator('.modal').getByRole('button', { name: /close/i }).click()

      await expect(page.getByRole('heading', { name: /booking details/i })).not.toBeVisible()
    })
  })

  test.describe('Cancel Booking', () => {
    test('shows cancel confirmation modal', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      // Wait for the table to load
      await expect(page.getByText('John Doe')).toBeVisible({ timeout: 10000 })

      // Click cancel on the first row with Cancel button (CONFIRMED or PENDING)
      // The first booking (John Doe) has status CONFIRMED, so it should have a Cancel button
      const row = page.getByRole('row').filter({ hasText: 'John Doe' })
      await expect(row).toBeVisible()
      
      const cancelButton = row.getByRole('button', { name: /^cancel$/i })
      await expect(cancelButton).toBeVisible({ timeout: 5000 })
      await cancelButton.click()

      await expect(page.getByRole('heading', { name: /cancel booking/i })).toBeVisible()
      await expect(page.getByText(/are you sure you want to cancel/i)).toBeVisible()
    })

    test('cancels booking successfully', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.route('**/v1/bookings/booking-1/cancel', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockApiBookings[0],
            status: 'CANCELLED',
          }),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await page
        .getByRole('row')
        .filter({ hasText: 'John Doe' })
        .getByRole('button', { name: /^cancel$/i })
        .click()

      await page.locator('.modal').getByRole('button', { name: /cancel booking/i }).click()

      await expect(page.getByText(/booking cancelled successfully/i)).toBeVisible({
        timeout: 10000,
      })
    })

    test('can cancel from details modal', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.route('**/v1/bookings/booking-1/cancel', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockApiBookings[0],
            status: 'CANCELLED',
          }),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /^view$/i }).first().click()

      await page.locator('.modal').getByRole('button', { name: /cancel booking/i }).click()

      await expect(page.getByRole('heading', { name: /cancel booking/i })).toBeVisible()
    })

    test('does not show cancel button for cancelled bookings', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      // Bob Wilson's booking is CANCELLED, should not have Cancel button
      const cancelledRow = page.getByRole('row').filter({ hasText: 'Bob Wilson' })
      await expect(cancelledRow.getByRole('button', { name: /^cancel$/i })).not.toBeVisible()
    })

    test('does not show cancel button for completed bookings', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      // Alice Brown's booking is COMPLETED, should not have Cancel button
      const completedRow = page.getByRole('row').filter({ hasText: 'Alice Brown' })
      await expect(completedRow.getByRole('button', { name: /^cancel$/i })).not.toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('navigates from establishment details to bookings', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings),
        })
      })

      await page.goto('/establishments/est-1')
      await page.waitForLoadState('networkidle')

      await page.getByRole('link', { name: /bookings/i }).click()

      await page.waitForURL(/\/establishments\/est-1\/bookings/)
      await expect(page.getByRole('heading', { name: 'Bookings', exact: true })).toBeVisible()
    })
  })

  test.describe('Pagination', () => {
    test('shows pagination when there are multiple pages', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockApiBookings.slice(0, 2),
            meta: {
              total: 20,
              page: 1,
              limit: 10,
              totalPages: 2,
            },
          }),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('button', { name: /previous/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /next/i })).toBeVisible()
      await expect(page.getByText(/page 1 of 2/i)).toBeVisible()
    })

    test('navigates to next page', async ({ page }) => {
      await setupAuthAndMocks(page)

      let currentPage = 1
      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        const url = route.request().url()
        if (url.includes('page=2')) {
          currentPage = 2
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockApiBookings.slice(0, 2),
            meta: {
              total: 20,
              page: currentPage,
              limit: 10,
              totalPages: 2,
            },
          }),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /next/i }).click()
      await page.waitForLoadState('networkidle')

      await expect(page.getByText(/page 2 of 2/i)).toBeVisible()
    })

    test('disables previous button on first page', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockApiBookings.slice(0, 2),
            meta: {
              total: 20,
              page: 1,
              limit: 10,
              totalPages: 2,
            },
          }),
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('button', { name: /previous/i })).toBeDisabled()
    })

    test('does not show pagination for single page', async ({ page }) => {
      await setupAuthAndMocks(page)

      await page.route('**/v1/establishments/est-1/bookings**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPaginatedBookings), // totalPages: 1
        })
      })

      await page.goto('/establishments/est-1/bookings')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('button', { name: /previous/i })).not.toBeVisible()
      await expect(page.getByRole('button', { name: /next/i })).not.toBeVisible()
    })
  })
})
