'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockOrders } from '../../mockData/orders';
import { Card, CardContent, CardHeader, CardTitle } from '../../UI/Card';
import Dropdown from '../../UI/Dropdown';

interface ShippingData {
  selectedItems: string[];
  adminHub: string;
  shippingCarrier: string;
  trackingNumber: string;
  packageConfirmed: boolean;
  notes: string;
}

interface CreateShippingProps {
  orderId: string;
}

const CreateShipping: React.FC<CreateShippingProps> = ({ orderId }) => {
  const router = useRouter();
  
  const order = mockOrders.find(o => o.id === orderId);
  
  if (!order) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
            <p className="text-gray-600 mb-4">The order you're looking for doesn't exist.</p>
            <button
              onClick={() => router.back()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter to show only vendor's items
  const vendorItems = order.items.filter(item => item.vendorId === 'vendor_001');

  const [shippingData, setShippingData] = useState<ShippingData>({
    selectedItems: vendorItems.map(item => item.id), // Auto-select all items
    adminHub: 'hub-001', // Auto-select default admin hub
    shippingCarrier: 'fedex', // Auto-select default carrier
    trackingNumber: '',
    packageConfirmed: false,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Hub options
  const adminHubOptions = [
    { value: 'hub-001', label: 'Main Admin Hub - Quality Control Center' },
    { value: 'hub-002', label: 'Secondary Hub - Processing Center' },
    { value: 'hub-003', label: 'Regional Hub - Distribution Center' }
  ];

  // Shipping Carrier options
  const shippingCarrierOptions = [
    { value: 'fedex', label: 'FedEx Express' },
    { value: 'ups', label: 'UPS Ground' },
    { value: 'usps', label: 'USPS Priority Mail' },
    { value: 'dhl', label: 'DHL Express' },
    { value: 'local', label: 'Local Courier Service' }
  ];

  // Auto-filled shipping address for selected admin hub
  const getShippingAddress = (hubId: string) => {
    switch (hubId) {
      case 'hub-001':
        return {
          name: 'Main Admin Hub - Quality Control',
          address: '123 Industrial Park Drive',
          city: 'Manufacturing City',
          state: 'MC',
          zipCode: '12345',
          country: 'USA',
          phone: '+1-555-HUB-001'
        };
      case 'hub-002':
        return {
          name: 'Secondary Hub - Processing',
          address: '456 Commerce Boulevard',
          city: 'Processing Town',
          state: 'PT',
          zipCode: '23456',
          country: 'USA',
          phone: '+1-555-HUB-002'
        };
      case 'hub-003':
        return {
          name: 'Regional Hub - Distribution',
          address: '789 Distribution Avenue',
          city: 'Regional Center',
          state: 'RC',
          zipCode: '34567',
          country: 'USA',
          phone: '+1-555-HUB-003'
        };
      default:
        return null;
    }
  };

  const selectedAddress = getShippingAddress(shippingData.adminHub);

  const handleItemToggle = (itemId: string) => {
    setShippingData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(itemId)
        ? prev.selectedItems.filter(id => id !== itemId)
        : [...prev.selectedItems, itemId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shippingData.packageConfirmed) {
      alert('Please confirm the package before submitting.');
      return;
    }

    if (shippingData.selectedItems.length === 0) {
      alert('Please select at least one item to ship.');
      return;
    }

    if (!shippingData.trackingNumber.trim()) {
      alert('Please enter a tracking number.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get selected address
      const selectedAddress = getShippingAddress(shippingData.adminHub);
      
      // Get selected items details
      const selectedItemsDetails = vendorItems
        .filter(item => shippingData.selectedItems.includes(item.id))
        .map(item => ({
          id: item.id,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity
        }));
      
      // Save shipping details to localStorage
      const shippingDetails = {
        trackingNumber: shippingData.trackingNumber,
        shippingCarrier: shippingCarrierOptions.find(c => c.value === shippingData.shippingCarrier)?.label || '',
        adminHub: adminHubOptions.find(h => h.value === shippingData.adminHub)?.label || '',
        shippingAddress: selectedAddress,
        shippedDate: new Date().toISOString(),
        items: selectedItemsDetails,
        notes: shippingData.notes
      };
      
      localStorage.setItem(`shipping_${orderId}`, JSON.stringify(shippingDetails));
      
      // Navigate back to order detail page
      router.push(`/vendor/dashboard/orders/${orderId}`);
    } catch (error) {
      console.error('Error creating shipping:', error);
      alert('Error creating shipping. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 transition-colors mb-2 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Order Details
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create Shipping</h1>
          <p className="text-gray-600">Order ID: {order.orderId}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Items Selection */}
        <div className="space-y-6">
          {/* Items to Ship */}
          <Card>
            <CardHeader>
              <CardTitle>Items to Ship ({vendorItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorItems.map((item) => (
                  <div key={item.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`item-${item.id}`}
                        checked={shippingData.selectedItems.includes(item.id)}
                        onChange={() => handleItemToggle(item.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">{item.productName}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">SKU:</span> {item.sku}
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span> {item.quantity}
                        </div>
                        {item.size && (
                          <div>
                            <span className="font-medium">Size:</span> {item.size}
                          </div>
                        )}
                        {item.color && (
                          <div>
                            <span className="font-medium">Color:</span> {item.color}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Package Confirmation */}
          <Card>
            <CardHeader>
              <CardTitle>Package Confirmation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="package-confirmed"
                    checked={shippingData.packageConfirmed}
                    onChange={(e) => setShippingData(prev => ({ ...prev, packageConfirmed: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                  <label htmlFor="package-confirmed" className="text-sm text-gray-700">
                    <span className="font-medium">I confirm that:</span>
                    <ul className="mt-2 space-y-1 text-gray-600">
                      <li>• All selected items are properly packaged</li>
                      <li>• Items are securely wrapped and protected</li>
                      <li>• Package is ready for shipment to Admin Hub</li>
                      <li>• All items match the order specifications</li>
                    </ul>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={shippingData.notes}
                onChange={(e) => setShippingData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any special instructions or notes for the Admin Hub..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Shipping Details */}
        <div className="space-y-6">
          {/* Admin Hub Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Admin Hub</CardTitle>
            </CardHeader>
            <CardContent>
              <Dropdown
                value={shippingData.adminHub}
                options={adminHubOptions}
                onChange={(value) => setShippingData(prev => ({ ...prev, adminHub: value as string }))}
                placeholder="Select Admin Hub"
              />
            </CardContent>
          </Card>

          {/* Shipping Carrier Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Shipping Carrier</CardTitle>
            </CardHeader>
            <CardContent>
              <Dropdown
                value={shippingData.shippingCarrier}
                options={shippingCarrierOptions}
                onChange={(value) => setShippingData(prev => ({ ...prev, shippingCarrier: value as string }))}
                placeholder="Select Shipping Carrier"
              />
            </CardContent>
          </Card>

          {/* Tracking Number Input */}
          <Card>
            <CardHeader>
              <CardTitle>Tracking Number</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="text"
                value={shippingData.trackingNumber}
                onChange={(e) => setShippingData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                placeholder="Enter tracking number (e.g., 1Z999AA10123456784)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Enter the tracking number provided by your shipping carrier
              </p>
            </CardContent>
          </Card>

          {/* Auto-filled Shipping Address */}
          {selectedAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900 mb-2">{selectedAddress.name}</p>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>{selectedAddress.address}</p>
                    <p>{selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}</p>
                    <p>{selectedAddress.country}</p>
                    <p className="font-medium">Phone: {selectedAddress.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shipping Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium">{order.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Selected Items:</span>
                  <span className="font-medium">{shippingData.selectedItems.length} of {vendorItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Destination:</span>
                  <span className="font-medium">Admin Hub</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping Carrier:</span>
                  <span className="font-medium">
                    {shippingCarrierOptions.find(c => c.value === shippingData.shippingCarrier)?.label || 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tracking Number:</span>
                  <span className="font-medium font-mono">
                    {shippingData.trackingNumber || 'Not entered'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Purpose:</span>
                  <span className="font-medium">Quality Control</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Package Confirmed:</span>
                  <span className={`font-medium ${shippingData.packageConfirmed ? 'text-green-600' : 'text-red-600'}`}>
                    {shippingData.packageConfirmed ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent>
              <button
                type="submit"
                disabled={isSubmitting || !shippingData.packageConfirmed || shippingData.selectedItems.length === 0 || !shippingData.trackingNumber.trim()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Creating Shipping...' : 'Submit Shipping'}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This will save the shipping details and return to order view
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default CreateShipping;
