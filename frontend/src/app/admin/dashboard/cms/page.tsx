import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'

export default function CMSPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Content Management System</h2>
        <p className="text-gray-600">The CMS module is currently under development.</p>
      </div>
    </div>
  )
}