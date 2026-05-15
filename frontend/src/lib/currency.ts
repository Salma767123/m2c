export type Region = 'IN' | 'US'
export type Currency = 'INR' | 'USD'

// Cached exchange rate — fetched once, used for client-side fallback conversion
let cachedExchangeRate: number | null = null

export function getRegion(): Region {
  const envRegion = process.env.NEXT_PUBLIC_SITE_REGION
  if (envRegion === 'IN' || envRegion === 'US') return envRegion

  if (typeof window !== 'undefined') {
    if (window.location.hostname.endsWith('.in')) return 'IN'
  }
  return 'US'
}

export function getCurrency(): Currency {
  return getRegion() === 'IN' ? 'INR' : 'USD'
}

export function getCurrencySymbol(): string {
  return getCurrency() === 'INR' ? '₹' : '$'
}

export function formatPrice(price: number, currency?: Currency): string {
  const c = currency || getCurrency()
  return new Intl.NumberFormat(c === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: c,
    minimumFractionDigits: 2,
  }).format(price)
}

/**
 * Set the cached exchange rate (called once on app load).
 */
export function setExchangeRate(rate: number): void {
  cachedExchangeRate = rate
}

/**
 * Convert INR to USD using cached exchange rate.
 * Fallback: 83.50 if no rate loaded.
 */
export function convertINRtoUSD(inrPrice: number): number {
  const rate = cachedExchangeRate || 83.50
  return Math.round((inrPrice / rate) * 100) / 100
}

/**
 * Pick the correct price based on region.
 * Priority: priceINR/priceUSD → adminFixedPrice → basePrice
 * For US: if priceUSD missing, auto-convert from INR using exchange rate
 */
export function getRegionalPrice(product: {
  basePrice?: number;
  adminFixedPrice?: number | null;
  priceINR?: number | null;
  priceUSD?: number | null;
}): number {
  const region = getRegion()
  if (region === 'IN') {
    return product.priceINR || product.adminFixedPrice || product.basePrice || 0
  }
  // US region: use priceUSD if set, otherwise auto-convert INR
  if (product.priceUSD) return product.priceUSD
  const inrPrice = product.priceINR || product.adminFixedPrice || product.basePrice || 0
  return inrPrice > 0 ? convertINRtoUSD(inrPrice) : 0
}

/**
 * Pick the correct original price based on region.
 * For US: auto-convert from INR if USD not set
 */
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
