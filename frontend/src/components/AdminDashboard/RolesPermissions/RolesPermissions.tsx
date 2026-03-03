'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { roleService, Role, Permission } from '@/services/roleService'
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
export default function RolesPermissions() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'users'>('roles')
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [rolesRes, permsRes] = await Promise.all([
          roleService.getRoles(),
          roleService.getPermissions()
        ])
        if (rolesRes.success) setRoles(rolesRes.data)
        if (permsRes.success) setPermissions(permsRes.data)
      } catch (error) {
        showErrorToast('Failed to load roles and permissions')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

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
      const res = await roleService.deleteRole(roleToDelete.id)
      if (res.success) {
        setRoles(prev => prev.filter(role => role.id !== roleToDelete.id))
        showSuccessToast('Role deleted successfully')
        setShowDeleteModal(false)
        setRoleToDelete(null)
      } else {
        throw new Error(res.message || 'Failed to delete role')
      }
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to delete role')
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
                className={`py-4 px-2 border-b-2 font-medium text-sm ${activeTab === key
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