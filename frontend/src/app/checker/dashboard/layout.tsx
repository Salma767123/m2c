'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Checker/CheckerHeader/CheckerHeader'
import Sidebar from '@/components/Checker/CheckerSidebar/CheckerSidebar'
import CheckerProtectedRoute from '@/components/Checker/CheckerProtectedRoute'
import { Toaster } from '@/components/UI/Toaster'
import { CenterNoticeHost } from '@/components/UI/CenterNotice'
import { NotificationProvider } from '@/components/Shared/NotificationProvider'

const COLLAPSE_KEY = 'checker_sidebar_collapsed'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Restore persisted collapse state after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY)
    if (stored === 'true') setIsCollapsed(true)
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, String(next))
      return next
    })
  }

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev)

  return (
    <CheckerProtectedRoute>
      <NotificationProvider>
        <div className="flex h-screen bg-slate-50 font-sans">

          {/* Sidebar */}
          <div
            className={[
              'fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out',
              // mobile: slide in/out
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
              // desktop: always visible, width follows collapse state
              isCollapsed ? 'lg:w-20' : 'lg:w-64',
              'lg:translate-x-0 lg:static lg:inset-0',
            ].join(' ')}
          >
            <Sidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
          </div>

          {/* Mobile overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 transition-opacity lg:hidden z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Main content */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />

            <main className="flex-1 overflow-y-auto bg-white">
              <div className="p-6">
                {children}
              </div>
            </main>
          </div>

          <Toaster />
          <CenterNoticeHost />
        </div>
      </NotificationProvider>
    </CheckerProtectedRoute>
  )
}
