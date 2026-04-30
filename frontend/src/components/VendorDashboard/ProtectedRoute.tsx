'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/UI/LoadingSpinner'
import AuthError from '@/components/UI/AuthError'
import VendorService from '@/services/vendorService'
import {
  isVendorLoggedIn,
  getVendorData,
  isVendorSuspended,
  isVendorPending,
  isVendorRejected,
  clearVendorAuth
} from '@/lib/vendorAuth'
import { AUTH_ERRORS } from '@/constants/authErrors'

interface VendorProtectedRouteProps {
  children: React.ReactNode
}

export default function VendorProtectedRoute({ children }: VendorProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if vendor is logged in
        if (!isVendorLoggedIn()) {
          console.log('VendorProtectedRoute: No vendor login found')
          router.replace('/vendor')
          return
        }

        // Get stored vendor data
        const vendorData = getVendorData()

        if (!vendorData) {
          console.log('VendorProtectedRoute: No vendor data found')
          clearVendorAuth()
          router.replace('/vendor')
          return
        }

        // Check if vendor is suspended
        if (isVendorSuspended()) {
          setErrorMessage(AUTH_ERRORS.SUSPENDED_ACCOUNT)
          clearVendorAuth()
          setTimeout(() => {
            router.replace('/vendor?reason=suspended')
          }, 3000)
          return
        }

        // Check if vendor is pending approval
        if (isVendorPending()) {
          setErrorMessage(AUTH_ERRORS.PENDING_APPROVAL)
          setTimeout(() => {
            router.replace('/vendor?reason=pending')
          }, 3000)
          return
        }

        // Check if vendor is rejected
        if (isVendorRejected()) {
          setErrorMessage(AUTH_ERRORS.REJECTED_ACCOUNT)
          clearVendorAuth()
          setTimeout(() => {
            router.replace('/vendor?reason=rejected')
          }, 3000)
          return
        }

        // Verify token is still valid by making a test API call
        try {
          await VendorService.getVendorProfile()
          console.log('VendorProtectedRoute: Token validated successfully')
          setIsAuthorized(true)
        } catch (error: any) {
          console.error('VendorProtectedRoute: Token validation failed:', error)

          // Check if it's a 401/403 error (unauthorized)
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            setErrorMessage(AUTH_ERRORS.TOKEN_EXPIRED)
          } else {
            setErrorMessage(AUTH_ERRORS.UNKNOWN_ERROR)
          }

          clearVendorAuth()
          setTimeout(() => {
            router.replace('/vendor')
          }, 2000)
          return
        }

      } catch (error) {
        console.error('VendorProtectedRoute: Auth check error:', error)
        clearVendorAuth()
        router.replace('/vendor')
      } finally {
        setIsLoading(false)
      }
    }

    // Only run in browser environment
    if (typeof window !== 'undefined') {
      checkAuth()
    }
  }, [router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Show error message
  if (errorMessage) {
    return (
      <AuthError
        error={errorMessage}
        onGoToLogin={() => router.push('/vendor')}
        autoRedirect={true}
        redirectSeconds={3}
      />
    )
  }

  // Show nothing if not authorized (will redirect)
  if (!isAuthorized) {
    return null
  }

  // Render protected content
  return <>{children}</>
}
