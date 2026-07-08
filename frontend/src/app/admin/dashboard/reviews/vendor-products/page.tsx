import VendorProductReviews from "@/components/AdminDashboard/Reviews/VendorProductReviews";
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default function VendorProductReviewsPage() {
  return (
    <PermissionGuard permission="vendor_product_reviews:view">
      <VendorProductReviews />
    </PermissionGuard>
  );
}
