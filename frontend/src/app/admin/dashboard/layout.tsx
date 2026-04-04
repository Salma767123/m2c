'use client'

import { useState } from 'react'
import Header from '@/components/AdminDashboard/Header/Header'
import Sidebar from '@/components/AdminDashboard/Sidebar/Sidebar'
import Footer from '@/components/AdminDashboard/Footer/Footer'
import ProtectedRoute from '@/components/AdminDashboard/ProtectedRoute'
import { useStorageSync } from '@/hooks/useStorageSync'
import { clearAuth } from '@/lib/auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Multi-tab logout synchronization
  useStorageSync('adminToken', () => {
    clearAuth()
  })

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-50 font-sans">
        {/* Sidebar */}
        <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} fixed inset-y-0 left-0 z-50 w-64 transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-slate-50">
            <div className="p-4 sm:p-6 lg:p-8 max-w-420 mx-auto">
              {children}
            </div>
          </main>

          {/* Footer */}
          {/* <Footer /> */}
        </div>
      </div>
    </ProtectedRoute>
  )
}
