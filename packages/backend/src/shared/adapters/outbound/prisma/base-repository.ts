import { Prisma } from '@prisma/client'

/**
 * Repository utilities for common Prisma operations
 * These helpers reduce code duplication across repositories
 */

/**
 * Convert Prisma Decimal to string
 * Handles Prisma.Decimal, string, number, null, and undefined
 */
export function decimalToString(value: Prisma.Decimal | string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Prisma.Decimal) return value.toString()
  if (typeof value === 'string') return value
  return value.toString()
}

/**
 * Convert string/number to Prisma Decimal
 * Returns undefined if value is null or undefined
 */
export function toDecimal(value: string | number | null | undefined): Prisma.Decimal | undefined {
  if (value === null || value === undefined) return undefined
  return new Prisma.Decimal(value)
}

/**
 * Handle Prisma array fields for CREATE operations
 * Converts empty arrays to Prisma.DbNull, null/undefined to Prisma.JsonNull
 */
export function handleArrayFieldForCreate<T>(value: T[] | null | undefined): T[] | typeof Prisma.DbNull | typeof Prisma.JsonNull {
  if (value === null || value === undefined) return Prisma.JsonNull
  return value.length > 0 ? value : Prisma.DbNull
}

/**
 * Handle Prisma array fields for UPDATE operations
 * Converts empty arrays to Prisma.DbNull, null/undefined to undefined (skip field)
 */
export function handleArrayFieldForUpdate<T>(value: T[] | null | undefined): T[] | typeof Prisma.DbNull | undefined {
  if (value === null || value === undefined) return undefined
  return value.length > 0 ? value : Prisma.DbNull
}

/**
 * Create a soft delete update data object
 * Sets the active field to false
 */
export function createSoftDeleteData() {
  return { active: false }
}

/**
 * Process update data for Prisma operations
 * Automatically converts Decimal fields and array fields
 */
export function processUpdateData<T extends Record<string, any>>(
  data: Partial<T>,
  options: {
    decimalFields?: Array<keyof T>
    arrayFields?: Array<keyof T>
  } = {}
): Partial<T> {
  const processed: any = { ...data }

  // Process decimal fields
  if (options.decimalFields) {
    for (const field of options.decimalFields) {
      if (field in processed && processed[field] !== undefined) {
        processed[field] = toDecimal(processed[field])
      }
    }
  }

  // Process array fields
  if (options.arrayFields) {
    for (const field of options.arrayFields) {
      if (field in processed && processed[field] !== undefined) {
        processed[field] = handleArrayFieldForUpdate(processed[field])
      }
    }
  }

  return processed
}

