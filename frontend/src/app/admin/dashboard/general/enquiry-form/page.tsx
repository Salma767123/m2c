'use client';

import VendorEnquiryManagement from '@/components/AdminDashboard/Enquiries/VendorEnquiryManagement';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard';

const EnquiryFormPage = () => {
  return (
    <PermissionGuard permission={["view_enquiries", "manage_enquiries"]}>
      <VendorEnquiryManagement />
    </PermissionGuard>
  );
};

export default EnquiryFormPage;
