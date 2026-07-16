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
 * Format an order amount for admin/back-office screens.
 *
 * `charged` is the source of truth: it is what the customer's card was actually
 * debited, what a refund must be issued in, and what the payment gateway reconciles
 * against. It is never converted away.
 *
 * `inrEquivalent` is a reporting convenience for USD orders only — the business
 * settles vendors, files GST and reports revenue in INR, so admins need a common
 * unit to compare a .in order against a .com one. It is deliberately derived from
 * the rate SNAPSHOT stored on the order (Order.exchangeRate), never the live rate:
 * ExchangeRate holds one mutable row, so using today's rate would make a past
 * order's INR value drift every time an admin edits it.
 *
 * Returns null for inrEquivalent when no conversion applies (INR orders) or when
 * the order predates the snapshot — showing nothing beats inventing a number.
 */
export function formatOrderAmount(
  amount: number,
  currency?: string | null,
  exchangeRate?: number | null
): { charged: string; inrEquivalent: string | null } {
  const c: Currency = currency === 'USD' ? 'USD' : 'INR'
  const charged = formatPrice(amount, c)
  if (c !== 'USD' || !exchangeRate || exchangeRate <= 0) {
    return { charged, inrEquivalent: null }
  }
  return { charged, inrEquivalent: formatPrice(amount * exchangeRate, 'INR') }
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
 * Convert USD to INR using the cached exchange rate.
 * Fallback: 83.50 — the same default the server applies.
 *
 * Used to tell a USD shopper what they'll actually be billed: the Razorpay
 * account settles in INR, so paymentController converts the order total
 * before creating the payment. Both sides read the same ExchangeRate row
 * (and the same 83.50 fallback), so this figure matches the real charge —
 * but the server's value is the authoritative one.
 */
export function convertUSDtoINR(usdPrice: number): number {
  const rate = cachedExchangeRate || 83.50
  return Math.round(usdPrice * rate * 100) / 100
}

/**
 * Pick the correct price based on region.
 * Priority: priceINR/priceUSD → adminFixedPrice → basePrice
 * For US: if priceUSD missing, auto-convert from INR using exchange rate
 */
export function getRegionalPrice(product: {
  basePrice?: number;
  // Variants are passed in here too, and they store the vendor price as `price`
  // (Product.basePrice vs ProductVariant.price). Without this the vendor price is
  // invisible to the fallback chain and an admin-unpriced variant resolves to 0.
  price?: number;
  adminFixedPrice?: number | null;
  priceINR?: number | null;
  priceUSD?: number | null;
}): number {
  const region = getRegion()
  const inrPrice = product.priceINR || product.adminFixedPrice || product.basePrice || product.price || 0
  if (region === 'IN') {
    return inrPrice
  }
  // US region: use priceUSD if set, otherwise auto-convert INR
  if (product.priceUSD) return product.priceUSD
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
