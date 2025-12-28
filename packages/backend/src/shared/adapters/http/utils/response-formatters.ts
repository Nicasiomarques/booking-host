/**
 * Utility functions for formatting API responses
 * Handles conversion of Prisma Decimal to number and Date to string
 */

/**
 * Formats a date value to YYYY-MM-DD string format
 * Handles Date objects, ISO strings, and date strings
 */
export function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null
  if (date instanceof Date) {
    return date.toISOString().split('T')[0]
  }
  if (typeof date === 'string' && date.includes('T')) {
    return date.split('T')[0]
  }
  return date
}

/**
 * Converts Prisma Decimal (string) or number to number
 * Returns null if value is null or undefined
 */
export function formatDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  return typeof value === 'string' ? parseFloat(value) : value
}

/**
 * Formats a service response by converting basePrice from Decimal to number
 */
export function formatServiceResponse<T extends { basePrice: string | number }>(service: T) {
  return {
    ...service,
    basePrice: formatDecimal(service.basePrice) ?? 0,
  }
}

/**
 * Formats an availability response by converting date and price
 */
export function formatAvailabilityResponse<T extends { 
  date: Date | string
  price?: string | number | null 
}>(availability: T) {
  return {
    ...availability,
    date: formatDate(availability.date) ?? '',
    price: formatDecimal(availability.price),
  }
}

