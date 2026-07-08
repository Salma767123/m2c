'use client';

import VendorEnquiryManagement from '@/components/AdminDashboard/Enquiries/VendorEnquiryManagement';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard';

const EnquiryFormPage = () => {
  return (
    <PermissionGuard permission="vendor_enquiries:view">
      <VendorEnquiryManagement />
    </PermissionGuard>
  );
};

export default EnquiryFormPage;
