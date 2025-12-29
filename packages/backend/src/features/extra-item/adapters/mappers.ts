import { formatDecimal } from '#shared/adapters/http/utils/response-formatters.js'

/**
 * Formats an extra item response by converting price from Decimal to number
 */
export function formatExtraItemResponse<T extends { price: string | number }>(extra: T) {
  return {
    ...extra,
    price: formatDecimal(extra.price) ?? 0,
  }
}
