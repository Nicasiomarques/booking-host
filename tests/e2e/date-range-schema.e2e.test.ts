import { describe, it, expect } from 'vitest'
import { dateRangeSchema } from '../../src/adapters/inbound/http/schemas/common.schema.js'

describe('Date Range Schema', () => {
  describe('dateRangeSchema validation', () => {
    it('valid date range - startDate before endDate - passes validation', () => {
      // Arrange
      const validData = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      }

      // Act
      const result = dateRangeSchema.safeParse(validData)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.startDate).toBeInstanceOf(Date)
        expect(result.data.endDate).toBeInstanceOf(Date)
      }
    })

    it('valid date range - startDate equals endDate - passes validation', () => {
      // Arrange
      const sameDate = new Date('2025-01-15')
      const validData = {
        startDate: sameDate,
        endDate: sameDate,
      }

      // Act
      const result = dateRangeSchema.safeParse(validData)

      // Assert
      expect(result.success).toBe(true)
    })

    it('invalid date range - startDate after endDate - fails validation', () => {
      // Arrange
      const invalidData = {
        startDate: new Date('2025-01-31'),
        endDate: new Date('2025-01-01'),
      }

      // Act
      const result = dateRangeSchema.safeParse(invalidData)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('startDate must be before endDate')
      }
    })

    it('valid - only startDate provided - passes validation', () => {
      // Arrange
      const validData = {
        startDate: new Date('2025-01-01'),
      }

      // Act
      const result = dateRangeSchema.safeParse(validData)

      // Assert
      expect(result.success).toBe(true)
    })

    it('valid - only endDate provided - passes validation', () => {
      // Arrange
      const validData = {
        endDate: new Date('2025-01-31'),
      }

      // Act
      const result = dateRangeSchema.safeParse(validData)

      // Assert
      expect(result.success).toBe(true)
    })

    it('valid - no dates provided - passes validation', () => {
      // Arrange
      const validData = {}

      // Act
      const result = dateRangeSchema.safeParse(validData)

      // Assert
      expect(result.success).toBe(true)
    })
  })
})

