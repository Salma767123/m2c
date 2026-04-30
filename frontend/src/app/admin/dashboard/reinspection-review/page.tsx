import ReinspectionReviewDashboard from '@/components/AdminDashboard/ReInspection/ReinspectionReviewDashboard';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard';

export default function ReinspectionReviewPage() {
  return (
    <PermissionGuard permission="view_reports">
      <ReinspectionReviewDashboard />
    </PermissionGuard>
  );
}
