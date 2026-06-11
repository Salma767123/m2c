'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useVendorAuth } from '@/hooks/useVendorAuth'
import NotificationDropdown from '@/components/Shared/NotificationDropdown'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import {
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search,
  Phone,
  HelpCircle,
  LayoutDashboard,
  Package,
  BarChart3,
  FileText,
  Truck,
  Building2,
} from 'lucide-react'

interface VendorHeaderProps {
  onMenuToggle?: () => void
  isSidebarOpen?: boolean
}

export default function VendorHeader({ onMenuToggle, isSidebarOpen = true }: VendorHeaderProps) {
  const { vendor, loading, logout } = useVendorAuth()
  const router = useRouter()
  // Notification dropdown is handled by NotificationDropdown component
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !vendor) {
      router.push('/vendor')
    }
  }, [vendor, loading, router])

  // Handle logout
  const handleLogout = () => {
    import('@/services/webNotificationService').then(m => m.unregisterWebPushToken()).catch(() => {})
    logout()
    router.push('/vendor')
  }

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
      '/vendor/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
      '/vendor/dashboard/products': { title: 'Products', icon: Package },
      '/vendor/dashboard/products/add': { title: 'Products', icon: Package },
      '/vendor/dashboard/products/edit': { title: 'Products', icon: Package },
      '/vendor/dashboard/inventory': { title: 'Inventory', icon: Package },
      '/vendor/dashboard/inventory/add': { title: 'Inventory', icon: Package },
      '/vendor/dashboard/inventory/edit': { title: 'Inventory', icon: Package },
      '/vendor/dashboard/orders': { title: 'Orders', icon: Truck },
      '/vendor/dashboard/earnings': { title: 'Overview', icon: BarChart3 },
      '/vendor/dashboard/earnings/payouts': { title: 'Payouts', icon: BarChart3 },
      '/vendor/dashboard/reviews': { title: 'Reviews', icon: FileText },
      '/vendor/dashboard/reports': { title: 'Reports', icon: FileText },
      '/vendor/dashboard/support': { title: 'Support', icon: HelpCircle },
      '/vendor/dashboard/support/create': { title: 'Support', icon: HelpCircle },
      '/vendor/dashboard/settings': { title: 'Vendor Settings', icon: Settings },
      '/vendor/dashboard/settings/bank': { title: 'Bank Details', icon: Settings },
      '/vendor/dashboard/profile': { title: 'Profile', icon: User },
      '/vendor/dashboard/profile/bank': { title: 'Profile', icon: User },
    }

    // Handle dynamic routes like /vendor/dashboard/orders/[id] or /vendor/dashboard/products/[id]
    if (pathname.startsWith('/vendor/dashboard/orders/') && pathname !== '/vendor/dashboard/orders') {
      return { title: 'Orders', icon: Truck }
    }
    if (pathname.startsWith('/vendor/dashboard/products/') && 
        !pathname.includes('/add') && 
        !pathname.includes('/edit')) {
      return { title: 'Products', icon: Package }
    }

    return pageMap[pathname] || { title: 'Dashboard', icon: LayoutDashboard }
  }

  const { title, icon: PageIcon } = getPageInfo()


  // Show loading state if vendor data is not available
  if (loading || !vendor) {
    return (
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 font-sans">
        <div className="h-1 bg-brand-500" />
        <div className="px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3 animate-pulse">
            <div className="h-9 w-9 bg-slate-200 rounded-lg" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-2.5 w-24 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse" />
        </div>
      </header>
    )
  }

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
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500">{vendor.companyName}</p>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Support call button */}
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
              <span className="text-sm font-semibold text-slate-700 hidden sm:inline">{vendor.ownerName}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-md border border-slate-200 z-50 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-brand-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{vendor.ownerName}</p>
                      <p className="text-xs text-slate-500 truncate">{vendor.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center mt-2.5">
                    <Building2 className="h-3 w-3 text-slate-400 mr-1 shrink-0" />
                    <p className="text-xs text-slate-500 truncate">{vendor.companyName}</p>
                  </div>
                  <div className="mt-2.5">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${
                      vendor.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : vendor.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {vendor.status}
                    </span>
                  </div>
                </div>
                <div className="p-1.5 bg-white">
                  <Link
                    href="/vendor/dashboard/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center w-full px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-semibold text-sm"
                  >
                    <User className="mr-2.5 h-4 w-4 text-slate-400" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/vendor/dashboard/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center w-full px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-semibold text-sm"
                  >
                    <Settings className="mr-2.5 h-4 w-4 text-slate-400" />
                    <span>Settings</span>
                  </Link>
                  <Link
                    href="/vendor/dashboard/support"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center w-full px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-semibold text-sm"
                  >
                    <HelpCircle className="mr-2.5 h-4 w-4 text-slate-400" />
                    <span>Help & Support</span>
                  </Link>
                </div>
                <div className="p-1.5 bg-white border-t border-slate-100">
                  <button
                    onClick={handleLogout}
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