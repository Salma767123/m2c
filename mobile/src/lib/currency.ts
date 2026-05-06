export type Region = 'IN' | 'US'
export type Currency = 'INR' | 'USD'

export function getRegion(): Region {
  const envRegion = process.env.EXPO_PUBLIC_SITE_REGION
  if (envRegion === 'IN' || envRegion === 'US') return envRegion
  return 'US' // default
}

export function getCurrency(): Currency {
  return getRegion() === 'IN' ? 'INR' : 'USD'
}

export function formatPrice(price: number, currency?: Currency): string {
  const c = currency || getCurrency()
  return c === 'INR'
    ? `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : `$${price.toFixed(2)}`
}

/**
 * Pick the correct price based on region.
 * Priority: priceINR/priceUSD → adminFixedPrice → basePrice/price
 */
export function getRegionalPrice(product: {
  basePrice?: number;
  price?: number;
  adminFixedPrice?: number | null;
  priceINR?: number | null;
  priceUSD?: number | null;
}): number {
  const region = getRegion()
  if (region === 'IN' && product.priceINR) return product.priceINR
  if (region === 'US' && product.priceUSD) return product.priceUSD
  return product.adminFixedPrice ?? product.basePrice ?? product.price ?? 0
}

export function getRegionalOriginalPrice(product: {
  originalPrice?: number | null;
  originalPriceINR?: number | null;
  originalPriceUSD?: number | null;
}): number | null {
  const region = getRegion()
  if (region === 'IN' && product.originalPriceINR) return product.originalPriceINR
  if (region === 'US' && product.originalPriceUSD) return product.originalPriceUSD
  return product.originalPrice ?? null
}
