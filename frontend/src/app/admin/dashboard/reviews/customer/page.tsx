import CustomerReviews from "@/components/AdminDashboard/Reviews/CustomerReviews";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function CustomerReviewsPage() {
  return (
    <PermissionGuard permission="view_reviews">
      <CustomerReviews />
    </PermissionGuard>
  );
}
