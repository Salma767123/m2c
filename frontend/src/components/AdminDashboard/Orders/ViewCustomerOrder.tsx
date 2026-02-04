'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  PackageCheck,
  RotateCcw,
  User,
  ShoppingCart,
  DollarSign,
  Star,
  MessageSquare,
  Printer
} from 'lucide-react';
import PrintPreviewModal from '@/components/UI/PrintPreviewModal';
import { generateInvoiceHTML } from '@/utils/invoiceTemplate';

interface CustomerOrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  variant?: string;
  image?: string;
}

interface ShippingAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    loyaltyTier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    totalOrders?: number;
  };
  vendor: {
    id: string;
    name: string;
  };
  items: CustomerOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  trackingNumber?: string;
  shippingCarrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  returnReason?: string;
  customerNotes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: Array<{
    status: string;
    date: string;
    note?: string;
    updatedBy: 'customer' | 'vendor' | 'admin' | 'system';
  }>;
  deliveryPreferences?: {
    preferredTime?: string;
    specialInstructions?: string;
    signatureRequired?: boolean;
    leaveAtDoor?: boolean;
  };
  customerFeedback?: {
    rating?: number;
    review?: string;
    date?: string;
  };
}

// Mock customer orders data
const mockCustomerOrders: CustomerOrder[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    customer: {
      id: 'CUST-001',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1 (555) 123-4567',
      loyaltyTier: 'Gold',
      totalOrders: 15
    },
    vendor: {
      id: 'VEN-001',
      name: 'Cotton Mills Ltd'
    },
    items: [
      {
        id: 'item-1',
        productName: 'Premium Cotton Bed Sheet Set - Queen',
        sku: 'CS-Q-WHT-001',
        quantity: 2,
        price: 89.99,
        total: 179.98,
        variant: 'White - Queen Size'
      },
      {
        id: 'item-2',
        productName: 'Memory Foam Pillow',
        sku: 'MFP-S-WHT-004',
        quantity: 4,
        price: 34.99,
        total: 139.96,
        variant: 'Standard - White'
      }
    ],
    subtotal: 319.94,
    shipping: 15.00,
    tax: 25.59,
    total: 360.53,
    status: 'delivered',
    paymentStatus: 'paid',
    shippingAddress: {
      name: 'Sarah Johnson',
      addressLine1: '123 Main Street',
      addressLine2: 'Apt 4B',
      landmark: 'Near Central Park',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'United States',
      phone: '+1 (555) 123-4567'
    },
    trackingNumber: 'TRK123456789',
    shippingCarrier: 'FedEx',
    estimatedDelivery: '2024-01-20',
    actualDelivery: '2024-01-19',
    customerNotes: 'Please leave package with doorman if not home',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-19T16:45:00Z',
    statusHistory: [
      { status: 'pending', date: '2024-01-15', note: 'Order placed by customer', updatedBy: 'customer' },
      { status: 'confirmed', date: '2024-01-15', note: 'Payment confirmed, order processing', updatedBy: 'system' },
      { status: 'processing', date: '2024-01-16', note: 'Vendor started processing order', updatedBy: 'vendor' },
      { status: 'shipped', date: '2024-01-18', note: 'Package shipped via FedEx', updatedBy: 'vendor' },
      { status: 'delivered', date: '2024-01-19', note: 'Package delivered successfully', updatedBy: 'system' }
    ],
    deliveryPreferences: {
      preferredTime: 'Morning (9AM-12PM)',
      specialInstructions: 'Leave with doorman',
      signatureRequired: false,
      leaveAtDoor: false
    },
    customerFeedback: {
      rating: 5,
      review: 'Excellent quality sheets, very satisfied with the purchase!',
      date: '2024-01-20'
    }
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    customer: {
      id: 'CUST-002',
      name: 'Michael Chen',
      email: 'michael.chen@email.com',
      phone: '+1 (555) 987-6543',
      loyaltyTier: 'Silver',
      totalOrders: 8
    },
    vendor: {
      id: 'VEN-002',
      name: 'Textile Pro'
    },
    items: [
      {
        id: 'item-3',
        productName: 'Luxury Bath Towel Set',
        sku: 'BT-L-BLU-002',
        quantity: 1,
        price: 24.99,
        total: 24.99,
        variant: 'Blue - Large Set'
      }
    ],
    subtotal: 24.99,
    shipping: 8.00,
    tax: 2.64,
    total: 35.63,
    status: 'shipped',
    paymentStatus: 'paid',
    shippingAddress: {
      name: 'Michael Chen',
      addressLine1: '456 Oak Avenue',
      addressLine2: '',
      landmark: 'Opposite Mall',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'United States',
      phone: '+1 (555) 987-6543'
    },
    trackingNumber: 'TRK987654321',
    shippingCarrier: 'UPS',
    estimatedDelivery: '2024-01-22',
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-18T11:30:00Z',
    statusHistory: [
      { status: 'pending', date: '2024-01-14', note: 'Order placed by customer', updatedBy: 'customer' },
      { status: 'confirmed', date: '2024-01-14', note: 'Payment confirmed', updatedBy: 'system' },
      { status: 'processing', date: '2024-01-15', note: 'Vendor processing order', updatedBy: 'vendor' },
      { status: 'shipped', date: '2024-01-18', note: 'Package shipped via UPS', updatedBy: 'vendor' }
    ],
    deliveryPreferences: {
      preferredTime: 'Afternoon (1PM-5PM)',
      signatureRequired: true,
      leaveAtDoor: false
    }
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-003',
    customer: {
      id: 'CUST-003',
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@email.com',
      phone: '+1 (555) 456-7890',
      loyaltyTier: 'Platinum',
      totalOrders: 32
    },
    vendor: {
      id: 'VEN-003',
      name: 'Home Decor Inc'
    },
    items: [
      {
        id: 'item-4',
        productName: 'Blackout Curtains - Wide',
        sku: 'BC-W-GRY-003',
        quantity: 2,
        price: 45.99,
        total: 91.98,
        variant: 'Gray - 84 inch'
      },
      {
        id: 'item-5',
        productName: 'Wool Blanket - Queen',
        sku: 'WB-Q-BRN-005',
        quantity: 1,
        price: 67.99,
        total: 67.99,
        variant: 'Brown - Queen Size'
      }
    ],
    subtotal: 159.97,
    shipping: 12.00,
    tax: 13.76,
    total: 185.73,
    status: 'returned',
    paymentStatus: 'refunded',
    shippingAddress: {
      name: 'Emily Rodriguez',
      addressLine1: '789 Pine Street',
      addressLine2: 'Unit 12',
      landmark: 'Behind City Hall',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'United States',
      phone: '+1 (555) 456-7890'
    },
    trackingNumber: 'TRK456789123',
    shippingCarrier: 'USPS',
    estimatedDelivery: '2024-01-17',
    actualDelivery: '2024-01-17',
    returnReason: 'Wrong color received - customer ordered beige but received brown',
    customerNotes: 'I ordered beige curtains but received brown ones. Please process return.',
    adminNotes: 'Return approved - vendor error. Full refund processed.',
    createdAt: '2024-01-12T16:45:00Z',
    updatedAt: '2024-01-20T09:15:00Z',
    statusHistory: [
      { status: 'pending', date: '2024-01-12', note: 'Order placed by customer', updatedBy: 'customer' },
      { status: 'confirmed', date: '2024-01-12', note: 'Payment confirmed', updatedBy: 'system' },
      { status: 'processing', date: '2024-01-13', note: 'Vendor processing order', updatedBy: 'vendor' },
      { status: 'shipped', date: '2024-01-15', note: 'Package shipped via USPS', updatedBy: 'vendor' },
      { status: 'delivered', date: '2024-01-17', note: 'Package delivered', updatedBy: 'system' },
      { status: 'returned', date: '2024-01-19', note: 'Customer reported wrong color, return approved', updatedBy: 'admin' }
    ],
    deliveryPreferences: {
      preferredTime: 'Evening (5PM-8PM)',
      specialInstructions: 'Ring doorbell twice',
      signatureRequired: false,
      leaveAtDoor: true
    }
  }
];

interface ViewCustomerOrderProps {
  orderId: string;
}

export default function ViewCustomerOrder({ orderId }: ViewCustomerOrderProps) {
  const router = useRouter();
  const [order] = useState<CustomerOrder | null>(
    mockCustomerOrders.find(o => o.id === orderId) || null
  );
  const [showPrintModal, setShowPrintModal] = useState(false);

  const showPrintPreview = () => {
    if (order) {
      setShowPrintModal(true);
    }
  };

  const handlePrint = () => {
    // Print functionality is now handled directly in the modal
    setShowPrintModal(false);
  };

  const handleClosePrintModal = () => {
    setShowPrintModal(false);
  };

  if (!order) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
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
            <h1 className="text-2xl font-bold text-gray-900">Customer Order Not Found</h1>
            <p className="text-gray-600">The requested customer order could not be found</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800">Confirmed</Badge>;
      case 'processing':
        return <Badge className="bg-purple-100 text-purple-800">Processing</Badge>;
      case 'shipped':
        return <Badge className="bg-indigo-100 text-indigo-800">Shipped</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'returned':
        return <Badge className="bg-gray-100 text-gray-800">Returned</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-gray-100 text-gray-800">Refunded</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
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
            <p className="text-xs uppercase tracking-wide text-gray-500">Customer Order</p>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-gray-600">Customer order details and management</p>
          </div>
        </div>
        <Button
          onClick={showPrintPreview}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Invoice
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Order Overview</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(order.status)}
                  {getPaymentBadge(order.paymentStatus)}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Order Number</label>
                  <p className="text-lg font-semibold text-gray-900">{order.orderNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Order Date</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Vendor</label>
                  <p className="text-lg font-semibold text-gray-900">{order.vendor.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-semibold text-gray-900">{order.customer.name}</p>
                  <p className="text-sm text-gray-600">Customer ID: {order.customer.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mt-1">
                    {order.customer.totalOrders} total orders
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{order.customer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{order.customer.phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.productName}</div>
                      <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                      {item.variant && (
                        <div className="text-xs text-gray-600">{item.variant}</div>
                      )}
                      <div className="text-xs text-gray-600">Qty: {item.quantity} × ${item.price.toFixed(2)}</div>
                    </div>
                    <div className="font-medium text-sm">${item.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">${order.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">${order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Preferences */}
          {order.deliveryPreferences && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.deliveryPreferences.preferredTime && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Preferred Time</label>
                    <p className="text-sm font-semibold text-gray-900">{order.deliveryPreferences.preferredTime}</p>
                  </div>
                )}
                {order.deliveryPreferences.specialInstructions && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Special Instructions</label>
                    <p className="text-sm text-gray-900">{order.deliveryPreferences.specialInstructions}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Signature Required</label>
                    <p className="text-sm text-gray-900">{order.deliveryPreferences.signatureRequired ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Leave at Door</label>
                    <p className="text-sm text-gray-900">{order.deliveryPreferences.leaveAtDoor ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer Feedback */}
          {order.customerFeedback && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Customer Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex">
                    {renderStars(order.customerFeedback.rating || 0)}
                  </div>
                  <span className="text-sm text-gray-600">
                    {order.customerFeedback.date}
                  </span>
                </div>
                <p className="text-sm text-gray-800">{order.customerFeedback.review}</p>
              </CardContent>
            </Card>
          )}

          {/* Return Information */}
          {order.status === 'returned' && order.returnReason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Return Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-red-800">{order.returnReason}</p>
                {order.customerNotes && (
                  <div>
                    <label className="text-xs font-medium text-red-700">Customer Notes:</label>
                    <p className="text-xs text-red-700">{order.customerNotes}</p>
                  </div>
                )}
                {order.adminNotes && (
                  <div>
                    <label className="text-xs font-medium text-red-700">Admin Notes:</label>
                    <p className="text-xs text-red-700">{order.adminNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{order.shippingAddress.name}</div>
                    <div>{order.shippingAddress.addressLine1}</div>
                    {order.shippingAddress.addressLine2 && (
                      <div>{order.shippingAddress.addressLine2}</div>
                    )}
                    {order.shippingAddress.landmark && (
                      <div className="text-gray-500">Landmark: {order.shippingAddress.landmark}</div>
                    )}
                    <div>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </div>
                    <div>{order.shippingAddress.country}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="text-xs">{order.shippingAddress.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Info */}
          {order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle>Tracking Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Tracking Number</label>
                  <p className="font-semibold text-gray-900">{order.trackingNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Carrier</label>
                  <p className="font-semibold text-gray-900">{order.shippingCarrier}</p>
                </div>
                {order.estimatedDelivery && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Est. Delivery</label>
                    <p className="font-semibold text-gray-900">{order.estimatedDelivery}</p>
                  </div>
                )}
                {order.actualDelivery && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Delivered</label>
                    <p className="font-semibold text-green-600">{order.actualDelivery}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.statusHistory.map((history, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      history.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      history.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
                      history.status === 'returned' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 capitalize">{history.status}</p>
                        <p className="text-xs text-gray-500">{history.date}</p>
                      </div>
                      {history.note && (
                        <p className="text-xs text-gray-600 mt-1">{history.note}</p>
                      )}
                      <p className="text-xs text-gray-500 capitalize mt-1">By: {history.updatedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Preview Modal */}
      {order && (
        <PrintPreviewModal
          isOpen={showPrintModal}
          onClose={handleClosePrintModal}
          htmlContent={generateInvoiceHTML(order)}
          title={`Invoice Preview - ${order.orderNumber}`}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}