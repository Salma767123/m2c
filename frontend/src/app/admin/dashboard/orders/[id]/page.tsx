'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { mockOrders, Order, OrderStatus, getStatusColor, getStatusLabel } from '../../../../../components/mockData/orders';
import AdminReviewModal, { AdminReviewData } from '../../../../../components/AdminDashboard/Orders/AdminReviewModal';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/UI/Card';
import { 
  FileText, 
  Factory, 
  Package, 
  Truck, 
  Building2, 
  CheckCircle, 
  XCircle, 
  Home,
  ClipboardList,
  ArrowLeft
} from 'lucide-react';

const AdminOrderDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-4">The order you're looking for doesn't exist.</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleReviewSubmit = async (reviewData: AdminReviewData) => {
    const updatedOrder: Order = {
      ...order,
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
        ...order.statusHistory,
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
      prevOrders.map(o => 
        o.id === order.id ? updatedOrder : o
      )
    );

    setIsReviewModalOpen(false);
    setSelectedOrder(null);
  };

  const handleStatusUpdate = (newStatus: OrderStatus, comment?: string) => {
    const updatedOrder = {
      ...order,
      status: newStatus,
      statusHistory: [
        ...order.statusHistory,
        {
          id: `hist_${Date.now()}`,
          status: newStatus,
          comment: comment || `Status updated to ${getStatusLabel(newStatus)}`,
          updatedBy: 'admin_current',
          updatedByType: 'admin' as const,
          timestamp: new Date().toISOString()
        }
      ]
    };

    setOrders(prevOrders =>
      prevOrders.map(o => o.id === order.id ? updatedOrder : o)
    );
  };

  const getStatusIcon = (status: OrderStatus) => {
    const iconClass = "w-5 h-5";
    switch (status) {
      case OrderStatus.ORDER_CREATED:
        return <FileText className={iconClass} />;
      case OrderStatus.VENDOR_PROCESSING:
        return <Factory className={iconClass} />;
      case OrderStatus.PACKED_BY_VENDOR:
        return <Package className={iconClass} />;
      case OrderStatus.IN_TRANSIT_TO_ADMIN_HUB:
        return <Truck className={iconClass} />;
      case OrderStatus.RECEIVED_AT_ADMIN_HUB:
        return <Building2 className={iconClass} />;
      case OrderStatus.APPROVED_BY_ADMIN_HUB:
        return <CheckCircle className={iconClass} />;
      case OrderStatus.REJECTED_BY_ADMIN_HUB:
        return <XCircle className={iconClass} />;
      case OrderStatus.SHIPPED_TO_CUSTOMER:
        return <Truck className={iconClass} />;
      case OrderStatus.DELIVERED:
        return <Home className={iconClass} />;
      default:
        return <ClipboardList className={iconClass} />;
    }
  };

  const orderSteps = [
    {
      status: OrderStatus.ORDER_CREATED,
      title: 'Order Created',
      description: 'Customer placed the order',
      icon: <FileText className="w-5 h-5" />
    },
    {
      status: OrderStatus.VENDOR_PROCESSING,
      title: 'Vendor Processing',
      description: 'Vendor confirmed and processing order',
      icon: <Factory className="w-5 h-5" />
    },
    {
      status: OrderStatus.PACKED_BY_VENDOR,
      title: 'Packed by Vendor',
      description: 'Products packed and ready for shipment',
      icon: <Package className="w-5 h-5" />
    },
    {
      status: OrderStatus.IN_TRANSIT_TO_ADMIN_HUB,
      title: 'In Transit to Admin Hub',
      description: 'Shipped from vendor to admin hub',
      icon: <Truck className="w-5 h-5" />
    },
    {
      status: OrderStatus.RECEIVED_AT_ADMIN_HUB,
      title: 'Received at Admin Hub',
      description: 'Package received for quality check',
      icon: <Building2 className="w-5 h-5" />
    },
    {
      status: OrderStatus.APPROVED_BY_ADMIN_HUB,
      title: 'Approved by Admin Hub',
      description: 'Quality check passed, ready for customer',
      icon: <CheckCircle className="w-5 h-5" />
    },
    {
      status: OrderStatus.SHIPPED_TO_CUSTOMER,
      title: 'Shipped to Customer',
      description: 'Package shipped to customer address',
      icon: <Truck className="w-5 h-5" />
    },
    {
      status: OrderStatus.DELIVERED,
      title: 'Delivered',
      description: 'Order delivered to customer',
      icon: <Home className="w-5 h-5" />
    }
  ];

  const getCurrentStepIndex = () => {
    return orderSteps.findIndex(step => step.status === order.status);
  };

  const currentStepIndex = getCurrentStepIndex();

  const getOrderStatusActions = () => {
    switch (order.status) {
      case OrderStatus.RECEIVED_AT_ADMIN_HUB:
        return (
          <button
            onClick={() => {
              setSelectedOrder(order);
              setIsReviewModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Review Quality
          </button>
        );
      case OrderStatus.APPROVED_BY_ADMIN_HUB:
        return (
          <button
            onClick={() => handleStatusUpdate(OrderStatus.SHIPPED_TO_CUSTOMER, 'Shipped to customer')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Ship to Customer
          </button>
        );
      case OrderStatus.SHIPPED_TO_CUSTOMER:
        return (
          <button
            onClick={() => handleStatusUpdate(OrderStatus.DELIVERED, 'Order delivered to customer')}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 transition-colors mb-2 flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Orders
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          <p className="text-gray-600">Order ID: {order.orderId}</p>
        </div>
        <div className="flex space-x-3">
          {getOrderStatusActions()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Order Info */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{order.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{order.customerPhone}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-base">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 text-sm">
              <p className="font-medium">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.address}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
              <p>{order.shippingAddress.country}</p>
              <p className="mt-2 text-gray-600">Phone: {order.shippingAddress.phone}</p>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.productName}</h4>
                    <p className="text-sm text-gray-600">
                      SKU: {item.sku} | Qty: {item.quantity}
                      {item.size && ` | Size: ${item.size}`}
                      {item.color && ` | Color: ${item.color}`}
                    </p>
                    <p className="text-sm text-gray-600">Vendor: {item.vendorName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${item.totalPrice.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">${item.unitPrice.toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>${order.shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold text-base">
                <span>Total:</span>
                <span>${order.totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Admin Review (if exists) */}
          {order.adminReview && (
            <Card>
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-base">Admin Review</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-3 text-sm">
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
                    <span className="text-gray-600">Rating:</span>
                    <span>
                      {'⭐'.repeat(order.adminReview.rating)} ({order.adminReview.rating}/5)
                    </span>
                  </div>
                )}
                {order.adminReview.reviewComments && (
                  <div>
                    <span className="text-gray-600">Comments:</span>
                    <p className="mt-1 text-gray-900">{order.adminReview.reviewComments}</p>
                  </div>
                )}
                {order.adminReview.qualityCheckNotes && (
                  <div>
                    <span className="text-gray-600">Quality Notes:</span>
                    <p className="mt-1 text-gray-900">{order.adminReview.qualityCheckNotes}</p>
                  </div>
                )}
                {order.adminReview.rejectionReason && (
                  <div>
                    <span className="text-gray-600">Rejection Reason:</span>
                    <p className="mt-1 text-red-700">{order.adminReview.rejectionReason}</p>
                  </div>
                )}
                {order.adminReview.reviewedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reviewed:</span>
                    <span>{new Date(order.adminReview.reviewedAt).toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Order Flow */}
        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-base">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="flex items-center space-x-4">
                <div className="text-blue-600">{getStatusIcon(order.status)}</div>
                <div>
                  <p className="font-medium text-gray-900 text-lg">{getStatusLabel(order.status)}</p>
                  <p className="text-sm text-gray-600">
                    Updated: {new Date(order.statusHistory[order.statusHistory.length - 1]?.timestamp || order.orderDate).toLocaleString()}
                  </p>
                </div>
              </div>
              {order.trackingReference && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-600">Tracking Reference:</span>
                  <span className="ml-2 font-mono text-sm font-medium">{order.trackingReference}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Flow Timeline */}
          <Card>
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-base">Order Flow Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              {orderSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isRejected = order.status === OrderStatus.REJECTED_BY_ADMIN_HUB && step.status === OrderStatus.REJECTED_BY_ADMIN_HUB;
                
                return (
                  <div key={step.status} className="flex items-start space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isRejected 
                          ? 'bg-red-100 border-2 border-red-500 text-red-600' 
                          : isCompleted 
                            ? 'bg-green-100 border-2 border-green-500 text-green-600' 
                            : isCurrent 
                              ? 'bg-blue-100 border-2 border-blue-500 text-blue-600' 
                              : 'bg-gray-100 border-2 border-gray-300 text-gray-400'
                      }`}>
                        {step.icon}
                      </div>
                      {index < orderSteps.length - 1 && (
                        <div className={`w-0.5 h-8 mt-2 ${
                          isCompleted ? 'bg-green-300' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <h4 className={`font-medium ${
                        isRejected 
                          ? 'text-red-700' 
                          : isCompleted 
                            ? 'text-green-700' 
                            : isCurrent 
                              ? 'text-blue-700' 
                              : 'text-gray-500'
                      }`}>
                        {step.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      {isCurrent && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mt-2">
                          Current Step
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-base">Status History</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-3 max-h-64 overflow-y-auto">
              {order.statusHistory.slice().reverse().map((history) => (
                <div key={history.id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="text-gray-600">{getStatusIcon(history.status)}</div>
                        <span className="font-medium text-gray-900">{getStatusLabel(history.status)}</span>
                      </div>
                      {history.comment && (
                        <p className="text-sm text-gray-600 mt-1">{history.comment}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{new Date(history.timestamp).toLocaleString()}</span>
                        {history.updatedByType && (
                          <span className="capitalize">by {history.updatedByType}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

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

export default AdminOrderDetailPage;