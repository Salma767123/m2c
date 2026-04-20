'use client';

import WebsiteEnquiryManagement from '@/components/AdminDashboard/Enquiries/WebsiteEnquiryManagement';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard';

const WebsiteEnquiriesPage = () => {
  return (
    <PermissionGuard permission={["view_enquiries", "manage_enquiries"]}>
      <WebsiteEnquiryManagement />
    </PermissionGuard>
  );
};

export default WebsiteEnquiriesPage;
