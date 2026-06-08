'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import NotificationDropdown from '@/components/Shared/NotificationDropdown'
import {
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  MessageSquare,
  Shield,
  LayoutDashboard,
  Factory,
  FileText,
  Users,
  Phone,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { qcCheckerService } from '@/services/qcCheckerService'

interface HeaderProps {
  onMenuToggle?: () => void
  isSidebarOpen?: boolean
}

export default function Header({ onMenuToggle, isSidebarOpen = true }: HeaderProps) {
  // Notifications handled by NotificationDropdown component
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [checkerName, setCheckerName] = useState('Quality Inspector')
  const pathname = usePathname()
  const router = useRouter()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const data = qcCheckerService.getCheckerData()
    if (data?.name) setCheckerName(data.name)
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  // Map pathnames to titles and icons
  const getPageInfo = () => {
    const pageMap: Record<string, { title: string; icon: React.ComponentType<any> }> = {
      '/checker/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
      '/checker/dashboard/vendors': { title: 'Vendors', icon: Factory },
      '/checker/dashboard/report': { title: 'Reports', icon: FileText },
      '/checker/dashboard/settings': { title: 'Settings', icon: Settings },
    }

    return pageMap[pathname] || { title: 'Dashboard', icon: LayoutDashboard }
  }

  const { title, icon: PageIcon } = getPageInfo()

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 font-sans">
      {/* Thin brand-red accent line */}
      <div className="h-1 bg-brand-500" />

      <div className="px-6 py-3.5 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="lg:hidden text-slate-600 hover:bg-slate-100"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Page Title with Icon */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-50 rounded-lg">
              <PageIcon className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{title}</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500">Quality Control Portal</p>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Support call button styled like registration support phone button */}
          <a
            href="tel:+919876543210"
            className="hidden md:inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-full px-3.5 py-2 transition-colors duration-150 shadow-xs shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            title="Call Support"
          >
            <Phone className="w-3.5 h-3.5" />
            +91 98765 43210
          </a>

          {/* Notifications */}
          <NotificationDropdown />

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
            >
              <div className="h-7 w-7 rounded-full bg-brand-50 flex items-center justify-center border border-brand-100">
                <User className="h-4 w-4 text-brand-500" />
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden sm:inline">{checkerName}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-md border border-slate-200 z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="font-semibold text-slate-900 text-sm truncate">{checkerName}</p>
                  <p className="text-xs text-slate-500 font-medium">QC Checker</p>
                </div>
                <div className="p-1.5 bg-white">
                  <button
                    onClick={() => {
                      import('@/services/webNotificationService').then(m => m.unregisterWebPushToken()).catch(() => {})
                      qcCheckerService.clearCheckerAuth()
                      router.push('/checker')
                    }}
                    className="flex items-center w-full px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-semibold text-sm"
                  >
                    <LogOut className="mr-2.5 h-4 w-4 text-slate-400" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}