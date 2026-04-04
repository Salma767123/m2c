'use client'

import { useState } from 'react'
import VendorSidebar from '@/components/VendorDashboard/Sidebar/Sidebar'
import VendorHeader from '@/components/VendorDashboard/Header/Header'
import VendorFooter from '@/components/VendorDashboard/Footer/Footer'
import VendorProtectedRoute from '@/components/VendorDashboard/ProtectedRoute'
import { Toaster } from '@/components/UI/Toaster'
import { useStorageSync } from '@/hooks/useStorageSync'
import { useVendorStatusCheck } from '@/hooks/useVendorStatusCheck'
import VendorService from '@/services/vendorService'

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Multi-tab logout synchronization
  useStorageSync('vendorToken', () => {
    VendorService.logout()
  })

  // Periodic vendor status checking (every 60 seconds)
  useVendorStatusCheck(60000)

  return (
    <VendorProtectedRoute>
      <div className="flex h-screen bg-slate-50 font-sans">
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} fixed inset-y-0 left-0 z-50 w-64 transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
        >
          <VendorSidebar isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 transition-opacity lg:hidden z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <VendorHeader
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            isSidebarOpen={sidebarOpen}
          />

          <main className="flex-1 overflow-y-auto bg-slate-50">
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
          {/* <VendorFooter /> */}
        </div>
        <Toaster />
      </div>
    </VendorProtectedRoute>
  )
}