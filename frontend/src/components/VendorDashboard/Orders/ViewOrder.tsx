'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import Dropdown from '@/components/UI/Dropdown';
import { ArrowLeft, ShoppingCart, Clock, PackageCheck, Truck, CheckCircle, RotateCcw, X, Package, AlertTriangle } from 'lucide-react';

interface OrderProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  variant?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  total: number;
  status: 'New Order' | 'Processing' | 'Packed' | 'Shipped' | 'Delivered' | 'Returned' | 'Cancelled';
  items: number;
  date: string;
  products: OrderProduct[];
  trackingNumber?: string;
  estimatedDelivery?: string;
  returnReason?: string;
  statusHistory?: Array<{
    status: string;
    date: string;
    note?: string;
  }>;
}

// Mock data - in real app, this would come from API
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    customer: 'John Doe',
    email: 'john@example.com',
    total: 89.97,
    status: 'New Order',
    items: 3,
    date: '2024-01-15',
    statusHistory: [
      { status: 'New Order', date: '2024-01-15', note: 'Order received from customer' }
    ],
    products: [
      {
        id: 'p1',
        name: 'Cotton Kitchen Towel',
        sku: 'KL-CKT-001',
        quantity: 2,
        price: 12.99,
        variant: 'White - Medium'
      },
      {
        id: 'p2',
        name: 'Handwoven Bath Towel',
        sku: 'BL-HBT-002',
        quantity: 1,
        price: 24.99,
        variant: 'Blue - Large'
      }
    ]
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    customer: 'Jane Smith',
    email: 'jane@example.com',
    total: 45.99,
    status: 'Shipped',
    items: 2,
    date: '2024-01-14',
    trackingNumber: 'TRK987654321',
    estimatedDelivery: '2024-01-18',
    statusHistory: [
      { status: 'New Order', date: '2024-01-14', note: 'Order received from customer' },
      { status: 'Processing', date: '2024-01-14', note: 'Order confirmed and processing started' },
      { status: 'Packed', date: '2024-01-15', note: 'Items packed and ready for shipment' },
      { status: 'Shipped', date: '2024-01-16', note: 'Package shipped via FedEx' }
    ],
    products: [
      {
        id: 'p3',
        name: 'Premium Bed Sheet Set',
        sku: 'BL-PBS-003',
        quantity: 1,
        price: 45.99,
        variant: 'Queen - White'
      }
    ]
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    customer: 'Mike Johnson',
    email: 'mike@example.com',
    total: 124.50,
    status: 'Delivered',
    items: 5,
    date: '2024-01-13',
    trackingNumber: 'TRK123456789',
    statusHistory: [
      { status: 'New Order', date: '2024-01-13', note: 'Order received from customer' },
      { status: 'Processing', date: '2024-01-13', note: 'Order confirmed and processing started' },
      { status: 'Packed', date: '2024-01-14', note: 'Items packed and ready for shipment' },
      { status: 'Shipped', date: '2024-01-15', note: 'Package shipped via UPS' },
      { status: 'Delivered', date: '2024-01-17', note: 'Package delivered successfully' }
    ],
    products: [
      {
        id: 'p4',
        name: 'Artisan Apron',
        sku: 'AP-ART-004',
        quantity: 3,
        price: 18.99,
        variant: 'Navy - One Size'
      },
      {
        id: 'p5',
        name: 'Linen Table Runner',
        sku: 'TL-LTR-005',
        quantity: 2,
        price: 32.76,
        variant: 'Natural - 180cm'
      }
    ]
  },
  {
    id: '4',
    orderNumber: 'ORD-004',
    customer: 'Sarah Wilson',
    email: 'sarah@example.com',
    total: 67.98,
    status: 'Returned',
    items: 2,
    date: '2024-01-10',
    returnReason: 'Damaged item received - fabric torn',
    statusHistory: [
      { status: 'New Order', date: '2024-01-10', note: 'Order received from customer' },
      { status: 'Processing', date: '2024-01-10', note: 'Order confirmed and processing started' },
      { status: 'Packed', date: '2024-01-11', note: 'Items packed and ready for shipment' },
      { status: 'Shipped', date: '2024-01-12', note: 'Package shipped via FedEx' },
      { status: 'Delivered', date: '2024-01-14', note: 'Package delivered' },
      { status: 'Returned', date: '2024-01-16', note: 'Customer reported damaged item, return approved' }
    ],
    products: [
      {
        id: 'p6',
        name: 'Organic Cotton Towel Set',
        sku: 'OC-TS-001',
        quantity: 2,
        price: 33.99,
        variant: 'Natural - Set of 4'
      }
    ]
  },
  {
    id: '5',
    orderNumber: 'ORD-005',
    customer: 'David Brown',
    email: 'david@example.com',
    total: 156.75,
    status: 'Packed',
    items: 4,
    date: '2024-01-16',
    statusHistory: [
      { status: 'New Order', date: '2024-01-16', note: 'Order received from customer' },
      { status: 'Processing', date: '2024-01-16', note: 'Order confirmed and processing started' },
      { status: 'Packed', date: '2024-01-17', note: 'Items packed and ready for shipment' }
    ],
    products: [
      {
        id: 'p7',
        name: 'Luxury Bath Towel Collection',
        sku: 'LB-TC-001',
        quantity: 4,
        price: 39.19,
        variant: 'Charcoal - Large'
      }
    ]
  }
];

interface ViewOrderProps {
  orderId: string;
}

export default function ViewOrder({ orderId }: ViewOrderProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(
    mockOrders.find(o => o.id === orderId) || null
  );
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState<string>('');

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="hover:bg-gray-50 hover:border-gray-200"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#222222]">Order Not Found</h1>
            <p className="text-slate-600">The requested order could not be found</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New Order': return 'text-blue-600 bg-blue-100';
      case 'Processing': return 'text-orange-600 bg-orange-100';
      case 'Packed': return 'text-purple-600 bg-purple-100';
      case 'Shipped': return 'text-indigo-600 bg-indigo-100';
      case 'Delivered': return 'text-green-600 bg-green-100';
      case 'Returned': return 'text-red-600 bg-red-100';
      case 'Cancelled': return 'text-gray-700 bg-gray-50';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'New Order': return <ShoppingCart className="w-4 h-4" />;
      case 'Processing': return <Clock className="w-4 h-4" />;
      case 'Packed': return <PackageCheck className="w-4 h-4" />;
      case 'Shipped': return <Truck className="w-4 h-4" />;
      case 'Delivered': return <CheckCircle className="w-4 h-4" />;
      case 'Returned': return <RotateCcw className="w-4 h-4" />;
      case 'Cancelled': return <X className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    const statusFlow: Record<Order['status'], Order['status'] | null> = {
      'New Order': 'Processing',
      'Processing': 'Packed',
      'Packed': 'Shipped',
      'Shipped': 'Delivered',
      'Delivered': null,
      'Returned': null,
      'Cancelled': null
    };
    return statusFlow[currentStatus];
  };

  const getNextStatusOptions = (currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus as Order['status']);
    const options = [];
    
    if (nextStatus) {
      options.push(nextStatus);
    }
    
    if (currentStatus === 'Delivered') {
      options.push('Returned');
    }
    
    return options;
  };

  const handleStatusUpdate = () => {
    if (!newStatus) return;

    const updatedHistory = [...(order.statusHistory || [])];
    updatedHistory.push({
      status: newStatus,
      date: new Date().toISOString().split('T')[0],
      note: statusNote || `Status updated to ${newStatus}`
    });

    setOrder(prev => prev ? {
      ...prev,
      status: newStatus as Order['status'],
      statusHistory: updatedHistory
    } : null);

    setNewStatus('');
    setStatusNote('');
  };

  const canAdvanceStatus = (status: Order['status']) => {
    return getNextStatus(status) !== null;
  };

  const nextStatusOptions = getNextStatusOptions(order.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="hover:bg-gray-50 hover:border-gray-200"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Order</p>
          <h1 className="text-2xl font-bold text-[#222222]">{order.orderNumber}</h1>
          <p className="text-slate-600">Manage order details and status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Overview */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#222222] text-lg">Order Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Order Number</label>
                    <p className="text-lg font-semibold text-[#222222]">{order.orderNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Customer</label>
                    <p className="text-lg font-semibold text-[#222222]">{order.customer}</p>
                    <p className="text-sm text-slate-600">Customer ID: {order.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Order Date</label>
                    <p className="text-lg font-semibold text-[#222222]">{order.date}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Total Items</label>
                    <p className="text-lg font-semibold text-[#222222]">{order.items}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Current Status</label>
                    <span className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-semibold mt-2 w-fit ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Information */}
          {order.trackingNumber && (
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222] text-lg">Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Tracking Number</label>
                    <p className="text-lg font-semibold text-[#222222]">{order.trackingNumber}</p>
                  </div>
                  {order.estimatedDelivery && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Estimated Delivery</label>
                      <p className="text-lg font-semibold text-[#222222]">{order.estimatedDelivery}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Return Information */}
          {order.status === 'Returned' && order.returnReason && (
            <Card className="border border-red-200 bg-red-50">
              <CardHeader className="bg-red-100 border-b border-red-200">
                <CardTitle className="text-red-900 text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Return Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-red-800">{order.returnReason}</p>
              </CardContent>
            </Card>
          )}

          {/* Products List */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#222222] text-lg">Ordered Products</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {order.products.map((product, index) => (
                  <div key={`${product.id}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-[#222222]">{product.name}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs font-mono bg-white px-2 py-1 rounded border">
                              SKU: {product.sku}
                            </span>
                            {product.variant && (
                              <span className="text-xs text-slate-600">
                                {product.variant}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#222222]">
                            Qty: {product.quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222] text-lg">Order Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {order.statusHistory.map((history, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(history.status)}`}>
                        {getStatusIcon(history.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#222222]">{history.status}</p>
                          <p className="text-xs text-slate-600">{history.date}</p>
                        </div>
                        {history.note && (
                          <p className="text-xs text-slate-600 mt-1">{history.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          {nextStatusOptions.length > 0 && (
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222] text-lg">Update Status</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#222222] mb-2">
                    New Status
                  </label>
                  <Dropdown
                    value={newStatus}
                    options={nextStatusOptions}
                    placeholder="Select Status"
                    onChange={(value) => setNewStatus(value as string)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#222222] mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 resize-none"
                    placeholder="Add notes about this status change..."
                  />
                </div>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus}
                  className="w-full bg-[#222222] text-white hover:bg-[#313131]"
                >
                  Update Status
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#222222] text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {canAdvanceStatus(order.status) && (
                <Button
                  className="w-full bg-[#222222] text-white hover:bg-[#313131]"
                  onClick={() => {
                    setNewStatus(getNextStatus(order.status)!);
                    setStatusNote(`Status advanced to ${getNextStatus(order.status)}`);
                  }}
                >
                  {getStatusIcon(getNextStatus(order.status)!)}
                  <span className="ml-2">Mark as {getNextStatus(order.status)}</span>
                </Button>
              )}
              {order.status === 'Delivered' && (
                <Button
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                  onClick={() => {
                    setNewStatus('Returned');
                    setStatusNote('Customer initiated return');
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Process Return
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#222222] text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Items:</span>
                  <span className="font-medium text-[#222222]">{order.items}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <span className="font-medium text-[#222222]">{order.status}</span>
                </div>
                {order.status === 'Returned' && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-red-600">This order has been returned by the customer.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}