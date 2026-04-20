'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
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
  MessageSquare,
  Shield,
  HelpCircle,
  LayoutDashboard,
  Factory,
  FileText,
  Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { qcCheckerService } from '@/services/qcCheckerService'

interface HeaderProps {
  onMenuToggle?: () => void
  isSidebarOpen?: boolean
}

export default function Header({ onMenuToggle, isSidebarOpen = true }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [checkerName, setCheckerName] = useState('Quality Inspector')
  const pathname = usePathname()
  const router = useRouter()
  const notificationsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const data = qcCheckerService.getCheckerData()
    if (data?.name) setCheckerName(data.name)
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

  const notifications = [
    {
      id: 1,
      title: 'New Inspection Request',
      message: 'PO-2024-002 requires inspection',
      time: '5 min ago',
      unread: true,
    },
    {
      id: 2,
      title: 'Report Approved',
      message: 'Report #RPT-001 has been approved',
      time: '1 hour ago',
      unread: true,
    },
    {
      id: 3,
      title: 'System Update',
      message: 'New features available in dashboard',
      time: '2 hours ago',
      unread: false,
    },
  ]

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <header className=" p-2 font-sans sticky top-0 z-30">
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
              <div className="p-2 bg-black rounded-lg">
                <PageIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-black">{title}</h1>
                <p className="text-sm text-gray-500">Quality Control Portal</p>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
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
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-black text-white text-xs flex items-center justify-center p-0">
                    {unreadCount}
                  </Badge>
                )}
              </Button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-black">Notifications</h3>
                      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-black">
                        Mark all read
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`border-b border-gray-100 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${notification.unread ? 'bg-gray-50' : ''
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-black">{notification.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                          </div>
                          {notification.unread && (
                            <div className="w-2 h-2 bg-black rounded-full mt-1 ml-2"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 p-3 bg-gray-50">
                    <button className="text-black text-sm font-medium hover:text-gray-700">
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
                <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <p className="font-semibold text-black">{checkerName}</p>
                    <p className="text-sm text-gray-500">QC Checker</p>
                  </div>
                  <div className="py-2">
                    <button className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors">
                      <User className="mr-3 h-4 w-4" />
                      <span className="text-sm">Profile</span>
                    </button>
                    <button className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors">
                      <Settings className="mr-3 h-4 w-4" />
                      <span className="text-sm">Settings</span>
                    </button>
                    <button className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors">
                      <HelpCircle className="mr-3 h-4 w-4" />
                      <span className="text-sm">Help</span>
                    </button>
                  </div>
                  <div className="border-t border-gray-200 p-2 bg-gray-50">
                    <button
                      onClick={() => {
                        qcCheckerService.clearCheckerAuth()
                        router.push('/checker')
                      }}
                      className="flex items-center w-full px-4 py-2 text-black hover:bg-gray-100 transition-colors font-medium"
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