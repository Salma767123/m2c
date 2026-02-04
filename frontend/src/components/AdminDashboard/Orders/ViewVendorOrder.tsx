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
  Building2,
  User,
  ShoppingCart
} from 'lucide-react';

interface VendorOrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  variant?: string;
  image?: string;
}

interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

interface VendorOrder {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  vendor: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: VendorOrderItem[];
  status: 'New Order' | 'Processing' | 'Packed' | 'Shipped' | 'Delivered' | 'Returned' | 'Cancelled';
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  shippingCarrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  returnReason?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: Array<{
    status: string;
    date: string;
    note?: string;
    updatedBy: 'vendor' | 'admin' | 'system';
  }>;
  shippingDetails?: {
    weight: string;
    dimensions: string;
    packageType: string;
    shippingMethod: string;
    shippingCost: number;
    insuranceValue?: number;
  };
}

// Mock vendor orders data
const mockVendorOrders: VendorOrder[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    customer: {
      id: 'CUST-001',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1 (555) 123-4567'
    },
    vendor: {
      id: 'VEN-001',
      name: 'Cotton Mills Ltd',
      email: 'orders@cottonmills.com',
      phone: '+1 (555) 987-6543',
      address: '123 Industrial Ave, Textile City, TX 75001'
    },
    items: [
      {
        id: 'item-1',
        productName: 'Premium Cotton Bed Sheet Set - Queen',
        sku: 'CS-Q-WHT-001',
        quantity: 2,
        variant: 'White - Queen Size'
      },
      {
        id: 'item-2',
        productName: 'Memory Foam Pillow',
        sku: 'MFP-S-WHT-004',
        quantity: 4,
        variant: 'Standard - White'
      }
    ],
    status: 'Shipped',
    shippingAddress: {
      name: 'Sarah Johnson',
      street: '123 Main Street, Apt 4B',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'United States',
      phone: '+1 (555) 123-4567'
    },
    trackingNumber: 'TRK123456789',
    shippingCarrier: 'FedEx',
    estimatedDelivery: '2024-01-20',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-18T14:20:00Z',
    statusHistory: [
      { status: 'New Order', date: '2024-01-15', note: 'Order received from customer', updatedBy: 'system' },
      { status: 'Processing', date: '2024-01-15', note: 'Vendor confirmed and started processing', updatedBy: 'vendor' },
      { status: 'Packed', date: '2024-01-17', note: 'Items packed and ready for shipment', updatedBy: 'vendor' },
      { status: 'Shipped', date: '2024-01-18', note: 'Package shipped via FedEx', updatedBy: 'vendor' }
    ],
    shippingDetails: {
      weight: '3.2 lbs',
      dimensions: '18x12x6 inches',
      packageType: 'Box',
      shippingMethod: 'FedEx Ground',
      shippingCost: 15.99,
      insuranceValue: 200.00
    }
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    customer: {
      id: 'CUST-002',
      name: 'Michael Chen',
      email: 'michael.chen@email.com',
      phone: '+1 (555) 987-6543'
    },
    vendor: {
      id: 'VEN-002',
      name: 'Textile Pro',
      email: 'shipping@textilepro.com',
      phone: '+1 (555) 456-7890',
      address: '456 Manufacturing Blvd, Fabric Town, CA 90210'
    },
    items: [
      {
        id: 'item-3',
        productName: 'Luxury Bath Towel Set',
        sku: 'BT-L-BLU-002',
        quantity: 1,
        variant: 'Blue - Large Set'
      }
    ],
    status: 'Delivered',
    shippingAddress: {
      name: 'Michael Chen',
      street: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'United States',
      phone: '+1 (555) 987-6543'
    },
    trackingNumber: 'TRK987654321',
    shippingCarrier: 'UPS',
    estimatedDelivery: '2024-01-18',
    actualDelivery: '2024-01-18',
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-18T16:45:00Z',
    statusHistory: [
      { status: 'New Order', date: '2024-01-14', note: 'Order received from customer', updatedBy: 'system' },
      { status: 'Processing', date: '2024-01-14', note: 'Vendor confirmed and started processing', updatedBy: 'vendor' },
      { status: 'Packed', date: '2024-01-16', note: 'Items packed and ready for shipment', updatedBy: 'vendor' },
      { status: 'Shipped', date: '2024-01-17', note: 'Package shipped via UPS', updatedBy: 'vendor' },
      { status: 'Delivered', date: '2024-01-18', note: 'Package delivered successfully', updatedBy: 'system' }
    ],
    shippingDetails: {
      weight: '1.8 lbs',
      dimensions: '14x10x4 inches',
      packageType: 'Envelope',
      shippingMethod: 'UPS Next Day Air',
      shippingCost: 24.99
    }
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-003',
    customer: {
      id: 'CUST-003',
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@email.com',
      phone: '+1 (555) 456-7890'
    },
    vendor: {
      id: 'VEN-003',
      name: 'Home Decor Inc',
      email: 'fulfillment@homedecor.com',
      phone: '+1 (555) 321-0987',
      address: '789 Design Street, Decor City, FL 33101'
    },
    items: [
      {
        id: 'item-4',
        productName: 'Blackout Curtains - Wide',
        sku: 'BC-W-GRY-003',
        quantity: 2,
        variant: 'Gray - 84 inch'
      },
      {
        id: 'item-5',
        productName: 'Wool Blanket - Queen',
        sku: 'WB-Q-BRN-005',
        quantity: 1,
        variant: 'Brown - Queen Size'
      }
    ],
    status: 'Returned',
    shippingAddress: {
      name: 'Emily Rodriguez',
      street: '789 Pine Street',
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
    createdAt: '2024-01-12T16:45:00Z',
    updatedAt: '2024-01-19T11:30:00Z',
    statusHistory: [
      { status: 'New Order', date: '2024-01-12', note: 'Order received from customer', updatedBy: 'system' },
      { status: 'Processing', date: '2024-01-12', note: 'Vendor confirmed and started processing', updatedBy: 'vendor' },
      { status: 'Packed', date: '2024-01-14', note: 'Items packed and ready for shipment', updatedBy: 'vendor' },
      { status: 'Shipped', date: '2024-01-15', note: 'Package shipped via USPS', updatedBy: 'vendor' },
      { status: 'Delivered', date: '2024-01-17', note: 'Package delivered', updatedBy: 'system' },
      { status: 'Returned', date: '2024-01-19', note: 'Customer reported wrong color, return approved', updatedBy: 'admin' }
    ],
    shippingDetails: {
      weight: '4.5 lbs',
      dimensions: '20x16x8 inches',
      packageType: 'Box',
      shippingMethod: 'USPS Priority Mail',
      shippingCost: 18.50,
      insuranceValue: 150.00
    }
  }
];

interface ViewVendorOrderProps {
  orderId: string;
}

export default function ViewVendorOrder({ orderId }: ViewVendorOrderProps) {
  const router = useRouter();
  const [order] = useState<VendorOrder | null>(
    mockVendorOrders.find(o => o.id === orderId) || null
  );

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
            <h1 className="text-2xl font-bold text-gray-900">Vendor Order Not Found</h1>
            <p className="text-gray-600">The requested vendor order could not be found</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New Order':
        return <Badge className="bg-blue-100 text-blue-800">New Order</Badge>;
      case 'Processing':
        return <Badge className="bg-orange-100 text-orange-800">Processing</Badge>;
      case 'Packed':
        return <Badge className="bg-purple-100 text-purple-800">Packed</Badge>;
      case 'Shipped':
        return <Badge className="bg-indigo-100 text-indigo-800">Shipped</Badge>;
      case 'Delivered':
        return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'Returned':
        return <Badge className="bg-red-100 text-red-800">Returned</Badge>;
      case 'Cancelled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
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
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
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
          <p className="text-xs uppercase tracking-wide text-gray-500">Vendor Order</p>
          <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
          <p className="text-gray-600">Vendor shipping details and management</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order & Vendor Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Order Overview</span>
                {getStatusBadge(order.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Vendor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Vendor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Vendor Name</label>
                  <p className="text-lg font-semibold text-gray-900">{order.vendor.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Vendor ID</label>
                  <p className="text-lg font-semibold text-gray-900">{order.vendor.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{order.vendor.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{order.vendor.phone}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-sm">{order.vendor.address}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Details */}
          {order.shippingDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Weight</label>
                    <p className="text-lg font-semibold text-gray-900">{order.shippingDetails.weight}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dimensions</label>
                    <p className="text-lg font-semibold text-gray-900">{order.shippingDetails.dimensions}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Package Type</label>
                    <p className="text-lg font-semibold text-gray-900">{order.shippingDetails.packageType}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Shipping Method</label>
                    <p className="text-lg font-semibold text-gray-900">{order.shippingDetails.shippingMethod}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Shipping Cost</label>
                    <p className="text-lg font-semibold text-gray-900">${order.shippingDetails.shippingCost.toFixed(2)}</p>
                  </div>
                </div>
                {order.shippingDetails.insuranceValue && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Insurance Value</label>
                    <p className="text-lg font-semibold text-gray-900">${order.shippingDetails.insuranceValue.toFixed(2)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                    </div>
                    <div className="text-sm font-medium">Qty: {item.quantity}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Return Information */}
          {order.status === 'Returned' && order.returnReason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Return Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-800">{order.returnReason}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="font-semibold text-gray-900">{order.customer.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Customer ID</label>
                <p className="font-semibold text-gray-900">{order.customer.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{order.customer.phone}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">{order.shippingAddress.name}</div>
                    <div>{order.shippingAddress.street}</div>
                    <div>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </div>
                    <div>{order.shippingAddress.country}</div>
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
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.statusHistory.map((history, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      history.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                      history.status === 'Shipped' ? 'bg-indigo-100 text-indigo-800' :
                      history.status === 'Returned' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusIcon(history.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{history.status}</p>
                        <p className="text-xs text-gray-500">{history.date}</p>
                      </div>
                      {history.note && (
                        <p className="text-xs text-gray-600 mt-1">{history.note}</p>
                      )}
                      <p className="text-xs text-gray-500 capitalize mt-1">Updated by: {history.updatedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}