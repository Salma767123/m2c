'use client';

import React, { useState } from 'react';
import { mockOrders, Order, OrderStatus, getStatusColor, getStatusLabel } from '../../mockData/orders';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../UI/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../UI/Table';
import Dropdown from '../../UI/Dropdown';

const VendorOrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  // Filter orders for current vendor (in real app, this would be based on logged-in vendor)
  const vendorOrders = orders.filter(order => 
    order.vendorId === 'vendor_001' || order.items.some(item => item.vendorId === 'vendor_001')
  );

  const filteredOrders = vendorOrders.filter(order => {
    const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;
    const matchesSearch = 
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const handleViewOrder = (orderId: string) => {
    router.push(`/vendor/dashboard/orders/${orderId}`);
  };

  const handleProcessOrder = (orderId: string) => {
    // Get shipping details from localStorage
    if (typeof window === 'undefined') return;
    
    const storedShipping = localStorage.getItem(`shipping_${orderId}`);
    if (!storedShipping) {
      alert('No shipping details found. Please create shipping first.');
      return;
    }

    const shippingDetails = JSON.parse(storedShipping);
    const order = orders.find(o => o.id === orderId);
    
    if (!order) return;

    // Open print window
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
                  ${shippingDetails.items.map((item: any) => `
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

  const hasShippingDetails = (orderId: string) => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`shipping_${orderId}`) !== null;
  };

  // Status options for dropdown
  const statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    ...Object.values(OrderStatus).map(status => ({
      value: status,
      label: getStatusLabel(status)
    }))
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-600 mt-1">Track and manage your customer orders</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{vendorOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vendorOrders.filter(o => [OrderStatus.ORDER_CREATED, OrderStatus.VENDOR_PROCESSING].includes(o.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vendorOrders.filter(o => o.status === OrderStatus.DELIVERED).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${vendorOrders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by Order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="w-full sm:w-64">
              <Dropdown
                value={filterStatus}
                options={statusOptions}
                onChange={(value) => setFilterStatus(value as string)}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{order.orderId}</div>
                    {order.trackingReference && (
                      <div className="text-xs text-blue-600">
                        Tracking: {order.trackingReference}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {new Date(order.orderDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.orderDate).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {vendorOrders.find(o => o.id === order.id)?.items.filter(item => item.vendorId === 'vendor_001').length || 0} Products
                      </div>
                      <div className="text-xs text-gray-600">
                        {vendorOrders.find(o => o.id === order.id)?.items
                          .filter(item => item.vendorId === 'vendor_001')
                          .reduce((sum, item) => sum + item.quantity, 0) || 0} Total Items
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewOrder(order.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        View
                      </button>
                      {hasShippingDetails(order.id) && (
                        <button
                          onClick={() => handleProcessOrder(order.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                        >
                          Proceed
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">No orders found</p>
                <p className="text-sm">Orders will appear here once customers place them</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorOrderManagement;