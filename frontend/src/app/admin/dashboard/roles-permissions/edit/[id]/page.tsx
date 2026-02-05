'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import AddEditRole from '@/components/AdminDashboard/RolesPermissions/AddEditRole'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'

interface Permission {
  id: string
  name: string
  description: string
  module: string
}

interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  userCount: number
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

// Mock data - replace with actual API call
const mockPermissions: Permission[] = [
  // Dashboard
  { id: '1', name: 'view_dashboard', description: 'View dashboard', module: 'Dashboard' },
  
  // Users
  { id: '2', name: 'view_users', description: 'View users list', module: 'Users' },
  { id: '3', name: 'create_users', description: 'Create new users', module: 'Users' },
  { id: '4', name: 'edit_users', description: 'Edit existing users', module: 'Users' },
  { id: '5', name: 'delete_users', description: 'Delete users', module: 'Users' },
  
  // Products
  { id: '6', name: 'view_products', description: 'View products list', module: 'Products' },
  { id: '7', name: 'create_products', description: 'Create new products', module: 'Products' },
  { id: '8', name: 'edit_products', description: 'Edit existing products', module: 'Products' },
  { id: '9', name: 'delete_products', description: 'Delete products', module: 'Products' },
  
  // Orders
  { id: '10', name: 'view_orders', description: 'View orders list', module: 'Orders' },
  { id: '11', name: 'create_orders', description: 'Create new orders', module: 'Orders' },
  { id: '12', name: 'edit_orders', description: 'Edit existing orders', module: 'Orders' },
  { id: '13', name: 'delete_orders', description: 'Delete orders', module: 'Orders' },
  
  // Vendors
  { id: '14', name: 'view_vendors', description: 'View vendors list', module: 'Vendors' },
  { id: '15', name: 'create_vendors', description: 'Create new vendors', module: 'Vendors' },
  { id: '16', name: 'edit_vendors', description: 'Edit existing vendors', module: 'Vendors' },
  { id: '17', name: 'delete_vendors', description: 'Delete vendors', module: 'Vendors' },
  
  // Categories
  { id: '18', name: 'view_categories', description: 'View categories list', module: 'Categories' },
  { id: '19', name: 'create_categories', description: 'Create new categories', module: 'Categories' },
  { id: '20', name: 'edit_categories', description: 'Edit existing categories', module: 'Categories' },
  { id: '21', name: 'delete_categories', description: 'Delete categories', module: 'Categories' },
  
  // Inventory
  { id: '22', name: 'view_inventory', description: 'View inventory list', module: 'Inventory' },
  { id: '23', name: 'create_inventory', description: 'Create inventory items', module: 'Inventory' },
  { id: '24', name: 'edit_inventory', description: 'Edit inventory items', module: 'Inventory' },
  { id: '25', name: 'delete_inventory', description: 'Delete inventory items', module: 'Inventory' },
  
  // Reports
  { id: '26', name: 'view_reports', description: 'View reports', module: 'Reports' },
  { id: '27', name: 'export_reports', description: 'Export reports', module: 'Reports' },
  
  // Settings
  { id: '28', name: 'view_settings', description: 'View system settings', module: 'Settings' },
  { id: '29', name: 'manage_settings', description: 'Manage system settings', module: 'Settings' },
  
  // Reviews
  { id: '30', name: 'view_reviews', description: 'View reviews', module: 'Reviews' },
  { id: '31', name: 'moderate_reviews', description: 'Moderate reviews', module: 'Reviews' },
  { id: '32', name: 'delete_reviews', description: 'Delete reviews', module: 'Reviews' },
]

const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    permissions: mockPermissions,
    userCount: 2,
    isSystem: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: '2',
    name: 'Admin',
    description: 'Administrative access with limited permissions',
    permissions: mockPermissions.filter(p => !p.name.includes('manage_settings')),
    userCount: 5,
    isSystem: false,
    createdAt: '2024-01-15',
    updatedAt: '2024-02-01'
  },
  {
    id: '3',
    name: 'Manager',
    description: 'Management access for products and orders',
    permissions: mockPermissions.filter(p => 
      p.module === 'Dashboard' || 
      p.module === 'Products' || 
      p.module === 'Orders' || 
      p.name === 'view_reports'
    ),
    userCount: 8,
    isSystem: false,
    createdAt: '2024-01-20',
    updatedAt: '2024-01-25'
  },
  {
    id: '4',
    name: 'Viewer',
    description: 'Read-only access to most modules',
    permissions: mockPermissions.filter(p => p.name.startsWith('view_')),
    userCount: 12,
    isSystem: false,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01'
  }
]

export default function EditRolePage() {
  const params = useParams()
  const roleId = params.id as string
  const [role, setRole] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRole = async () => {
      try {
        setIsLoading(true)
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const foundRole = mockRoles.find(r => r.id === roleId)
        if (foundRole) {
          setRole(foundRole)
        } else {
          setError('Role not found')
        }
      } catch (err) {
        setError('Failed to fetch role')
      } finally {
        setIsLoading(false)
      }
    }

    if (roleId) {
      fetchRole()
    }
  }, [roleId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error || !role) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Role not found'}
          </h2>
          <p className="text-gray-600">
            The role you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <AddEditRole role={role} isEdit={true} />
    </div>
  )
}