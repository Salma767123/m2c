'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { AlertCircle, Store, Users, Shield, Minus, Check } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

import {
  roleService,
  Role,
  PermissionModule,
  PermissionSubmodule,
  PermissionAction,
  PERMISSION_ACTIONS,
} from '@/services/roleService'

interface AddEditRoleProps {
  role?: Role | null
  isEdit?: boolean
}

const MODULE_ICONS: Record<string, any> = {
  vendors: Store,
  customers: Users,
  admin: Shield,
}

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
}

const permName = (submoduleKey: string, action: string) => `${submoduleKey}:${action}`

export default function AddEditRole({ role, isEdit = false }: AddEditRoleProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedPermissions: [] as string[],
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [modules, setModules] = useState<PermissionModule[]>([])
  const [activeModuleKey, setActiveModuleKey] = useState<string>('')

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await roleService.getPermissions()
        if (res.success && res.modules) {
          setModules(res.modules)
          // Step 1 default: first module pre-selected so the matrix is visible
          if (res.modules.length > 0) setActiveModuleKey(res.modules[0].key)
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
        selectedPermissions: role.permissions.map(p => p.name),
      })
    }
  }, [role, isEdit])

  const selected = useMemo(() => new Set(formData.selectedPermissions), [formData.selectedPermissions])

  const allPermissionNames = useMemo(
    () =>
      modules.flatMap(m =>
        m.submodules.flatMap(s => [
          ...PERMISSION_ACTIONS.filter(a => s.actions[a]).map(a => permName(s.key, a)),
          ...(s.extra || []).map(x => permName(s.key, x.key)),
        ])
      ),
    [modules]
  )

  const activeModule = modules.find(m => m.key === activeModuleKey)

  const setSelection = (updater: (next: Set<string>) => void) => {
    setFormData(prev => {
      const next = new Set(prev.selectedPermissions)
      updater(next)
      return { ...prev, selectedPermissions: [...next] }
    })
    if (errors.permissions) setErrors(prev => ({ ...prev, permissions: '' }))
  }

  // Toggling any non-view action (incl. special buttons) implies view;
  // removing view clears the whole row.
  const toggleAction = (sub: PermissionSubmodule, action: string) => {
    const name = permName(sub.key, action)
    setSelection(next => {
      if (next.has(name)) {
        next.delete(name)
        if (action === 'view') {
          submodulePerms(sub).forEach(p => next.delete(p))
        }
      } else {
        next.add(name)
        if (action !== 'view' && sub.actions.view) {
          next.add(permName(sub.key, 'view'))
        }
      }
    })
  }

  const submodulePerms = (sub: PermissionSubmodule) => [
    ...PERMISSION_ACTIONS.filter(a => sub.actions[a]).map(a => permName(sub.key, a)),
    ...(sub.extra || []).map(x => permName(sub.key, x.key)),
  ]

  const toggleSubmoduleAll = (sub: PermissionSubmodule) => {
    const perms = submodulePerms(sub)
    const allOn = perms.every(p => selected.has(p))
    setSelection(next => {
      perms.forEach(p => (allOn ? next.delete(p) : next.add(p)))
    })
  }

  const moduleSelectedCount = (mod: PermissionModule) =>
    mod.submodules.reduce((sum, s) => sum + submodulePerms(s).filter(p => selected.has(p)).length, 0)

  const moduleTotalCount = (mod: PermissionModule) =>
    mod.submodules.reduce((sum, s) => sum + submodulePerms(s).length, 0)

  // Column select-all within the active module (e.g. every "view" it supports)
  const toggleColumn = (mod: PermissionModule, action: PermissionAction) => {
    const perms = mod.submodules.filter(s => s.actions[action]).map(s => permName(s.key, action))
    const allOn = perms.every(p => selected.has(p))
    setSelection(next => {
      perms.forEach(p => (allOn ? next.delete(p) : next.add(p)))
      if (!allOn && action !== 'view') {
        // keep the view-implied invariant
        mod.submodules
          .filter(s => s.actions[action] && s.actions.view)
          .forEach(s => next.add(permName(s.key, 'view')))
      }
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
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
                  {formData.selectedPermissions.length} of {allPermissionNames.length} selected
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
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      selectedPermissions: allPermissionNames.filter(p => p.endsWith(':view')),
                    }))
                  }
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  View Only
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      selectedPermissions: allPermissionNames.filter(p => !p.endsWith(':delete')),
                    }))
                  }
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Editor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData(prev => ({ ...prev, selectedPermissions: [...allPermissionNames] }))
                  }
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Full Access
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, selectedPermissions: [] }))}
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {modules.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">Loading permission modules…</div>
              ) : (
                <div className="space-y-5">
                  {/* Step 1 — pick a module */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Step 1 — Select a module
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {modules.map(mod => {
                        const Icon = MODULE_ICONS[mod.key] || Shield
                        const count = moduleSelectedCount(mod)
                        const total = moduleTotalCount(mod)
                        const isActive = mod.key === activeModuleKey
                        return (
                          <button
                            key={mod.key}
                            type="button"
                            onClick={() => setActiveModuleKey(mod.key)}
                            disabled={isLoading}
                            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left ${isActive
                              ? 'border-black bg-gray-50 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isActive ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                                }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-semibold text-black block">{mod.name}</span>
                                <span className="text-xs text-gray-500">
                                  {mod.submodules.length} submodules
                                </span>
                              </div>
                            </div>
                            <Badge className={count > 0 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}>
                              {count}/{total}
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Step 2 — submodule matrix */}
                  {activeModule && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Step 2 — Set access for each submodule
                      </p>
                      <div className="border border-gray-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left font-semibold text-gray-700 px-4 py-3 min-w-[220px]">
                                Submodule
                              </th>
                              {PERMISSION_ACTIONS.map(action => {
                                const colPerms = activeModule.submodules
                                  .filter(s => s.actions[action])
                                  .map(s => permName(s.key, action))
                                const colAllOn = colPerms.length > 0 && colPerms.every(p => selected.has(p))
                                return (
                                  <th key={action} className="px-3 py-3 text-center w-24">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="font-semibold text-gray-700">{ACTION_LABELS[action]}</span>
                                      {colPerms.length > 0 ? (
                                        <input
                                          type="checkbox"
                                          checked={colAllOn}
                                          onChange={() => toggleColumn(activeModule, action)}
                                          disabled={isLoading}
                                          title={`Toggle ${ACTION_LABELS[action]} for all submodules`}
                                          className="w-3.5 h-3.5 text-black border-gray-300 rounded focus:ring-black"
                                        />
                                      ) : (
                                        <span className="text-gray-300 text-xs">—</span>
                                      )}
                                    </div>
                                  </th>
                                )
                              })}
                              <th className="px-3 py-3 text-left min-w-[180px]">
                                <span className="font-semibold text-gray-700">Special buttons</span>
                              </th>
                              <th className="px-3 py-3 text-center w-20">
                                <span className="font-semibold text-gray-700">All</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeModule.submodules.map((sub, idx) => {
                              const perms = submodulePerms(sub)
                              const rowAllOn = perms.every(p => selected.has(p))
                              const rowSomeOn = perms.some(p => selected.has(p))
                              return (
                                <tr
                                  key={sub.key}
                                  className={`border-b border-gray-100 last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                                    } ${rowSomeOn ? '' : ''}`}
                                >
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-black">{sub.name}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{sub.description}</div>
                                  </td>
                                  {PERMISSION_ACTIONS.map(action => (
                                    <td key={action} className="px-3 py-3 text-center">
                                      {sub.actions[action] ? (
                                        <input
                                          type="checkbox"
                                          checked={selected.has(permName(sub.key, action))}
                                          onChange={() => toggleAction(sub, action)}
                                          disabled={isLoading}
                                          className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
                                        />
                                      ) : (
                                        // This submodule has no such action — shown as a hyphen by design
                                        <span
                                          className="inline-flex items-center justify-center text-gray-300 select-none"
                                          title={`${ACTION_LABELS[action]} is not applicable for ${sub.name}`}
                                        >
                                          <Minus className="w-4 h-4" />
                                        </span>
                                      )}
                                    </td>
                                  ))}
                                  <td className="px-3 py-3">
                                    {sub.extra && sub.extra.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {sub.extra.map(x => {
                                          const on = selected.has(permName(sub.key, x.key))
                                          return (
                                            <button
                                              key={x.key}
                                              type="button"
                                              onClick={() => toggleAction(sub, x.key)}
                                              disabled={isLoading}
                                              title={x.description || x.label}
                                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium transition-colors ${on
                                                ? 'bg-black border-black text-white'
                                                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                                                }`}
                                            >
                                              {on && <Check className="w-3 h-3" />}
                                              {x.label}
                                            </button>
                                          )
                                        })}
                                      </div>
                                    ) : (
                                      <span
                                        className="inline-flex items-center text-gray-300 select-none"
                                        title={`No special buttons for ${sub.name}`}
                                      >
                                        <Minus className="w-4 h-4" />
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => toggleSubmoduleAll(sub)}
                                      disabled={isLoading}
                                      title={rowAllOn ? 'Clear all access for this submodule' : 'Grant all available access for this submodule'}
                                      className={`inline-flex items-center justify-center h-6 w-6 rounded border transition-colors ${rowAllOn
                                        ? 'bg-black border-black text-white'
                                        : rowSomeOn
                                          ? 'bg-gray-200 border-gray-300 text-gray-600'
                                          : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
                                        }`}
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                        <Minus className="w-3.5 h-3.5 text-gray-400" />
                        means the action does not exist for that submodule. Special buttons are page-specific actions (Approve, Suspend, Mark as Paid…). Granting any action automatically grants View.
                      </p>
                    </div>
                  )}
                </div>
              )}
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
