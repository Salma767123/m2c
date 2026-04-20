'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import AddEditRole from '@/components/AdminDashboard/RolesPermissions/AddEditRole'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'
import { roleService, Role } from '@/services/roleService'

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
        // Backend doesn't expose a single-role endpoint, so pull the full list
        // and pick by id. The list is small (admin-managed).
        const res = await roleService.getRoles()
        if (res.success && Array.isArray(res.data)) {
          const found = res.data.find((r) => r.id === roleId)
          if (found) setRole(found)
          else setError('Role not found')
        } else {
          setError('Failed to load role')
        }
      } catch {
        setError('Failed to load role')
      } finally {
        setIsLoading(false)
      }
    }

    if (roleId) fetchRole()
  }, [roleId])

  return (
    <PermissionGuard permission={["edit_roles", "manage_settings"]}>
      <div className="space-y-6">
        <Breadcrumb />
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error || !role ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'Role not found'}
            </h2>
            <p className="text-gray-600">
              The role you&apos;re looking for doesn&apos;t exist or has been deleted.
            </p>
          </div>
        ) : (
          <AddEditRole role={role} isEdit={true} />
        )}
      </div>
    </PermissionGuard>
  )
}
