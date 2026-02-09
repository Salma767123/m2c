'use client';

import React from 'react';
import { Order, OrderStatus, getStatusColor, getStatusLabel } from '../../mockData/orders';
import { Card, CardContent, CardHeader, CardTitle } from '../../UI/Card';

interface OrderDetailProps {
  order: Order;
  onClose: () => void;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ order, onClose }) => {
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.ORDER_CREATED:
        return '📝';
      case OrderStatus.VENDOR_PROCESSING:
        return '🏭';
      case OrderStatus.PACKED_BY_VENDOR:
        return '📦';
      case OrderStatus.IN_TRANSIT_TO_ADMIN_HUB:
        return '🚚';
      case OrderStatus.RECEIVED_AT_ADMIN_HUB:
        return '🏢';
      case OrderStatus.APPROVED_BY_ADMIN_HUB:
        return '✅';
      case OrderStatus.REJECTED_BY_ADMIN_HUB:
        return '❌';
      case OrderStatus.SHIPPED_TO_CUSTOMER:
        return '🚛';
      case OrderStatus.DELIVERED:
        return '🏠';
      default:
        return '📋';
    }
  };

  const orderSteps = [
    {
      status: OrderStatus.ORDER_CREATED,
      title: 'Order Created',
      description: 'Customer placed the order',
      icon: '📝'
    },
    {
      status: OrderStatus.VENDOR_PROCESSING,
      title: 'Vendor Processing',
      description: 'Vendor confirmed and processing order',
      icon: '🏭'
    },
    {
      status: OrderStatus.PACKED_BY_VENDOR,
      title: 'Packed by Vendor',
      description: 'Products packed and ready for shipment',
      icon: '📦'
    },
    {
      status: OrderStatus.IN_TRANSIT_TO_ADMIN_HUB,
      title: 'In Transit to Admin Hub',
      description: 'Shipped from vendor to admin hub',
      icon: '🚚'
    },
    {
      status: OrderStatus.RECEIVED_AT_ADMIN_HUB,
      title: 'Received at Admin Hub',
      description: 'Package received for quality check',
      icon: '🏢'
    },
    {
      status: OrderStatus.APPROVED_BY_ADMIN_HUB,
      title: 'Approved by Admin Hub',
      description: 'Quality check passed, ready for customer',
      icon: '✅'
    },
    {
      status: OrderStatus.SHIPPED_TO_CUSTOMER,
      title: 'Shipped to Customer',
      description: 'Package shipped to customer address',
      icon: '🚛'
    },
    {
      status: OrderStatus.DELIVERED,
      title: 'Delivered',
      description: 'Order delivered to customer',
      icon: '🏠'
    }
  ];

  const getCurrentStepIndex = () => {
    return orderSteps.findIndex(step => step.status === order.status);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
              <p className="text-gray-600">Order ID: {order.orderId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Order Info */}
            <div className="space-y-6">
              {/* Customer Information */}
              <Card className="bg-gray-50">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-base">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{order.customerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{order.customerEmail}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium">{order.customerPhone}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card className="bg-gray-50">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-base">Shipping Address</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm">
                  <p className="font-medium">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.address}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                  <p>{order.shippingAddress.country}</p>
                  <p className="mt-1 text-gray-600">Phone: {order.shippingAddress.phone}</p>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card className="bg-gray-50">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-base">Order Items</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {order.items.map((item) => (
                    <Card key={item.id} className="bg-white">
                      <CardContent className="p-3 flex items-center space-x-4">
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
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card className="bg-gray-50">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-base">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2 text-sm">
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
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${order.totalAmount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Review (if exists) */}
              {order.adminReview && (
                <Card className="bg-gray-50">
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="text-base">Admin Review</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                        order.adminReview.approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {order.adminReview.approved ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                    {order.adminReview.rating && (
                      <div>
                        <span className="text-gray-600">Rating:</span>
                        <span className="ml-2">
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
                      <div>
                        <span className="text-gray-600">Reviewed:</span>
                        <span className="ml-2">{new Date(order.adminReview.reviewedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Order Flow */}
            <div className="space-y-6">
              {/* Current Status */}
              <Card className="bg-blue-50">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-base">Current Status</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon(order.status)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{getStatusLabel(order.status)}</p>
                      <p className="text-sm text-gray-600">
                        Updated: {new Date(order.statusHistory[order.statusHistory.length - 1]?.timestamp || order.orderDate).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {order.trackingReference && (
                    <Card className="mt-3 bg-white">
                      <CardContent className="p-2">
                        <span className="text-sm text-gray-600">Tracking Reference:</span>
                        <span className="ml-2 font-mono text-sm font-medium">{order.trackingReference}</span>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Order Flow Timeline */}
              <Card className="bg-gray-50">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-base">Order Flow Progress</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  {orderSteps.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const isRejected = order.status === OrderStatus.REJECTED_BY_ADMIN_HUB && step.status === OrderStatus.REJECTED_BY_ADMIN_HUB;
                    
                    return (
                      <div key={step.status} className="flex items-start space-x-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                            isRejected 
                              ? 'bg-red-100 border-2 border-red-500' 
                              : isCompleted 
                                ? 'bg-green-100 border-2 border-green-500' 
                                : isCurrent 
                                  ? 'bg-blue-100 border-2 border-blue-500' 
                                  : 'bg-gray-100 border-2 border-gray-300'
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
              <Card className="bg-gray-50">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-base">Status History</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3 max-h-64 overflow-y-auto">
                  {order.statusHistory.slice().reverse().map((history) => (
                    <Card key={history.id} className="bg-white">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getStatusIcon(history.status)}</span>
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
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;