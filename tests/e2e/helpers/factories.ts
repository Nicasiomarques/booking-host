let emailCounter = 0

export function uniqueEmail(prefix = 'user'): string {
  emailCounter++
  return `${prefix}-${Date.now()}-${emailCounter}@example.com`
}

export function defaultUserData(overrides: Partial<{ email: string; password: string; name: string }> = {}) {
  return {
    email: uniqueEmail(),
    password: 'Test1234!',
    name: 'Test User',
    ...overrides,
  }
}

export function defaultServiceData(
  overrides: Partial<{
    name: string
    basePrice: number
    durationMinutes: number
    capacity: number
  }> = {}
) {
  return {
    name: 'Test Service',
    basePrice: 50,
    durationMinutes: 60,
    capacity: 1,
    ...overrides,
  }
}

export function defaultAvailabilityData(
  overrides: Partial<{
    date: string
    startTime: string
    endTime: string
    capacity: number
  }> = {}
) {
  return {
    date: '2025-02-15',
    startTime: '09:00',
    endTime: '10:00',
    capacity: 5,
    ...overrides,
  }
}
