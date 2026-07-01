'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Factory,
  FileText,
  User,
  LogOut,
  Package,
  ChevronLeft,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { qcCheckerService } from '@/services/qcCheckerService'

const sidebarItems = [
  { title: 'Dashboard', href: '/checker/dashboard',          icon: LayoutDashboard },
  { title: 'Vendors',   href: '/checker/dashboard/vendors',  icon: Factory },
  { title: 'Products',  href: '/checker/dashboard/products', icon: Package },
  { title: 'Reports',   href: '/checker/dashboard/report',   icon: FileText },
  { title: 'Profile',   href: '/checker/dashboard/settings', icon: User },
]

interface CheckerSidebarProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({ isCollapsed = false, onToggleCollapse }: CheckerSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [checkerName, setCheckerName] = useState('Quality Inspector')
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)

  useEffect(() => {
    const data = qcCheckerService.getCheckerData()
    if (data?.name) setCheckerName(data.name)
    if (data?.profilePhoto) setProfilePhoto(data.profilePhoto)
  }, [])

  const handleLogout = () => {
    qcCheckerService.clearCheckerAuth()
    router.push('/checker')
  }

  const initials = checkerName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'QC'

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-white border-r border-slate-200 text-slate-800 font-sans shadow-xs transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo / Brand */}
      <div className="relative flex h-20 items-center justify-center border-b border-slate-200 px-4">
        {isCollapsed ? (
          <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
            <Factory className="w-4 h-4 text-brand-500" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <Factory className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">M2C MarkDowns</h1>
              <p className="text-[9px] font-bold uppercase tracking-wider text-brand-500 mt-0.5">Checker Portal</p>
            </div>
          </div>
        )}

        {/* Collapse toggle — desktop only */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-brand-500 text-white items-center justify-center hover:bg-brand-600 transition-colors shadow-md z-10"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={cn('h-3.5 w-3.5 transition-transform duration-300', isCollapsed && 'rotate-180')}
            />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 py-6 overflow-y-auto">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/checker/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.title : undefined}
              className={cn(
                'group flex items-center py-3 text-sm font-semibold rounded-r-xl transition-all duration-200 border-l-4',
                isCollapsed ? 'justify-center px-0' : 'px-4',
                isActive
                  ? 'bg-brand-50/60 border-brand-500 text-brand-700 font-bold shadow-xs shadow-brand-500/5'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-brand-500' : 'text-slate-400 group-hover:text-slate-600',
                  !isCollapsed && 'mr-3'
                )}
              />
              {!isCollapsed && item.title}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200 p-4 bg-slate-50/50">
        {isCollapsed ? (
          /* Collapsed: avatar + sign-out icon stacked */
          <div className="flex flex-col items-center gap-3">
            <div
              className="shrink-0"
              title={checkerName}
            >
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={checkerName}
                  className="h-9 w-9 rounded-full object-cover border border-brand-100 shadow-sm"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-brand-600">{initials}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
            >
              <LogOut className="h-4 w-4 shrink-0" />
            </button>
          </div>
        ) : (
          /* Expanded: full user row + sign-out button */
          <div className="flex items-center">
            <div className="shrink-0">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={checkerName}
                  className="h-9 w-9 rounded-full object-cover border border-brand-100 shadow-sm"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-brand-600">{initials}</span>
                </div>
              )}
            </div>
            <div className="ml-3 text-left min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate w-36">{checkerName}</p>
              <p className="text-xs text-slate-500 font-medium">QC Checker</p>
            </div>
          </div>
        )}

        {!isCollapsed && (
          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center px-3 py-2.5 text-sm font-semibold text-slate-700 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
          >
            <LogOut className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </div>
  )
}
