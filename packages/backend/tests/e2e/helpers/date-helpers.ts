/**
 * Helper functions for date manipulation in tests
 */

/**
 * Get a date string N days from today
 */
export function dateDaysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(0, 0, 0, 0)
  return date.toISOString().split('T')[0]
}

/**
 * Get yesterday's date string
 */
export function yesterdayDate(): string {
  return dateDaysFromNow(-1)
}

/**
 * Get tomorrow's date string
 */
export function tomorrowDate(): string {
  return dateDaysFromNow(1)
}



