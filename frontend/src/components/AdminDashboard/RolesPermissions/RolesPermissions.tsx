'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  AlertCircle,
  Shield,
  Users,
  Lock,
  Crown,
  Settings,
  Filter,
  Activity,
  Star,
  Calendar,
  MoreVertical,
  UserCheck,
  Eye,
  ChevronRight
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

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
  },
  {
    id: '5',
    name: 'Content Editor',
    description: 'Can create and edit content but not delete',
    permissions: mockPermissions.filter(p => 
      p.name.startsWith('view_') || 
      p.name.startsWith('create_') || 
      p.name.startsWith('edit_')
    ),
    userCount: 6,
    isSystem: false,
    createdAt: '2024-02-05',
    updatedAt: '2024-02-05'
  }
]

export default function RolesPermissions() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'users'>('roles')
  const [roles, setRoles] = useState<Role[]>(mockRoles)
  const [permissions] = useState<Permission[]>(mockPermissions)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  const handleCreateRole = () => {
    router.push('/admin/dashboard/roles-permissions/add')
  }

  const handleEditRole = (role: Role) => {
    router.push(`/admin/dashboard/roles-permissions/edit/${role.id}`)
  }

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role)
    setShowDeleteModal(true)
  }

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return

    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setRoles(prev => prev.filter(role => role.id !== roleToDelete.id))
      showSuccessToast('Role deleted successfully')
      setShowDeleteModal(false)
      setRoleToDelete(null)
    } catch (error) {
      showErrorToast('Failed to delete role')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="rounded p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">Roles & Permissions</h1>
            <p className="text-gray-600 mt-1">Manage user roles and system permissions</p>
          </div>
          <Button 
            onClick={handleCreateRole} 
            className="bg-black hover:bg-gray-800 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Roles</p>
                <p className="text-xl font-bold text-black">{roles.length}</p>
              </div>
              <Shield className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Users</p>
                <p className="text-xl font-bold text-black">{roles.reduce((sum, role) => sum + role.userCount, 0)}</p>
              </div>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Permissions</p>
                <p className="text-xl font-bold text-black">{permissions.length}</p>
              </div>
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">System Roles</p>
                <p className="text-xl font-bold text-black">{roles.filter(r => r.isSystem).length}</p>
              </div>
              <Crown className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'roles', label: 'Roles', count: roles.length },
              { key: 'permissions', label: 'Permissions', count: permissions.length },
              { key: 'users', label: 'Users', count: roles.reduce((sum, role) => sum + role.userCount, 0) }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </nav>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoles.map((role) => (
                <Card key={role.id} className="border-gray-200 bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg font-semibold text-black mb-0">
                          {role.name}
                        </CardTitle>
                        {role.isSystem && (
                          <Badge className="bg-black text-white text-xs">
                            System
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">{role.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-xs text-gray-500">Users</span>
                        <div className="text-lg font-bold text-black">{role.userCount}</div>
                      </div>
                      
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-xs text-gray-500">Permissions</span>
                        <div className="text-lg font-bold text-black">{role.permissions.length}</div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRole(role)}
                        className="flex-1"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      {!role.isSystem && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRole(role)}
                          className="text-gray-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                <Card key={module} className="border-gray-200">
                  <CardHeader className="bg-gray-50 border-b border-gray-200">
                    <CardTitle className="text-lg font-semibold text-black">
                      {module} ({modulePermissions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modulePermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                          <div>
                            <h4 className="font-medium text-black">{permission.name}</h4>
                            <p className="text-sm text-gray-600">{permission.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'users' && (
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-black">User Assignments</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-black mb-2">User Assignments</h3>
                  <p className="text-gray-600 mb-4">
                    Manage user role assignments and permissions.
                  </p>
                  <Button className="bg-black hover:bg-gray-800 text-white">
                    View All Users
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && roleToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-6 h-6 text-gray-600" />
                <div>
                  <h3 className="text-lg font-semibold text-black">Delete Role</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
                <p className="text-gray-800 text-sm">
                  Are you sure you want to delete <strong>"{roleToDelete.name}"</strong>? 
                  This will affect <strong>{roleToDelete.userCount} users</strong>.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteRole}
                  className="flex-1 bg-black hover:bg-gray-800 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}