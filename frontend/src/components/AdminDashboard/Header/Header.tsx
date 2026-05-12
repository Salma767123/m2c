'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { getStoredAuth, logout } from '@/lib/auth'
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
  // Notification dropdown handled by shared NotificationDropdown component
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const pathname = usePathname()
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

  // Handle logout
  const handleLogout = async () => {
    try {
      setShowUserMenu(false) // Close the menu first
      import('@/services/webNotificationService').then(m => m.unregisterWebPushToken()).catch(() => {})
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
      '/admin/dashboard/vendors/assign-qc': { title: 'Assign QC Checker', icon: Store },
      '/admin/dashboard/qc-checker': { title: 'QC Checker', icon: Shield },
      '/admin/dashboard/products': { title: 'All Products', icon: Package },
      '/admin/dashboard/products/vendor-requests': { title: 'Vendor Requests', icon: Package },
      '/admin/dashboard/inventory': { title: 'Inventory', icon: Warehouse },
      '/admin/dashboard/orders/vendor-to-hub': { title: 'Vendor to Hub Orders', icon: Receipt },
      '/admin/dashboard/orders/hub-to-customer': { title: 'Hub to Customer Orders', icon: Receipt },
      '/admin/dashboard/billing/invoices': { title: 'Invoices', icon: Receipt },
      '/admin/dashboard/billing/billings': { title: 'Billings', icon: Receipt },
      '/admin/dashboard/billing/settlement': { title: 'Settlement', icon: Receipt },
      '/admin/dashboard/categories': { title: 'Categories', icon: Tags },
      '/admin/dashboard/users/customer-management': { title: 'Customer Management', icon: Users },
      '/admin/dashboard/users/user-management': { title: 'User Management', icon: Users },
      '/admin/dashboard/general/enquiry-form': { title: 'Enquiry Form', icon: Edit3 },
      '/admin/dashboard/cms': { title: 'Content Management', icon: Edit3 },
      '/admin/dashboard/reviews/customer': { title: 'Customer Reviews', icon: MessageSquare },
      '/admin/dashboard/reviews/vendor-products': { title: 'Vendor Product Reviews', icon: MessageSquare },
      '/admin/dashboard/reports': { title: 'Reports', icon: FileText },
      '/admin/dashboard/support': { title: 'Support', icon: HelpCircle },
      '/admin/dashboard/roles-permissions': { title: 'Roles & Permissions', icon: Shield },
      '/admin/dashboard/coupons': { title: 'Coupons', icon: Tags },
      '/admin/dashboard/bag-types': { title: 'Bag Types', icon: Tags },
      '/admin/dashboard/analytics': { title: 'Analytics', icon: FileText },
      '/admin/dashboard/qc-reports': { title: 'QC Reports', icon: Shield },
      '/admin/dashboard/general/website-enquiries': { title: 'Website Enquiries', icon: MessageSquare },
      '/admin/dashboard/settings': { title: 'Settings', icon: Settings },
    }

    // Handle dynamic routes with actions (add/edit/view)
    // Vendors
    if (pathname.startsWith('/admin/dashboard/vendors/view/')) {
      return { title: 'View Vendor', icon: Store }
    }
    if (pathname.startsWith('/admin/dashboard/vendors/inspection/')) {
      return { title: 'Vendor Inspection', icon: Store }
    }
    if (pathname.startsWith('/admin/dashboard/vendors/edit/')) {
      return { title: 'Edit Vendor', icon: Store }
    }
    if (pathname === '/admin/dashboard/vendors/add') {
      return { title: 'Add Vendor', icon: Store }
    }
    if (pathname.startsWith('/admin/dashboard/vendors/assign-qc/')) {
      return { title: 'Create Assignment', icon: Store }
    }
    
    // QC Checker
    if (pathname === '/admin/dashboard/qc-checker/create') {
      return { title: 'Create QC Checker', icon: Shield }
    }
    if (pathname.startsWith('/admin/dashboard/qc-checker/edit/')) {
      return { title: 'Edit QC Checker', icon: Shield }
    }
    
    // Products
    if (pathname === '/admin/dashboard/products/add') {
      return { title: 'Add Product', icon: Package }
    }
    if (pathname.startsWith('/admin/dashboard/products/edit/')) {
      return { title: 'Edit Product', icon: Package }
    }
    if (pathname.startsWith('/admin/dashboard/products/view/')) {
      return { title: 'View Product', icon: Package }
    }
    
    // Inventory
    if (pathname === '/admin/dashboard/inventory/add') {
      return { title: 'Add Inventory', icon: Warehouse }
    }
    if (pathname.startsWith('/admin/dashboard/inventory/edit/')) {
      return { title: 'Edit Inventory', icon: Warehouse }
    }
    
    // Categories
    if (pathname === '/admin/dashboard/categories/add') {
      return { title: 'Add Category', icon: Tags }
    }
    if (pathname.startsWith('/admin/dashboard/categories/edit/')) {
      return { title: 'Edit Category', icon: Tags }
    }
    if (pathname.startsWith('/admin/dashboard/categories/view/')) {
      return { title: 'View Category', icon: Tags }
    }
    
    // Coupons
    if (pathname === '/admin/dashboard/coupons/add') {
      return { title: 'Add Coupon', icon: Tags }
    }
    if (pathname.startsWith('/admin/dashboard/coupons/edit/')) {
      return { title: 'Edit Coupon', icon: Tags }
    }
    
    // Roles & Permissions
    if (pathname === '/admin/dashboard/roles-permissions/add') {
      return { title: 'Create Role', icon: Shield }
    }
    if (pathname.startsWith('/admin/dashboard/roles-permissions/edit/')) {
      return { title: 'Edit Role', icon: Shield }
    }
    
    // Orders - Detail views
    if (pathname.startsWith('/admin/dashboard/orders/vendor-to-hub/view/')) {
      return { title: 'Vendor to Hub Order Details', icon: Receipt }
    }
    if (pathname.startsWith('/admin/dashboard/orders/hub-to-customer/view/')) {
      return { title: 'Hub to Customer Order Details', icon: Receipt }
    }
    
    // Support - Ticket details
    if (pathname.startsWith('/admin/dashboard/support/') && pathname !== '/admin/dashboard/support') {
      return { title: 'Support Ticket Details', icon: HelpCircle }
    }

    return pageMap[pathname] || { title: 'Dashboard', icon: LayoutDashboard }
  }

  const { title, icon: PageIcon } = getPageInfo()

  return (
    <header className="p-2 font-sans sticky top-0 z-30">
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
            <NotificationDropdown />

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
                    <Link href="/admin/dashboard/settings" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <Settings className="h-4 w-4 mr-3" />
                      Settings
                    </Link>
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