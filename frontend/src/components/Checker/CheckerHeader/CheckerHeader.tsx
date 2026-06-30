'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import NotificationDropdown from '@/components/Shared/NotificationDropdown'
import { QC_CATEGORIES } from '@/components/Shared/NotificationModal'
import {
  Bell,
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
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const data = qcCheckerService.getCheckerData()
    if (data?.name) setCheckerName(data.name)
    if (data?.profilePhoto) {
      setProfilePhoto(data.profilePhoto)
    } else {
      // Login response doesn't include profilePhoto — fetch the full profile
      qcCheckerService.getCheckerProfile().then((res) => {
        const photo = res?.data?.profilePhoto
        if (photo) {
          setProfilePhoto(photo)
          // Cache it so next page load is instant
          const cached = qcCheckerService.getCheckerData()
          if (cached) {
            qcCheckerService.storeCheckerAuth(qcCheckerService.getCheckerToken()!, { ...cached, profilePhoto: photo })
          }
        }
      }).catch(() => {})
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

  // Map pathnames to titles and icons
  const getPageInfo = () => {
    const pageMap: Record<string, { title: string; icon: React.ComponentType<any> }> = {
      '/checker/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
      '/checker/dashboard/vendors': { title: 'Vendors', icon: Factory },
      '/checker/dashboard/report': { title: 'Reports', icon: FileText },
      '/checker/dashboard/settings': { title: 'Profile', icon: User },
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
          {/* Notifications */}
          <NotificationDropdown categories={QC_CATEGORIES} colorScheme="brand" />

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
            >
              <div className="h-7 w-7 rounded-full bg-brand-50 border border-brand-100 overflow-hidden flex items-center justify-center shrink-0">
                {profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profilePhoto} alt={checkerName} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-brand-500" />
                )}
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden sm:inline">{checkerName}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-md border border-slate-200 z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    router.push('/checker/dashboard/settings')
                  }}
                  className="w-full text-left p-3 border-b border-slate-100 bg-slate-50/50 hover:bg-brand-50 transition-colors"
                  title="View profile"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {profilePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profilePhoto} alt={checkerName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{checkerName}</p>
                      <p className="text-xs text-slate-500 font-medium">QC Checker</p>
                    </div>
                  </div>
                </button>
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