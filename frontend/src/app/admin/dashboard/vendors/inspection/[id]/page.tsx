import VendorInspectionDetail from "@/components/AdminDashboard/Vendors/VendorInspectionDetail";

export default async function VendorInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VendorInspectionDetail vendorId={id} />;
}
