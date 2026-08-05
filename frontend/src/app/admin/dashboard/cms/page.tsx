import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function CMSPage() {
  return (
    <PermissionGuard permission="settings:edit">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Content Management System</h2>
          <p className="text-slate-600">The CMS module is currently under development.</p>
        </div>
      </div>
    </PermissionGuard>
  )
}
