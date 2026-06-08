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
  Package,
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
    title: 'Products',
    href: '/checker/dashboard/products',
    icon: Package,
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
    <div className="flex h-full w-64 flex-col bg-white border-r border-slate-200 text-slate-800 font-sans shadow-xs">
      {/* Logo */}
      <div className="flex h-20 items-center justify-center border-b border-slate-200 px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
            <Factory className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">M2C MarkDowns</h1>
            <p className="text-[9px] font-bold uppercase tracking-wider text-brand-500 mt-0.5">Checker Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 py-6 overflow-y-auto pr-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center px-4 py-3 text-sm font-semibold rounded-r-xl transition-all duration-200 border-l-4',
                isActive
                  ? 'bg-brand-50/60 border-brand-500 text-brand-700 font-bold shadow-xs shadow-brand-500/5'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn("mr-3 h-5 w-5 shrink-0 transition-colors", isActive ? "text-brand-500" : "text-slate-400 group-hover:text-slate-600")} />
              {item.title}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200 p-4 bg-slate-50/50">
        <div className="flex items-center">
          <div className="shrink-0">
            <div className="h-9 w-9 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center">
              <span className="text-xs font-bold text-brand-600">
                {checkerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'QC'}
              </span>
            </div>
          </div>
          <div className="ml-3 text-left min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate w-36">{checkerName}</p>
            <p className="text-xs text-slate-500 font-medium">QC Checker</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center px-3 py-2.5 text-sm font-semibold text-slate-700 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
        >
          <LogOut className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  )
}
