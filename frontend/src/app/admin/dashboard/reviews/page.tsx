import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Filter } from 'lucide-react'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function ReviewsPage() {
  return (
    <PermissionGuard permission="view_reviews">
      <div className="space-y-6">
        <Breadcrumb />

        <div className="flex justify-end">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter Reviews
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reviews Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Reviews management interface will be implemented here...</p>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
