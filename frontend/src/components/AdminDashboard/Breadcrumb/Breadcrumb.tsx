'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  customLabels?: Record<string, string>
}

export function Breadcrumb({ customLabels = {} }: BreadcrumbProps = {}) {
  const pathname = usePathname()
  
  // Map technical paths to user-friendly labels
  const pathLabels: Record<string, string> = {
    'admin': 'Admin',
    'dashboard': 'Dashboard',
    'products': 'Products',
    'categories': 'Categories',
    'inventory': 'Inventory',
    'orders': 'Orders',
    'users': 'Users',
    'vendors': 'Vendors',
    'reports': 'Reports',
    'settings': 'Settings',
    'billing': 'Billing',
    'cms': 'CMS',
    'reviews': 'Reviews',
    'add': 'Create New',
    'edit': 'Edit',
    'view': 'View Details',
    'profile': 'Profile',
    'returns': 'Returns',
    'shipping': 'Shipping',
    'earnings': 'Earnings',
    'support': 'Support',
    'analytics': 'Analytics',
    'customers': 'Customers',
    'customer': 'Customer Reviews',
    'vendor-requests': 'Vendor Requests',
    'roles-permissions': 'Roles & Permissions',
    'invoices': 'Invoices',
    'billings': 'Billings',
    'settlement': 'Settlement',
    'vendor-products': 'Vendor Product Reviews',
    'qc-checker': 'QC Checker',
    'create': 'Create',
    'assign-qc-checker': 'Assign QC Checker',
    'inspection': 'Inspection Details'
  }

  // Segments that are action prefixes (not standalone pages) — they only exist as parent paths for dynamic [id] routes
  const nonNavigableSegments = new Set(['view', 'edit', 'add', 'create', 'assign-qc-checker', 'inspection'])

  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    // Handle different route structures
    if (paths[0] === 'admin' && paths[1] === 'dashboard') {
      // Admin dashboard routes
      breadcrumbs.push({ label: 'Dashboard', href: '/admin/dashboard' })

      // Process remaining paths starting from index 2
      let currentPath = '/admin/dashboard'
      for (let i = 2; i < paths.length; i++) {
        const segment = paths[i]
        currentPath += `/${segment}`

        // Handle dynamic routes (like [id]) or typical database IDs (numbers, mongo object id, uuid)
        if (segment.match(/^\[.*\]$/) || /^\d+$/.test(segment) || /^[0-9a-fA-F]{24}$/.test(segment) || /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(segment)) {
          // For dynamic segments, use custom label if provided, otherwise generic
          const genericLabel = segment.match(/^\[.*\]$/) ? 'Details' : 'Details'
          const label = customLabels[segment] || genericLabel

          // Don't add href for the last item (current page)
          if (i === paths.length - 1) {
            breadcrumbs.push({ label })
          } else {
            breadcrumbs.push({ label, href: currentPath })
          }
        } else {
          // Use mapped label or capitalize the segment
          const label = customLabels[segment] || pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

          // Don't add href for non-navigable segments or the last item (current page)
          if (i === paths.length - 1 || nonNavigableSegments.has(segment)) {
            breadcrumbs.push({ label })
          } else {
            breadcrumbs.push({ label, href: currentPath })
          }
        }
      }
    } else if (paths[0] === 'vendor' && paths[1] === 'dashboard') {
      // Vendor dashboard routes
      breadcrumbs.push({ label: 'Vendor Dashboard', href: '/vendor/dashboard' })

      // Process remaining paths starting from index 2
      let currentPath = '/vendor/dashboard'
      for (let i = 2; i < paths.length; i++) {
        const segment = paths[i]
        currentPath += `/${segment}`

        // Handle dynamic routes
        if (segment.match(/^\[.*\]$/) || /^\d+$/.test(segment) || /^[0-9a-fA-F]{24}$/.test(segment) || /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(segment)) {
          const genericLabel = segment.match(/^\[.*\]$/) ? 'Details' : 'Details'
          const label = customLabels[segment] || genericLabel

          if (i === paths.length - 1) {
            breadcrumbs.push({ label })
          } else {
            breadcrumbs.push({ label, href: currentPath })
          }
        } else {
          const label = customLabels[segment] || pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

          // Don't add href for non-navigable segments or the last item (current page)
          if (i === paths.length - 1 || nonNavigableSegments.has(segment)) {
            breadcrumbs.push({ label })
          } else {
            breadcrumbs.push({ label, href: currentPath })
          }
        }
      }
    } else {
      // Fallback for other routes
      breadcrumbs.push({ label: 'Home', href: '/' })
      
      let currentPath = ''
      for (let i = 0; i < paths.length; i++) {
        const segment = paths[i]
        currentPath += `/${segment}`
        
        const label = customLabels[segment] || pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
        
        // Don't add href for the last item (current page)
        if (i === paths.length - 1) {
          breadcrumbs.push({ label })
        } else {
          breadcrumbs.push({ label, href: currentPath })
        }
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  // Don't render if there's only one breadcrumb item
  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
      <Home className="h-4 w-4" />
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-gray-900 transition-colors duration-200 hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium" aria-current="page">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}