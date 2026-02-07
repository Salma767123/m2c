'use client';

import { use } from 'react';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockOrders, Order, OrderStatus, getStatusColor, getStatusLabel } from '../../../../../components/mockData/orders';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/UI/Card';

interface ShippingDetails {
  trackingNumber: string;
  shippingCarrier: string;
  adminHub: string;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
  shippedDate: string;
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: number;
  }>;
}

export default function VendorOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params);
  const router = useRouter();
  const [orders] = useState<Order[]>(mockOrders);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [shippingDetails, setShippingDetails] = useState<ShippingDetails | null>(null);
  
  const order = orders.find(o => o.id === orderId);

  // Load shipping details from localStorage
  useEffect(() => {
    const storedShipping = localStorage.getItem(`shipping_${orderId}`);
    if (storedShipping) {
      setShippingDetails(JSON.parse(storedShipping));
    }
  }, [orderId]);

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

  const handleCreateShipping = () => {
    router.push(`/vendor/dashboard/orders/${orderId}/create-shipping`);
  };

  const handleEditShipping = () => {
    router.push(`/vendor/dashboard/orders/${orderId}/create-shipping`);
  };

  const handleProcessed = () => {
    // Get shipping details from localStorage (set by create-shipping page)
    const storedShipping = localStorage.getItem(`shipping_${orderId}`);
    if (storedShipping) {
      setShippingDetails(JSON.parse(storedShipping));
    }
    setShowProcessModal(true);
  };

  const handlePrintShippingLabel = () => {
    if (!shippingDetails) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shipping Label - ${order.orderId}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 600px;
              margin: 0 auto;
            }
            .label-container {
              border: 2px solid #000;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .tracking {
              font-size: 24px;
              font-weight: bold;
              margin: 10px 0;
            }
            .carrier {
              font-size: 18px;
              color: #2563eb;
              margin: 5px 0;
            }
            .section {
              margin: 20px 0;
            }
            .section-title {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 10px;
              text-transform: uppercase;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            .address {
              font-size: 16px;
              line-height: 1.6;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .items-table th,
            .items-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            .items-table th {
              background-color: #f2f2f2;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="header">
              <h1>SHIPPING LABEL</h1>
              <div class="carrier">${shippingDetails.shippingCarrier}</div>
              <div class="tracking">${shippingDetails.trackingNumber}</div>
              <div>Order ID: ${order.orderId}</div>
            </div>

            <div class="section">
              <div class="section-title">Ship To:</div>
              <div class="address">
                <strong>${shippingDetails.shippingAddress.name}</strong><br>
                ${shippingDetails.shippingAddress.address}<br>
                ${shippingDetails.shippingAddress.city}, ${shippingDetails.shippingAddress.state} ${shippingDetails.shippingAddress.zipCode}<br>
                ${shippingDetails.shippingAddress.country}<br>
                Phone: ${shippingDetails.shippingAddress.phone}
              </div>
            </div>

            <div class="section">
              <div class="section-title">Package Contents:</div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  ${shippingDetails.items.map(item => `
                    <tr>
                      <td>${item.productName}</td>
                      <td>${item.sku}</td>
                      <td>${item.quantity}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Shipping Information:</div>
              <div>
                <strong>Carrier:</strong> ${shippingDetails.shippingCarrier}<br>
                <strong>Destination:</strong> ${shippingDetails.adminHub}<br>
                <strong>Shipped Date:</strong> ${new Date(shippingDetails.shippedDate).toLocaleDateString()}<br>
                <strong>Purpose:</strong> Quality Control & Inspection
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleModalOk = () => {
    handlePrintShippingLabel();
    setShowProcessModal(false);
  };

  const getActionButton = () => {
    if (order.status === OrderStatus.PACKED_BY_VENDOR) {
      // Show "Create Shipping" if no shipping details exist
      if (!shippingDetails) {
        return (
          <button
            onClick={handleCreateShipping}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Shipping
          </button>
        );
      }
      // Show "Process" if shipping details exist
      return (
        <button
          onClick={handleProcessed}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Process
        </button>
      );
    }
    
    if (order.status === OrderStatus.IN_TRANSIT_TO_ADMIN_HUB && order.trackingReference) {
      return (
        <button
          onClick={handleProcessed}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Process
        </button>
      );
    }
    
    return null;
  };

  return (
    <>
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
              Back to Orders
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
            <p className="text-gray-600">Order ID: {order.orderId}</p>
          </div>
        </div>

        {/* Current Status at Top */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">
                  {order.status === OrderStatus.ORDER_CREATED && '📋'}
                  {order.status === OrderStatus.VENDOR_PROCESSING && '⚙️'}
                  {order.status === OrderStatus.PACKED_BY_VENDOR && '📦'}
                  {order.status === OrderStatus.IN_TRANSIT_TO_ADMIN_HUB && '🚚'}
                  {order.status === OrderStatus.RECEIVED_AT_ADMIN_HUB && '🏢'}
                  {order.status === OrderStatus.APPROVED_BY_ADMIN_HUB && '✅'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getStatusLabel(order.status)}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {order.status === OrderStatus.ORDER_CREATED && 'New order received - ready to process'}
                    {order.status === OrderStatus.VENDOR_PROCESSING && 'Order is being processed'}
                    {order.status === OrderStatus.PACKED_BY_VENDOR && 'Ready to create shipping to Admin Hub'}
                    {order.status === OrderStatus.IN_TRANSIT_TO_ADMIN_HUB && 'Package is on the way to Admin Hub'}
                    {order.status === OrderStatus.RECEIVED_AT_ADMIN_HUB && 'Package received at Admin Hub for quality check'}
                    {order.status === OrderStatus.APPROVED_BY_ADMIN_HUB && 'Quality approved - ready for customer delivery'}
                  </p>
                </div>
              </div>
              <div>
                {getActionButton()}
              </div>
            </div>
          </CardContent>
        </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Order Info */}
        <div className="space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium">{order.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date:</span>
                  <span className="font-medium">{new Date(order.orderDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-medium">{vendorItems.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items - Products with Details */}
          <Card>
            <CardHeader>
              <CardTitle>Items to Ship ({vendorItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorItems.map((item) => (
                  <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-4">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-20 h-20 object-cover rounded"
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information (if exists) */}
          {shippingDetails && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Shipping Details</CardTitle>
                  <button
                    onClick={handleEditShipping}
                    className="text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50"
                    title="Edit Shipping Details"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tracking Number:</span>
                    <span className="font-mono font-medium">{shippingDetails.trackingNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping Carrier:</span>
                    <span className="font-medium">{shippingDetails.shippingCarrier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Destination:</span>
                    <span className="font-medium">{shippingDetails.adminHub}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping Status:</span>
                    <span className="font-medium text-orange-600">Ready to Ship</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created Date:</span>
                    <span className="font-medium">
                      {new Date(shippingDetails.shippedDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-gray-600 mb-2">Shipping Address:</p>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">{shippingDetails.shippingAddress.name}</p>
                      <p className="text-gray-700">{shippingDetails.shippingAddress.address}</p>
                      <p className="text-gray-700">
                        {shippingDetails.shippingAddress.city}, {shippingDetails.shippingAddress.state} {shippingDetails.shippingAddress.zipCode}
                      </p>
                      <p className="text-gray-700">{shippingDetails.shippingAddress.country}</p>
                      <p className="text-gray-700">Phone: {shippingDetails.shippingAddress.phone}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Process Flow */}
        <div className="space-y-6">
          {/* Process Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Process</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                  order.status === OrderStatus.PACKED_BY_VENDOR ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    order.status === OrderStatus.PACKED_BY_VENDOR ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Create Shipping</h4>
                    <p className="text-sm text-gray-600">Generate shipping label and package details</p>
                  </div>
                </div>

                <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                  order.status === OrderStatus.IN_TRANSIT_TO_ADMIN_HUB ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    order.status === OrderStatus.IN_TRANSIT_TO_ADMIN_HUB ? 'bg-orange-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">In Transit</h4>
                    <p className="text-sm text-gray-600">Package shipped to Admin Hub</p>
                  </div>
                </div>

                <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                  [OrderStatus.RECEIVED_AT_ADMIN_HUB, OrderStatus.APPROVED_BY_ADMIN_HUB].includes(order.status) ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    [OrderStatus.RECEIVED_AT_ADMIN_HUB, OrderStatus.APPROVED_BY_ADMIN_HUB].includes(order.status) ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Admin Processing</h4>
                    <p className="text-sm text-gray-600">Quality check and approval</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Review (if exists) */}
          {order.adminReview && (
            <Card>
              <CardHeader>
                <CardTitle>Quality Review Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.adminReview.approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {order.adminReview.approved ? 'Approved' : 'Rejected'}
                    </span>
                  </div>
                  {order.adminReview.rating && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quality Rating:</span>
                      <span>
                        {'⭐'.repeat(order.adminReview.rating)} ({order.adminReview.rating}/5)
                      </span>
                    </div>
                  )}
                  {order.adminReview.reviewComments && (
                    <div>
                      <span className="text-gray-600">Feedback:</span>
                      <p className="mt-1 text-gray-900">{order.adminReview.reviewComments}</p>
                    </div>
                  )}
                  {order.adminReview.reviewedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reviewed:</span>
                      <span>{new Date(order.adminReview.reviewedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>

      {/* Process Modal */}
      {showProcessModal && shippingDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Shipping Details</h2>
                <button
                  onClick={() => setShowProcessModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Tracking Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Tracking Information</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Tracking Number</p>
                      <p className="text-xl font-mono font-bold text-blue-600">{shippingDetails.trackingNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Shipping Carrier</p>
                      <p className="text-lg font-medium text-gray-900">{shippingDetails.shippingCarrier}</p>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Shipping Address</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium text-gray-900">{shippingDetails.shippingAddress.name}</p>
                    <p className="text-gray-700 mt-2">{shippingDetails.shippingAddress.address}</p>
                    <p className="text-gray-700">
                      {shippingDetails.shippingAddress.city}, {shippingDetails.shippingAddress.state} {shippingDetails.shippingAddress.zipCode}
                    </p>
                    <p className="text-gray-700">{shippingDetails.shippingAddress.country}</p>
                    <p className="text-gray-700 mt-2">Phone: {shippingDetails.shippingAddress.phone}</p>
                  </div>
                </div>

                {/* Package Items */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Package Contents</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    {shippingDetails.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center border-b border-gray-200 pb-2 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                        </div>
                        <p className="text-gray-900 font-medium">Qty: {item.quantity}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Shipping Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Carrier:</span>
                      <span className="font-medium text-gray-900">{shippingDetails.shippingCarrier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Destination:</span>
                      <span className="font-medium text-gray-900">{shippingDetails.adminHub}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipped Date:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(shippingDetails.shippedDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purpose:</span>
                      <span className="font-medium text-gray-900">Quality Control & Inspection</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleModalOk}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  OK - Print Shipping Label
                </button>
                <button
                  onClick={() => setShowProcessModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}