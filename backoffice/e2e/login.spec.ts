import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test.describe('UI Components', () => {
    test('renders login form with all required elements', async ({ page }) => {
      await page.goto('/login')

      await expect(page).toHaveTitle(/Booking/)
      await expect(page.getByRole('heading', { name: /booking/i })).toBeVisible()
      await expect(page.getByText(/sign in to your account/i)).toBeVisible()
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('applies DaisyUI theme correctly', async ({ page }) => {
      await page.goto('/login')

      const html = page.locator('html')
      await expect(html).toHaveAttribute('data-theme', 'light')
    })

    test('input accepts text', async ({ page }) => {
      await page.goto('/login')

      const emailInput = page.getByLabel(/email/i)
      await emailInput.fill('test@example.com')
      await expect(emailInput).toHaveValue('test@example.com')
    })

    test('button shows loading state during API call', async ({ page }) => {
      await page.route('**/v1/auth/login', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'Invalid credentials' } }),
        })
      })

      await page.goto('/login')

      await page.getByLabel(/email/i).fill('test@example.com')
      await page.getByLabel(/password/i).fill('password123')

      const submitButton = page.getByRole('button', { name: /sign in/i })
      await submitButton.click()

      await expect(submitButton.locator('.loading')).toBeVisible()
    })
  })

  test.describe('Form Validation', () => {
    test('shows error for empty email', async ({ page }) => {
      await page.goto('/login')

      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByText(/invalid email/i)).toBeVisible()
    })

    test('shows error for empty password', async ({ page }) => {
      await page.goto('/login')

      await page.getByLabel(/email/i).fill('test@example.com')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByText(/password is required/i)).toBeVisible()
    })
  })

  test.describe('Authentication Flow', () => {
    test('successful login redirects to dashboard', async ({ page }) => {
      await page.route('**/v1/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'mock-jwt-token-12345',
            user: {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
              establishmentRoles: [{ establishmentId: 'est-1', role: 'OWNER' }],
            },
          }),
        })
      })

      await page.goto('/login')

      await page.getByLabel(/email/i).fill('test@example.com')
      await page.getByLabel(/password/i).fill('correctpassword')
      await page.getByRole('button', { name: /sign in/i }).click()

      await page.waitForURL('/', { timeout: 5000 })
      await expect(page.getByText(/dashboard|welcome/i).first()).toBeVisible()
    })

    test('failed login shows error message', async ({ page }) => {
      await page.route('**/v1/auth/login', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
          }),
        })
      })

      await page.goto('/login')

      await page.getByLabel(/email/i).fill('test@example.com')
      await page.getByLabel(/password/i).fill('wrongpassword')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page).toHaveURL(/login/)
      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page.getByText(/invalid email or password/i)).toBeVisible()
    })

    test('redirects logged-in user away from login page', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('accessToken', 'existing-token')
      })

      await page.reload()

      await page.waitForURL('/', { timeout: 5000 })
    })
  })
})

test.describe('Routing', () => {
  test('shows 404 for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-that-does-not-exist')

    await expect(page.getByText(/404|not found/i).first()).toBeVisible()
  })

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/')

    await page.waitForURL(/login/, { timeout: 5000 })
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })
})
