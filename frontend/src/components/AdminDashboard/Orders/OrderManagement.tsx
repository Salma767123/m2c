'use client';

import React, { useState } from 'react';
import { mockOrders, Order, OrderStatus, getStatusColor, getStatusLabel, getPaymentStatusColor } from '../../mockData/orders';
import AdminReviewModal, { AdminReviewData } from './AdminReviewModal';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '../../UI/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../UI/Table';
import Dropdown from '../../UI/Dropdown';
import { Breadcrumb } from '../Breadcrumb/Breadcrumb';

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const handleReviewSubmit = async (reviewData: AdminReviewData) => {
    if (!selectedOrder) return;

    const updatedOrder: Order = {
      ...selectedOrder,
      status: reviewData.approved ? OrderStatus.APPROVED_BY_ADMIN_HUB : OrderStatus.REJECTED_BY_ADMIN_HUB,
      adminReview: {
        id: `review_${Date.now()}`,
        reviewComments: reviewData.reviewComments,
        qualityCheckNotes: reviewData.qualityCheckNotes,
        rating: reviewData.rating,
        approved: reviewData.approved,
        reviewedBy: 'admin_current',
        reviewedAt: new Date().toISOString(),
        rejectionReason: reviewData.rejectionReason,
        returnToVendor: !reviewData.approved
      },
      statusHistory: [
        ...selectedOrder.statusHistory,
        {
          id: `hist_${Date.now()}`,
          status: reviewData.approved ? OrderStatus.APPROVED_BY_ADMIN_HUB : OrderStatus.REJECTED_BY_ADMIN_HUB,
          comment: reviewData.approved 
            ? 'Quality check passed - approved for customer shipment'
            : `Quality check failed - ${reviewData.rejectionReason}`,
          updatedBy: 'admin_current',
          updatedByType: 'admin',
          timestamp: new Date().toISOString()
        }
      ]
    };

    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === selectedOrder.id ? updatedOrder : order
      )
    );

    setIsReviewModalOpen(false);
    setSelectedOrder(null);
  };

  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus, comment?: string) => {
    setOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            status: newStatus,
            statusHistory: [
              ...order.statusHistory,
              {
                id: `hist_${Date.now()}`,
                status: newStatus,
                comment: comment || `Status updated to ${getStatusLabel(newStatus)}`,
                updatedBy: 'admin_current',
                updatedByType: 'admin',
                timestamp: new Date().toISOString()
              }
            ]
          };
        }
        return order;
      })
    );
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/admin/dashboard/orders/${orderId}`);
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;
    const matchesSearch = 
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getOrderStatusActions = (order: Order) => {
    switch (order.status) {
      case OrderStatus.RECEIVED_AT_ADMIN_HUB:
        return (
          <button
            onClick={() => {
              setSelectedOrder(order);
              setIsReviewModalOpen(true);
            }}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
          >
            Review Quality
          </button>
        );
      case OrderStatus.APPROVED_BY_ADMIN_HUB:
        return (
          <button
            onClick={() => handleStatusUpdate(order.id, OrderStatus.SHIPPED_TO_CUSTOMER, 'Shipped to customer')}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
          >
            Ship to Customer
          </button>
        );
      case OrderStatus.SHIPPED_TO_CUSTOMER:
        return (
          <button
            onClick={() => handleStatusUpdate(order.id, OrderStatus.DELIVERED, 'Order delivered to customer')}
            className="bg-teal-600 text-white px-3 py-1 rounded text-sm hover:bg-teal-700 transition-colors"
          >
            Mark Delivered
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <Breadcrumb />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Management</h1>
        <p className="text-gray-600">Manage and track all customer orders through the fulfillment process</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => o.status === OrderStatus.RECEIVED_AT_ADMIN_HUB && !o.adminReview).length}
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
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => o.status === OrderStatus.DELIVERED).length}
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
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by Order ID, Customer Name, or Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="sm:w-64">
              <Dropdown
                value={filterStatus}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  ...Object.values(OrderStatus).map(status => ({
                    value: status,
                    label: getStatusLabel(status)
                  }))
                ]}
                placeholder="Filter by Status"
                onChange={(value) => setFilterStatus(value as OrderStatus | 'ALL')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Details</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{order.orderId}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </div>
                    {order.trackingReference && (
                      <div className="text-xs text-blue-600">
                        Tracking: {order.trackingReference}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerEmail}</div>
                    <div className="text-sm text-gray-500">{order.customerPhone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-gray-500 max-w-xs">
                    {order.items.map(item => item.productName).join(', ')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-gray-900">
                    ${order.totalAmount.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Subtotal: ${order.subtotal.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                  {order.status === OrderStatus.RECEIVED_AT_ADMIN_HUB && !order.adminReview && (
                    <div className="text-xs text-red-600 mt-1 font-medium">
                      ⚠️ Needs Review
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                    {order.paymentStatus}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {getOrderStatusActions(order)}
                    <button
                      onClick={() => handleViewOrder(order.id)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View
                    </button>
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
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          </div>
        )}
      </Card>

      {/* Admin Review Modal */}
      {selectedOrder && (
        <AdminReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onSubmitReview={handleReviewSubmit}
        />
      )}
    </div>
  );
};

export default OrderManagement;