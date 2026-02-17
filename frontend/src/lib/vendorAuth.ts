import VendorService, { VendorProfile } from '@/services/vendorService'

/**
 * Vendor Authentication Utilities
 * 
 * Centralized authentication functions for vendor dashboard.
 * Provides consistent token and data management across vendor features.
 */

// Storage keys
const VENDOR_TOKEN_KEY = 'vendorToken'
const VENDOR_DATA_KEY = 'vendorData'

/**
 * Get vendor authentication token from localStorage
 * @returns Vendor token string or null if not found
 */
export function getVendorToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(VENDOR_TOKEN_KEY)
}

/**
 * Get vendor profile data from localStorage
 * @returns Parsed vendor profile or null if not found/invalid
 */
export function getVendorData(): VendorProfile | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(VENDOR_DATA_KEY)
  if (!data) return null
  
  try {
    const parsed = JSON.parse(data)
    // Validate required fields
    if (!parsed || !parsed.id || !parsed.status) {
      console.warn('Invalid vendor data structure in localStorage')
      return null
    }
    return parsed
  } catch (error) {
    console.error('Failed to parse vendor data from localStorage:', error)
    return null
  }
}

/**
 * Check if vendor is currently logged in
 * @returns True if valid token and data exist
 */
export function isVendorLoggedIn(): boolean {
  const token = getVendorToken()
  const data = getVendorData()
  return !!(token && data && data.id)
}

/**
 * Check if vendor account is suspended
 * @returns True if vendor status is SUSPENDED
 */
export function isVendorSuspended(): boolean {
  const data = getVendorData()
  return data?.status === 'SUSPENDED'
}

/**
 * Check if vendor account is approved
 * @returns True if vendor status is APPROVED
 */
export function isVendorApproved(): boolean {
  const data = getVendorData()
  return data?.status === 'APPROVED'
}

/**
 * Check if vendor account is pending approval
 * @returns True if vendor status is PENDING
 */
export function isVendorPending(): boolean {
  const data = getVendorData()
  return data?.status === 'PENDING'
}

/**
 * Check if vendor account is rejected
 * @returns True if vendor status is REJECTED
 */
export function isVendorRejected(): boolean {
  const data = getVendorData()
  return data?.status === 'REJECTED'
}

/**
 * Clear all vendor authentication data from localStorage
 */
export function clearVendorAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(VENDOR_TOKEN_KEY)
  localStorage.removeItem(VENDOR_DATA_KEY)
}

/**
 * Store vendor authentication data in localStorage
 * @param token - JWT authentication token
 * @param vendorData - Vendor profile data
 */
export function storeVendorAuth(token: string, vendorData: VendorProfile): void {
  if (typeof window === 'undefined') return
  
  if (!token || typeof token !== 'string') {
    console.error('Invalid token provided to storeVendorAuth')
    return
  }
  
  if (!vendorData || !vendorData.id) {
    console.error('Invalid vendor data provided to storeVendorAuth')
    return
  }
  
  localStorage.setItem(VENDOR_TOKEN_KEY, token)
  localStorage.setItem(VENDOR_DATA_KEY, JSON.stringify(vendorData))
}

/**
 * Get authorization headers for API requests
 * @returns Object with Authorization header
 * @throws Error if no token is found
 */
export function getVendorAuthHeaders(): Record<string, string> {
  const token = getVendorToken()
  if (!token) {
    throw new Error('No vendor authentication token found')
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

/**
 * Validate token format (basic JWT structure check)
 * @param token - Token string to validate
 * @returns True if token has valid JWT format
 */
export function isValidVendorToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false
  
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.')
  if (parts.length !== 3) return false
  
  // Each part should be non-empty
  return parts.every(part => part.length > 0)
}

/**
 * Get vendor status display text
 * @returns Human-readable status text
 */
export function getVendorStatusText(): string {
  const data = getVendorData()
  if (!data) return 'Not Logged In'
  
  switch (data.status) {
    case 'APPROVED':
      return 'Active'
    case 'PENDING':
      return 'Pending Approval'
    case 'SUSPENDED':
      return 'Suspended'
    case 'REJECTED':
      return 'Rejected'
    default:
      return data.status
  }
}

/**
 * Check if vendor can access dashboard
 * @returns True if vendor is approved and logged in
 */
export function canAccessDashboard(): boolean {
  return isVendorLoggedIn() && isVendorApproved()
}
