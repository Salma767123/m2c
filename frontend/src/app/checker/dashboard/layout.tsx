'use client'

import { useState } from 'react'
import Header from '@/components/Checker/CheckerHeader/CheckerHeader'
import Sidebar from '@/components/Checker/CheckerSidebar/CheckerSidebar'
import Footer from '@/components/Checker/CheckerFooter/CheckerFooter'
import { Toaster } from '@/components/UI/Toaster'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity lg:hidden z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden bg-gray-50">
        {/* Header */}
        <Header onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="p-6">
            {children}
          </div>
        </main>

        {/* Footer */}
        {/* <Footer /> */}
      </div>
      <Toaster />
    </div>
  )
}