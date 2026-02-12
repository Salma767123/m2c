'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { userAuthService } from '@/services/userAuthService'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

export default function GoogleAuthSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Handle Google OAuth callback
    const token = searchParams.get('token')
    const userStr = searchParams.get('user')

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr))
        
        // Determine redirect based on role
        const isAdmin = user.role === 'admin'
        
        if (isAdmin) {
          // Admin users should go to admin dashboard
          localStorage.setItem('adminToken', token)
          localStorage.setItem('adminUser', JSON.stringify(user))
          
          showSuccessToast('Login Successful', `Welcome, ${user.name}!`)
          router.replace('/admin/dashboard')
        } else {
          // Regular users go to home page
          userAuthService.storeAuthData(token, user, true)
          
          showSuccessToast('Login Successful', `Welcome, ${user.name}!`)
          router.replace('/')
        }
      } catch (error) {
        console.error('Error parsing Google OAuth callback data:', error)
        showErrorToast('Authentication Error', 'Failed to process authentication data.')
        router.replace('/login')
      }
    } else {
      // No token or user data, redirect to login
      showErrorToast('Authentication Failed', 'No authentication data received.')
      router.replace('/login')
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg font-medium mb-2">Completing Google Sign-In...</p>
        <p className="text-gray-500 text-sm">Please wait while we redirect you</p>
      </div>
    </div>
  )
}
