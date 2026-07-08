'use client';

import WebsiteEnquiryManagement from '@/components/AdminDashboard/Enquiries/WebsiteEnquiryManagement';
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard';

const WebsiteEnquiriesPage = () => {
  return (
    <PermissionGuard permission="website_enquiries:view">
      <WebsiteEnquiryManagement />
    </PermissionGuard>
  );
};

export default WebsiteEnquiriesPage;
