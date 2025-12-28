export function formatExtraItemResponse<T extends { price: string | number }>(extra: T) {
  return {
    ...extra,
    price: typeof extra.price === 'string' ? parseFloat(extra.price) : extra.price,
  }
}

