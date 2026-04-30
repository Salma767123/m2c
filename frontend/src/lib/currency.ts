export type Region = 'IN' | 'US'
export type Currency = 'INR' | 'USD'

export function getRegion(): Region {
  // Env var (set per Vercel deployment) takes priority
  const envRegion = process.env.NEXT_PUBLIC_SITE_REGION
  if (envRegion === 'IN' || envRegion === 'US') return envRegion

  // Fallback: check hostname
  if (typeof window !== 'undefined') {
    if (window.location.hostname.endsWith('.in')) return 'IN'
  }
  return 'US' // default
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
