'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardStats from '@/components/AdminDashboard/Dashboard/DashboardStats'
import EarningsChart from '@/components/AdminDashboard/Dashboard/EarningsChart'
import SalesReportChart from '@/components/AdminDashboard/Dashboard/SalesReportChart'
import RecentOrders from '@/components/AdminDashboard/Dashboard/RecentOrders'
import TopSellingProducts from '@/components/AdminDashboard/Dashboard/TopSellingProducts'
import VendorRecentProducts from '@/components/AdminDashboard/Dashboard/VendorRecentProducts'
import RecentVendors from '@/components/AdminDashboard/Dashboard/RecentVendors'
import VendorInventoryRestock from '@/components/AdminDashboard/Dashboard/VendorInventoryRestock'
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
      {/* Stats Cards */}
      <DashboardStats />

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Earnings & Revenue Chart */}
        <EarningsChart />

        {/* Sales Report Pie Chart */}
        <SalesReportChart />
      </div>

      {/* Main Content Grid - Row 1: Recent Orders & Top Selling Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div>
          <RecentOrders />
        </div>

        {/* Top Selling Products */}
        <div>
          <TopSellingProducts />
        </div>
      </div>

      {/* Main Content Grid - Row 2: Vendors, Products & Inventory */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recently Added Vendors */}
        <div className="lg:col-span-1">
          <RecentVendors />
        </div>

        {/* Vendor Recent Products */}
        <div className="lg:col-span-1">
          <VendorRecentProducts />
        </div>

        {/* Recent Inventory Restocks */}
        <div className="lg:col-span-1">
          <VendorInventoryRestock />
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