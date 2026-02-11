'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { getStoredAuth, logout } from '@/lib/auth'
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
  HelpCircle,
  LayoutDashboard,
  Users,
  Package,
  Store,
  Tags,
  FileText,
  Warehouse,
  Receipt,
  Edit3,
  Search,
  Home
} from 'lucide-react'

interface HeaderProps {
  onMenuToggle?: () => void
  isSidebarOpen?: boolean
}

export default function Header({ onMenuToggle, isSidebarOpen = true }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const pathname = usePathname()
  const notificationsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Get current user data
  useEffect(() => {
    const auth = getStoredAuth()
    if (auth) {
      setCurrentUser(auth.user)
    }
  }, [])

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

  // Handle logout
  const handleLogout = async () => {
    try {
      setShowUserMenu(false) // Close the menu first
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
      // Import toast function dynamically
      const { showErrorToast } = await import('@/lib/toast-utils')
      showErrorToast('Logout Error', 'There was an issue logging out. Please try again.')
    }
  }

  // Get user initials
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Map pathnames to titles and icons
  const getPageInfo = () => {
    const pageMap: Record<string, { title: string; icon: React.ComponentType<any> }> = {
      '/admin/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
      '/admin/dashboard/vendors': { title: 'All Vendors', icon: Store },
      '/admin/dashboard/vendors/add': { title: 'All Vendors', icon: Store },
      '/admin/dashboard/vendors/edit': { title: 'All Vendors', icon: Store },
      '/admin/dashboard/vendors/view': { title: 'All Vendors', icon: Store },
      '/admin/dashboard/vendors/assign-qc-checker': { title: 'Assign QC Checker', icon: Store },
      '/admin/dashboard/vendors/assign-qc-checker/add': { title: 'Create Assignment', icon: Store },
      '/admin/dashboard/qc-checker': { title: 'All Checkers', icon: Shield },
      '/admin/dashboard/qc-checker/create': { title: 'Create Checker', icon: Shield },
      '/admin/dashboard/products': { title: 'All Products', icon: Package },
      '/admin/dashboard/products/add': { title: 'All Products', icon: Package },
      '/admin/dashboard/products/edit': { title: 'All Products', icon: Package },
      '/admin/dashboard/products/vendor-requests': { title: 'Vendor Requests', icon: Package },
      '/admin/dashboard/inventory': { title: 'Inventory', icon: Warehouse },
      '/admin/dashboard/inventory/add': { title: 'Inventory', icon: Warehouse },
      '/admin/dashboard/inventory/edit': { title: 'Inventory', icon: Warehouse },
      '/admin/dashboard/orders': { title: 'Orders', icon: Receipt },
      '/admin/dashboard/billing': { title: 'Invoice & Billing', icon: Receipt },
      '/admin/dashboard/billing/invoices': { title: 'Invoices', icon: Receipt },
      '/admin/dashboard/billing/billings': { title: 'Billings', icon: Receipt },
      '/admin/dashboard/billing/settlement': { title: 'Settlement', icon: Receipt },
      '/admin/dashboard/categories': { title: 'Categories', icon: Tags },
      '/admin/dashboard/categories/add': { title: 'Categories', icon: Tags },
      '/admin/dashboard/categories/edit': { title: 'Categories', icon: Tags },
      '/admin/dashboard/categories/view': { title: 'Categories', icon: Tags },
      '/admin/dashboard/users': { title: 'Users', icon: Users },
      '/admin/dashboard/users/customer-management': { title: 'Customer Management', icon: Users },
      '/admin/dashboard/users/user-management': { title: 'User Management', icon: Users },
      '/admin/dashboard/cms': { title: 'Content Management', icon: Edit3 },
      '/admin/dashboard/reviews': { title: 'Reviews', icon: MessageSquare },
      '/admin/dashboard/reviews/customer': { title: 'Customer Reviews', icon: MessageSquare },
      '/admin/dashboard/reviews/vendor-products': { title: 'Vendor Product Reviews', icon: MessageSquare },
      '/admin/dashboard/reports': { title: 'Reports', icon: FileText },
      '/admin/dashboard/support': { title: 'Support', icon: HelpCircle },
      '/admin/dashboard/roles-permissions': { title: 'All Roles', icon: Shield },
      '/admin/dashboard/roles-permissions/add': { title: 'Create Role', icon: Shield },
      '/admin/dashboard/roles-permissions/edit': { title: 'All Roles', icon: Shield },
      '/admin/dashboard/settings': { title: 'Settings', icon: Settings },
    }

    // Handle dynamic routes like /admin/dashboard/orders/[id], /admin/dashboard/support/[id], etc.
    if (pathname.startsWith('/admin/dashboard/orders/') && pathname !== '/admin/dashboard/orders') {
      return { title: 'Orders', icon: Receipt }
    }
    if (pathname.startsWith('/admin/dashboard/support/') && pathname !== '/admin/dashboard/support') {
      return { title: 'Support', icon: HelpCircle }
    }
    if (pathname.startsWith('/admin/dashboard/vendors/view/')) {
      return { title: 'All Vendors', icon: Store }
    }
    if (pathname.startsWith('/admin/dashboard/vendors/inspection/')) {
      return { title: 'All Vendors', icon: Store }
    }
    if (pathname.startsWith('/admin/dashboard/vendors/edit/')) {
      return { title: 'All Vendors', icon: Store }
    }
    if (pathname.startsWith('/admin/dashboard/products/edit/')) {
      return { title: 'All Products', icon: Package }
    }
    if (pathname.startsWith('/admin/dashboard/inventory/edit/')) {
      return { title: 'Inventory', icon: Warehouse }
    }
    if (pathname.startsWith('/admin/dashboard/categories/edit/')) {
      return { title: 'Categories', icon: Tags }
    }
    if (pathname.startsWith('/admin/dashboard/categories/view/')) {
      return { title: 'Categories', icon: Tags }
    }
    if (pathname.startsWith('/admin/dashboard/roles-permissions/edit/')) {
      return { title: 'All Roles', icon: Shield }
    }

    return pageMap[pathname] || { title: 'Dashboard', icon: LayoutDashboard }
  }

  const { title, icon: PageIcon } = getPageInfo()

  const notifications = [
    {
      id: 1,
      title: 'New vendor registration',
      message: 'TechStore Pro has submitted registration',
      time: '2 min ago',
      unread: true,
    },
    {
      id: 2,
      title: 'Product approval needed',
      message: 'iPhone 15 Pro requires approval',
      time: '5 min ago',
      unread: true,
    },
    {
      id: 3,
      title: 'Order dispute',
      message: 'Customer dispute for order #12345',
      time: '10 min ago',
      unread: false,
    },
  ]

  const unreadCount = notifications.filter(n => n.unread).length

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
                <p className="text-sm text-gray-500">Admin Portal</p>
              </div>
            </div>

            {/* Search Bar - Desktop */}
            {/* <div className="relative hidden lg:block ml-8">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors, products, orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-500 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-[#222222] w-64 md:w-96 text-sm transition-all"
              />
            </div> */}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Go to Website Link */}
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                <Home className="h-4 w-4" />
                <span className="hidden md:inline">Go to Website</span>
              </Button>
            </Link>

            {/* Search Button - Mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-gray-700 hover:bg-gray-100"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Quick Actions */}
            <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-gray-100">
              <MessageSquare className="h-5 w-5" />
            </Button>

            {/* <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-gray-100">
              <HelpCircle className="h-5 w-5" />
            </Button> */}

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
                <div className="w-8 h-8 bg-[#222222] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {currentUser ? getUserInitials(currentUser.name) : 'SA'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-[#222222]">
                    {currentUser ? currentUser.name : 'Super Admin'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {currentUser ? currentUser.email : 'admin@example.com'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#222222] rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {currentUser ? getUserInitials(currentUser.name) : 'SA'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#222222]">
                          {currentUser ? currentUser.name : 'Super Admin'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {currentUser ? currentUser.email : 'admin@example.com'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <User className="h-4 w-4 mr-3" />
                      Profile Settings
                    </button>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <Shield className="h-4 w-4 mr-3" />
                      Admin Settings
                    </button>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <Settings className="h-4 w-4 mr-3" />
                      Preferences
                    </button>
                  </div>
                  <div className="border-t border-gray-200 py-2 bg-gray-50">
                    <button 
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-[#222222] hover:bg-gray-100 transition-colors font-medium"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
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