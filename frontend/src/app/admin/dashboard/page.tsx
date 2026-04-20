'use client'

import { useEffect, Suspense, useState } from 'react'
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
import AdminDashboardService, { DashboardStats as IDashboardStats } from '@/services/adminDashboardService'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<IDashboardStats | null>(null)

  useEffect(() => {
    const initAuth = async () => {
      // Handle OAuth callback
      const token = searchParams.get('token')
      const userStr = searchParams.get('user')
      const error = searchParams.get('error')

      if (error) {
        showErrorToast('Authentication Failed', 'Google OAuth authentication failed. Please try again.')
        router.replace('/admin/login')
        setLoading(false)
        return
      }

      if (token && userStr) {
        try {
          const user = JSON.parse(decodeURIComponent(userStr))
          if (user.role !== 'admin') {
            showErrorToast('Access Denied', 'Only administrators can access this dashboard.')
            router.replace('/admin/login')
            setLoading(false)
            return
          }
          storeAuth(token, user, true)
          showSuccessToast('Login Successful', `Welcome back, ${user.name}!`)
          router.replace('/admin/dashboard')
        } catch (error) {
          console.error('Error parsing OAuth callback data:', error)
          showErrorToast('Authentication Error', 'Failed to process authentication data.')
          router.replace('/admin/login')
          setLoading(false)
          return
        }
      }

      // Fetch dashboard Data
      try {
        const data = await AdminDashboardService.getDashboardStats()
        setDashboardData(data)
      } catch (err: any) {
        if (!token && !searchParams.get('token')) {
          showErrorToast('Error', 'Failed to load dashboard data.')
        }
      } finally {
        setLoading(false)
      }
    }
    initAuth()
  }, [router, searchParams])

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg shadow-sm border border-gray-100 min-h-[400px]">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to load Dashboard data</h3>
        <p className="text-gray-500 mb-4">Please try refreshing the page or logging in again.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Refresh Page</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <DashboardStats summaryData={dashboardData.stats} />

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Earnings & Revenue Chart */}
        <EarningsChart earningsData={dashboardData.earningsData} />

        {/* Sales Report Pie Chart */}
        <SalesReportChart salesData={dashboardData.salesByCategory} />
      </div>

      {/* Main Content Grid - Row 1: Recent Orders & Top Selling Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div>
          <RecentOrders orders={dashboardData.recentOrders} />
        </div>

        {/* Top Selling Products */}
        <div>
          <TopSellingProducts products={dashboardData.topProducts} />
        </div>
      </div>

      {/* Main Content Grid - Row 2: Vendors, Products & Inventory */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recently Added Vendors */}
        <div className="lg:col-span-1">
          <RecentVendors vendors={dashboardData.recentVendors} />
        </div>

        {/* Vendor Recent Products */}
        <div className="lg:col-span-1">
          <VendorRecentProducts products={dashboardData.recentProducts} />
        </div>

        {/* Recent Inventory Restocks */}
        <div className="lg:col-span-1">
          <VendorInventoryRestock restocks={dashboardData.recentRestocks} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <PermissionGuard permission="view_dashboard">
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
    </PermissionGuard>
  )
}