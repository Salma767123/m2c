'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { hasPermission } from '@/lib/auth';

interface Vendor {
  id: string;
  email: string;
  companyName: string;
  ownerName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
}

export default function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch vendors from API
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      // This would be your actual API call
      // const response = await fetch('/api/vendors/all');
      // const data = await response.json();
      // setVendors(data.vendors);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setLoading(false);
    }
  };

  const handleApprove = async (vendorId: string) => {
    // API call to approve vendor
    console.log('Approving vendor:', vendorId);
  };

  const handleReject = async (vendorId: string) => {
    // API call to reject vendor
    console.log('Rejecting vendor:', vendorId);
  };

  if (loading) {
    return <div>Loading vendors...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Vendor Management</h1>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Pending Approvals</h2>
          {vendors.length === 0 ? (
            <p className="text-gray-500">No vendors found.</p>
          ) : (
            <div className="space-y-4">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{vendor.companyName}</h3>
                      <p className="text-sm text-gray-600">{vendor.ownerName}</p>
                      <p className="text-sm text-gray-600">{vendor.email}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={vendor.status === 'PENDING' ? 'default' : 'secondary'}>
                        {vendor.status}
                      </Badge>
                      {vendor.status === 'PENDING' && hasPermission('edit_vendors') && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(vendor.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(vendor.id)}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}