import { useEffect, useState } from 'react'
import VendorService from '@/services/vendorService'
import { useRouter } from 'next/navigation'
import { clearVendorAuth } from '@/lib/vendorAuth'

/**
 * Vendor Status Check Hook
 * 
 * Periodically checks vendor status to detect account suspension or status changes.
 * Automatically logs out vendor if account is suspended.
 * 
 * @param intervalMs - Check interval in milliseconds (default: 60000 = 1 minute)
 * @returns Current vendor status or null
 */
export function useVendorStatusCheck(intervalMs: number = 60000) {
  const [status, setStatus] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { vendor } = await VendorService.getVendorProfile()

        // If status changed to suspended, logout immediately
        if (vendor.status === 'SUSPENDED') {
          console.log('useVendorStatusCheck: Vendor suspended, logging out')
          clearVendorAuth()
          VendorService.logout()
          router.replace('/vendor?reason=suspended')
          return
        }

        // If status changed to rejected, logout
        if (vendor.status === 'REJECTED') {
          console.log('useVendorStatusCheck: Vendor rejected, logging out')
          clearVendorAuth()
          VendorService.logout()
          router.replace('/vendor?reason=rejected')
          return
        }

        setStatus(vendor.status)
      } catch (error) {
        console.error('useVendorStatusCheck: Status check failed:', error)
        // Don't logout on network errors, just log the error
      }
    }

    // Check immediately on mount
    checkStatus()

    // Set up periodic checking
    const interval = setInterval(checkStatus, intervalMs)

    // Cleanup on unmount
    return () => clearInterval(interval)
  }, [intervalMs, router])

  return status
}
