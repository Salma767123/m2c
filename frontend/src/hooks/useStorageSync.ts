import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Multi-Tab Storage Synchronization Hook
 * 
 * Listens for storage events (from other tabs) and triggers logout
 * when authentication token is removed in another tab.
 * 
 * @param storageKey - The localStorage key to monitor (e.g., 'vendorToken', 'adminToken')
 * @param onLogout - Callback function to execute when token is removed
 */
export function useStorageSync(storageKey: string, onLogout: () => void) {
  const router = useRouter()

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only handle changes to the specified key
      if (e.key !== storageKey) return
      
      // Check if the token was removed (newValue is null)
      if (e.newValue === null && e.oldValue !== null) {
        console.log(`useStorageSync: ${storageKey} removed in another tab, logging out`)
        
        // Execute logout callback
        onLogout()
        
        // Redirect to login page
        const loginPath = storageKey.includes('vendor') ? '/vendor/login' : '/admin/login'
        router.replace(loginPath)
      }
    }

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [storageKey, onLogout, router])
}
