'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { AlertCircle } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

import { roleService, Role, Permission } from '@/services/roleService'

interface AddEditRoleProps {
  role?: Role | null
  isEdit?: boolean
}


export default function AddEditRole({ role, isEdit = false }: AddEditRoleProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedPermissions: [] as string[]
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([])

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await roleService.getPermissions()
        if (res.success) {
          setAvailablePermissions(res.data)
        }
      } catch (error) {
        showErrorToast('Failed to load permissions')
      }
    }
    fetchPermissions()
  }, [])

  useEffect(() => {
    if (role && isEdit) {
      setFormData({
        name: role.name,
        description: role.description,
        selectedPermissions: role.permissions.map(p => p.name)
      })
    }
  }, [role, isEdit])

  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handlePermissionToggle = (permissionName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPermissions: prev.selectedPermissions.includes(permissionName)
        ? prev.selectedPermissions.filter(name => name !== permissionName)
        : [...prev.selectedPermissions, permissionName]
    }))
  }

  const handleModuleToggle = (modulePermissions: Permission[]) => {
    const modulePermissionNames = modulePermissions.map(p => p.name)
    const allSelected = modulePermissionNames.every(name => formData.selectedPermissions.includes(name))

    setFormData(prev => ({
      ...prev,
      selectedPermissions: allSelected
        ? prev.selectedPermissions.filter(name => !modulePermissionNames.includes(name))
        : [...new Set([...prev.selectedPermissions, ...modulePermissionNames])]
    }))
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Role name must be at least 3 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Role description is required'
    }

    if (formData.selectedPermissions.length === 0) {
      newErrors.permissions = 'At least one permission must be selected'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // System roles are immutable on the backend — block here to give a clear UX
    // message instead of letting the request hit a 400 error.
    if (isEdit && role?.isSystem) {
      showErrorToast('System roles cannot be modified')
      return
    }

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      if (isEdit && role) {
        await roleService.updateRole(role.id, {
          name: formData.name,
          description: formData.description,
          permissions: formData.selectedPermissions,
        })
      } else {
        await roleService.createRole({
          name: formData.name,
          description: formData.description,
          permissions: formData.selectedPermissions,
        })
      }

      showSuccessToast(isEdit ? 'Role updated successfully' : 'Role created successfully')
      router.push('/admin/dashboard/roles-permissions')
    } catch (error: any) {
      showErrorToast(error.response?.data?.error || 'Failed to save role')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/dashboard/roles-permissions')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">
                {isEdit ? 'Edit Role' : 'Create New Role'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEdit ? 'Update role details and permissions' : 'Define a new role with specific permissions'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-gray-300 hover:bg-gray-50"
            >
              Back
            </Button>
          </div>
        </div>

        {/* Warning banner for system roles */}
        {isEdit && role?.isSystem && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">This is a system role</p>
              <p className="text-sm text-amber-700 mt-1">
                The &quot;{role.name}&quot; role is protected and cannot be modified. To make changes, create a new custom role instead.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="border-gray-200 bg-white">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-black">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="Enter role name"
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm mt-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none ${errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="Describe the role's responsibilities"
                    disabled={isLoading}
                  />
                  {errors.description && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm mt-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card className="border-gray-200 bg-white">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-black">Permissions</CardTitle>
                <Badge className="bg-gray-200 text-gray-800">
                  {formData.selectedPermissions.length} of {availablePermissions.length} selected
                </Badge>
              </div>
              {errors.permissions && (
                <div className="flex items-center space-x-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.permissions}</span>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    selectedPermissions: availablePermissions.filter(p => p.name.startsWith('view_')).map(p => p.name)
                  }))}
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  View Only
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    selectedPermissions: availablePermissions.filter(p =>
                      p.name.startsWith('view_') || p.name.startsWith('create_') || p.name.startsWith('edit_')
                    ).map(p => p.name)
                  }))}
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Editor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    selectedPermissions: availablePermissions.map(p => p.name)
                  }))}
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Full Access
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    selectedPermissions: []
                  }))}
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
                  const allSelected = modulePermissions.every(p => formData.selectedPermissions.includes(p.name))
                  const someSelected = modulePermissions.some(p => formData.selectedPermissions.includes(p.name))

                  return (
                    <div key={module} className="border border-gray-200 rounded-lg bg-white">
                      <div className="bg-gray-50 p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => handleModuleToggle(modulePermissions)}
                              className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                              disabled={isLoading}
                            />
                            <div>
                              <span className="font-semibold text-lg text-black">{module}</span>
                              <p className="text-sm text-gray-600">
                                {modulePermissions.length} permissions available
                              </p>
                            </div>
                          </label>
                          <Badge className={`${allSelected
                            ? 'bg-black text-white'
                            : someSelected
                              ? 'bg-gray-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                            }`}>
                            {modulePermissions.filter(p => formData.selectedPermissions.includes(p.name)).length} / {modulePermissions.length}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          {modulePermissions.map((permission) => {
                            const isSelected = formData.selectedPermissions.includes(permission.name)

                            return (
                              <label
                                key={permission.id}
                                className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg border transition-all ${isSelected
                                  ? 'bg-gray-50 border-gray-300'
                                  : 'border-gray-200 hover:bg-gray-50'
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handlePermissionToggle(permission.name)}
                                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black mt-0.5"
                                  disabled={isLoading}
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-black">
                                    {permission.name}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {permission.description}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-black">Ready to {isEdit ? 'Update' : 'Create'} Role?</h3>
                <p className="text-sm text-gray-600">
                  {formData.selectedPermissions.length} permissions selected for this role
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || formData.selectedPermissions.length === 0}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isEdit ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <span>{isEdit ? 'Update Role' : 'Create Role'}</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}