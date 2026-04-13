'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useVendorAuth } from '@/hooks/useVendorAuth'
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
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()
  const notificationsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !vendor) {
      router.push('/vendor')
    }
  }, [vendor, loading, router])

  // Handle logout
  const handleLogout = () => {
    logout()
    router.push('/vendor')
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showNotifications || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotifications, showUserMenu])

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

  const notifications = [
    {
      id: 1,
      title: 'New Order Received',
      message: 'Order #1234 has been placed',
      time: '5 min ago',
      unread: true,
    },
    {
      id: 2,
      title: 'Product Review',
      message: 'New 5-star review for Handwoven Cotton Towel',
      time: '1 hour ago',
      unread: true,
    },
    {
      id: 3,
      title: 'Payment Received',
      message: 'Payment of $1,245.00 has been processed',
      time: '2 hours ago',
      unread: false,
    },
  ]

  const unreadCount = notifications.filter(n => n.unread).length

  // Show loading state if vendor data is not available
  if (loading || !vendor) {
    return (
      <header className="bg-white/30 border-b border-gray-200 p-2 font-sans sticky top-0 z-30">
        <div className="px-6 py-4 bg-white rounded-full border border-gray-300 p-2 mb-2 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="animate-pulse">
                <div className="h-8 w-32 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="animate-pulse">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white/30 border-b border-gray-200 p-2 font-sans sticky top-0 z-30">
      <div className="px-6 py-4 bg-white rounded-full border border-gray-300 p-2 mb-2 shadow-md">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuToggle}
              className="lg:hidden text-gray-700 hover:bg-gray-100"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Page Title with Icon */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#222222] rounded-lg">
                <PageIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#222222]">{title}</h1>
                <p className="text-sm text-gray-500">{vendor.companyName}</p>
              </div>
            </div>

            {/* Search Bar - Desktop */}
            {/* <div className="relative hidden lg:block ml-8">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products, orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-[#222222] w-64 text-sm transition-all"
              />
            </div> */}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Search Button - Mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-gray-700 hover:bg-gray-100"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-gray-700 hover:bg-gray-100"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#222222] text-white text-xs flex items-center justify-center p-0">
                    {unreadCount}
                  </Badge>
                )}
              </Button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[#222222]">Notifications</h3>
                      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#222222]">
                        Mark all read
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`border-b border-gray-100 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          notification.unread ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-[#222222]">{notification.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                          </div>
                          {notification.unread && (
                            <div className="w-2 h-2 bg-[#222222] rounded-full mt-1 ml-2"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 p-3 bg-gray-50">
                    <button className="text-[#222222] text-sm font-medium hover:text-gray-700">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 text-gray-700 hover:bg-gray-100"
              >
                <div className="h-8 w-8 rounded-full bg-[#222222] flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">{vendor.ownerName}</p>
                  <p className="text-xs text-gray-500">{vendor.email}</p>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-[#222222] flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#222222]">{vendor.ownerName}</p>
                        <p className="text-sm text-gray-500">{vendor.email}</p>
                        <div className="flex items-center mt-1">
                          <Building2 className="h-3 w-3 text-gray-400 mr-1" />
                          <p className="text-xs text-gray-500">{vendor.companyName}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        vendor.status === 'APPROVED' 
                          ? 'bg-green-100 text-green-800' 
                          : vendor.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {vendor.status}
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link href="/vendor/dashboard/profile" className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors">
                      <User className="mr-3 h-4 w-4" />
                      <span className="text-sm">Profile</span>
                    </Link>
                    <Link href="/vendor/dashboard/settings" className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors">
                      <Settings className="mr-3 h-4 w-4" />
                      <span className="text-sm">Settings</span>
                    </Link>
                    <Link href="/vendor/dashboard/support" className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors">
                      <HelpCircle className="mr-3 h-4 w-4" />
                      <span className="text-sm">Help & Support</span>
                    </Link>
                  </div>
                  <div className="border-t border-gray-200 p-2 bg-gray-50">
                    <button 
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-[#222222] hover:bg-gray-100 transition-colors font-medium"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      <span className="text-sm">Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}