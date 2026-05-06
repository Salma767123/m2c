'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/UI/LoadingSpinner'
import { qcCheckerService } from '@/services/qcCheckerService'

interface CheckerProtectedRouteProps {
  children: React.ReactNode
}

export default function CheckerProtectedRoute({ children }: CheckerProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = qcCheckerService.getCheckerToken()
        if (!token) {
          router.replace('/checker')
          return
        }
        setIsAuthorized(true)
      } catch (error) {
        console.error('CheckerProtectedRoute: Auth check error:', error)
        router.replace('/checker')
      } finally {
        setIsLoading(false)
      }
    }

    if (typeof window !== 'undefined') {
      checkAuth()
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}
