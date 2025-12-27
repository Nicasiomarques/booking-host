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

/**
 * Generate a future date string (YYYY-MM-DD) for testing
 * @param daysFromNow - Number of days from today (default: 10)
 * @returns Date string in YYYY-MM-DD format
 */
export function futureDate(daysFromNow: number = 10): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString().split('T')[0]
}

/**
 * Generate a future date string for check-out (check-in + nights)
 * @param checkInDate - Check-in date string (YYYY-MM-DD)
 * @param nights - Number of nights to stay (default: 4)
 * @returns Check-out date string in YYYY-MM-DD format
 */
export function futureCheckOutDate(checkInDate: string, nights: number = 4): string {
  const date = new Date(checkInDate + 'T00:00:00.000Z')
  date.setDate(date.getDate() + nights)
  return date.toISOString().split('T')[0]
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
