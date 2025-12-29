import { describe, it, expect } from 'vitest'
import { dateRangeSchema } from '../../src/shared/adapters/http/schemas/common.schema.js'

describe('Date Range Schema', () => {
  describe('dateRangeSchema validation', () => {
    it.each([
      ['startDate before endDate', {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      }, (result: any) => {
        expect(result.data.startDate).toBeInstanceOf(Date)
        expect(result.data.endDate).toBeInstanceOf(Date)
      }],
      ['startDate equals endDate', (() => {
        const sameDate = new Date('2025-01-15')
        return { startDate: sameDate, endDate: sameDate }
      })(), () => {}],
      ['only startDate provided', { startDate: new Date('2025-01-01') }, () => {}],
      ['only endDate provided', { endDate: new Date('2025-01-31') }, () => {}],
      ['no dates provided', {}, () => {}],
    ])('valid date range - %s - passes validation', (_, validData, assertFn) => {
      const result = dateRangeSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        assertFn(result)
      }
    })

    it('invalid date range - startDate after endDate - fails validation', () => {
      const invalidData = {
        startDate: new Date('2025-01-31'),
        endDate: new Date('2025-01-01'),
      }

      const result = dateRangeSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('startDate must be before endDate')
      }
    })
  })
})

