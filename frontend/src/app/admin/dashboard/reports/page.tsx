import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Download } from 'lucide-react'
import Report from '@/components/AdminDashboard/Reports/AdminReports'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />
      <Report />
    </div>
  )
}