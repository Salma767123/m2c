export type Region = 'IN' | 'US'
export type Currency = 'INR' | 'USD'

let cachedExchangeRate: number | null = null

export function getRegion(): Region {
  const envRegion = process.env.EXPO_PUBLIC_SITE_REGION
  if (envRegion === 'IN' || envRegion === 'US') return envRegion
  return 'US'
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

export function setExchangeRate(rate: number): void {
  cachedExchangeRate = rate
}

export function convertINRtoUSD(inrPrice: number): number {
  const rate = cachedExchangeRate || 83.50
  return Math.round((inrPrice / rate) * 100) / 100
}

/**
 * Pick the correct price based on region.
 * For US: auto-convert from INR if priceUSD not set
 */
export function getRegionalPrice(product: {
  basePrice?: number;
  price?: number;
  adminFixedPrice?: number | null;
  priceINR?: number | null;
  priceUSD?: number | null;
}): number {
  const region = getRegion()
  if (region === 'IN') {
    return product.priceINR || product.adminFixedPrice || product.basePrice || product.price || 0
  }
  if (product.priceUSD) return product.priceUSD
  const inrPrice = product.priceINR || product.adminFixedPrice || product.basePrice || product.price || 0
  return inrPrice > 0 ? convertINRtoUSD(inrPrice) : 0
}

export function getRegionalOriginalPrice(product: {
  originalPrice?: number | null;
  originalPriceINR?: number | null;
  originalPriceUSD?: number | null;
}): number | null {
  const region = getRegion()
  if (region === 'IN') {
    return product.originalPriceINR || product.originalPrice || null
  }
  if (product.originalPriceUSD) return product.originalPriceUSD
  const inrOriginal = product.originalPriceINR || product.originalPrice
  return inrOriginal ? convertINRtoUSD(inrOriginal) : null
}

/**
 * Check if a product is visible in the current region.
 */
export function isVisibleInRegion(priceVisibility?: string): boolean {
  if (!priceVisibility || priceVisibility === 'BOTH') return true
  const region = getRegion()
  if (region === 'IN' && priceVisibility === 'IN_ONLY') return true
  if (region === 'US' && priceVisibility === 'COM_ONLY') return true
  return false
}
