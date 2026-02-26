'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Factory,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { qcCheckerService } from '@/services/qcCheckerService'

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/checker/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Vendors',
    href: '/checker/dashboard/vendors',
    icon: Factory,
  },
  {
    title: 'Reports',
    href: '/checker/dashboard/report',
    icon: FileText,
  },
  {
    title: 'Settings',
    href: '/checker/dashboard/settings',
    icon: Settings,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [checkerName, setCheckerName] = useState('Quality Inspector')

  useEffect(() => {
    const data = qcCheckerService.getCheckerData()
    if (data?.name) setCheckerName(data.name)
  }, [])

  const handleLogout = () => {
    qcCheckerService.clearCheckerAuth()
    router.push('/checker')
  }

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-700 text-gray-800 font-sans">
      {/* Logo */}
      <div className="flex h-20 items-center justify-center border-b border-gray-700">
        <h1 className="text-xl font-bold">QC Checker</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-[#313131] text-white font-bold'
                  : 'text-gray-800 hover:bg-gray-300 hover:text-gray-900'
              )}
            >
              <Icon className="mr-3 h-5 w-5 shrink-0" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center">
          <div className="shrink-0">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-sm font-medium">QI</span>
            </div>
          </div>
          <div className="ml-3 text-left">
            <p className="text-sm font-bold truncate w-40">{checkerName}</p>
            <p className="text-sm text-gray-900">QC Checker</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 flex w-full items-center px-2 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
