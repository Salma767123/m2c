'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardStats from '@/components/AdminDashboard/Dashboard/DashboardStats'
import RecentActivity from '@/components/AdminDashboard/Dashboard/RecentActivity'
import VendorsTable from '@/components/AdminDashboard/Vendors/VendorsTable'
import { storeAuth } from '@/lib/auth'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Handle OAuth callback
    const token = searchParams.get('token')
    const userStr = searchParams.get('user')
    const error = searchParams.get('error')

    if (error) {
      showErrorToast('Authentication Failed', 'Google OAuth authentication failed. Please try again.')
      router.replace('/admin/login')
      return
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr))
        
        if (user.role !== 'admin') {
          showErrorToast('Access Denied', 'Only administrators can access this dashboard.')
          router.replace('/admin/login')
          return
        }

        // Store authentication data
        storeAuth(token, user, true) // Remember OAuth logins
        showSuccessToast('Login Successful', `Welcome back, ${user.name}!`)
        
        // Clean up URL
        router.replace('/admin/dashboard')
      } catch (error) {
        console.error('Error parsing OAuth callback data:', error)
        showErrorToast('Authentication Error', 'Failed to process authentication data.')
        router.replace('/admin/login')
      }
    }
  }, [router, searchParams])

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* Stats Cards */}
        <DashboardStats />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <RecentActivity />
          </div>

          {/* Vendors Table */}
          <div className="lg:col-span-2">
            <VendorsTable />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}