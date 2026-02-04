'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb';
import { 
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Package,
  User,
  Calendar,
  Truck
} from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
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

interface Order {
  id: string;
  orderNumber: string;
  orderType: 'customer' | 'vendor';
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  vendor: {
    name: string;
    id: string;
  };
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped_to_hub' | 'at_hub' | 'hub_quality_check' | 'hub_approved' | 'shipped_to_customer' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  vendorShippingAddress: ShippingAddress; // Admin Hub address
  customerShippingAddress: ShippingAddress; // Final customer address
  currentLocation: 'vendor' | 'hub' | 'customer';
  trackingInfo?: {
    vendorToHub?: {
      trackingNumber: string;
      carrier: string;
      shippedDate: string;
      receivedDate?: string;
    };
    hubToCustomer?: {
      trackingNumber: string;
      carrier: string;
      shippedDate: string;
      deliveredDate?: string;
    };
  };
  hubQualityCheck?: {
    passed: boolean;
    notes: string;
    checkedBy: string;
    checkDate: string;
    issues?: string[];
    action: 'approve' | 'return_to_vendor' | 'replace';
  };
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// Mock orders data for textile business - both customer and vendor orders
const mockOrders: Order[] = [
  // Customer Orders
  {
    id: '1',
    orderNumber: 'CUST-2024-001',
    orderType: 'customer',
    customer: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1 (555) 123-4567'
    },
    vendor: {
      name: 'Cotton Mills Ltd',
      id: 'vendor-1'
    },
    items: [
      {
        id: 'item-1',
        productName: 'Premium Cotton Bed Sheet Set - Queen',
        sku: 'CS-Q-WHT-001',
        quantity: 2,
        price: 89.99,
        total: 179.98
      },
      {
        id: 'item-2',
        productName: 'Memory Foam Pillow',
        sku: 'MFP-S-WHT-004',
        quantity: 4,
        price: 34.99,
        total: 139.96
      }
    ],
    subtotal: 319.94,
    shipping: 15.00,
    tax: 25.59,
    total: 360.53,
    status: 'processing',
    paymentStatus: 'paid',
    vendorShippingAddress: {
      name: 'M2C Textiles Admin Hub',
      addressLine1: '500 Industrial Blvd',
      addressLine2: 'Warehouse A',
      landmark: 'Near Highway 101',
      city: 'Manufacturing City',
      state: 'TX',
      zipCode: '75001',
      country: 'United States',
      phone: '+1 (555) 000-0001'
    },
    customerShippingAddress: {
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
    currentLocation: 'vendor',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    orderNumber: 'CUST-2024-002',
    orderType: 'customer',
    customer: {
      name: 'Michael Chen',
      email: 'michael.chen@email.com',
      phone: '+1 (555) 987-6543'
    },
    vendor: {
      name: 'Textile Pro',
      id: 'vendor-2'
    },
    items: [
      {
        id: 'item-3',
        productName: 'Luxury Bath Towel Set',
        sku: 'BT-L-BLU-002',
        quantity: 1,
        price: 24.99,
        total: 24.99
      }
    ],
    subtotal: 24.99,
    shipping: 8.00,
    tax: 2.64,
    total: 35.63,
    status: 'shipped_to_hub',
    paymentStatus: 'paid',
    vendorShippingAddress: {
      name: 'M2C Textiles Admin Hub',
      addressLine1: '500 Industrial Blvd',
      addressLine2: 'Warehouse B',
      landmark: 'Near Highway 101',
      city: 'Manufacturing City',
      state: 'TX',
      zipCode: '75001',
      country: 'United States',
      phone: '+1 (555) 000-0001'
    },
    customerShippingAddress: {
      name: 'Michael Chen',
      addressLine1: '456 Oak Avenue',
      addressLine2: 'Suite 200',
      landmark: 'Business District',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'United States',
      phone: '+1 (555) 987-6543'
    },
    currentLocation: 'hub',
    trackingInfo: {
      vendorToHub: {
        trackingNumber: 'TRK123456789',
        carrier: 'FedEx',
        shippedDate: '2024-01-16T09:15:00Z',
        receivedDate: '2024-01-17T14:30:00Z'
      }
    },
    estimatedDelivery: '2024-01-18',
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-16T09:15:00Z'
  },
  {
    id: '3',
    orderNumber: 'CUST-2024-003',
    orderType: 'customer',
    customer: {
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@email.com',
      phone: '+1 (555) 456-7890'
    },
    vendor: {
      name: 'Home Decor Inc',
      id: 'vendor-3'
    },
    items: [
      {
        id: 'item-4',
        productName: 'Blackout Curtains - Wide',
        sku: 'BC-W-GRY-003',
        quantity: 2,
        price: 45.99,
        total: 91.98
      },
      {
        id: 'item-5',
        productName: 'Wool Blanket - Queen',
        sku: 'WB-Q-BRN-005',
        quantity: 1,
        price: 67.99,
        total: 67.99
      }
    ],
    subtotal: 159.97,
    shipping: 12.00,
    tax: 13.76,
    total: 185.73,
    status: 'delivered',
    paymentStatus: 'paid',
    vendorShippingAddress: {
      name: 'M2C Textiles Admin Hub',
      addressLine1: '500 Industrial Blvd',
      addressLine2: 'Warehouse C',
      landmark: 'Near Highway 101',
      city: 'Manufacturing City',
      state: 'TX',
      zipCode: '75001',
      country: 'United States',
      phone: '+1 (555) 000-0001'
    },
    customerShippingAddress: {
      name: 'Emily Rodriguez',
      addressLine1: '789 Pine Street',
      addressLine2: 'Unit 12',
      landmark: 'Downtown Area',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'United States',
      phone: '+1 (555) 456-7890'
    },
    currentLocation: 'customer',
    trackingInfo: {
      vendorToHub: {
        trackingNumber: 'TRK987654321',
        carrier: 'USPS',
        shippedDate: '2024-01-13T10:00:00Z',
        receivedDate: '2024-01-14T15:30:00Z'
      },
      hubToCustomer: {
        trackingNumber: 'HUB456789123',
        carrier: 'UPS',
        shippedDate: '2024-01-15T09:00:00Z',
        deliveredDate: '2024-01-17T11:30:00Z'
      }
    },
    hubQualityCheck: {
      passed: true,
      notes: 'All items in perfect condition, quality approved',
      checkedBy: 'Quality Inspector - John Smith',
      checkDate: '2024-01-14T16:00:00Z',
      action: 'approve'
    },
    createdAt: '2024-01-12T16:45:00Z',
    updatedAt: '2024-01-17T11:30:00Z'
  },
  // Vendor Orders
  {
    id: '4',
    orderNumber: 'VEND-2024-001',
    orderType: 'vendor',
    customer: {
      name: 'M2C Textiles (Admin)',
      email: 'admin@m2ctextiles.com',
      phone: '+1 (555) 000-0001'
    },
    vendor: {
      name: 'Raw Materials Supplier',
      id: 'vendor-4'
    },
    items: [
      {
        id: 'item-6',
        productName: 'Organic Cotton Fabric - 100 yards',
        sku: 'OCF-100Y-WHT',
        quantity: 5,
        price: 120.00,
        total: 600.00
      },
      {
        id: 'item-7',
        productName: 'Polyester Thread - Industrial',
        sku: 'PT-IND-BLK',
        quantity: 20,
        price: 15.50,
        total: 310.00
      }
    ],
    subtotal: 910.00,
    shipping: 45.00,
    tax: 76.40,
    total: 1031.40,
    status: 'confirmed',
    paymentStatus: 'pending',
    vendorShippingAddress: {
      name: 'M2C Textiles Admin Hub',
      addressLine1: '500 Industrial Blvd',
      addressLine2: 'Warehouse B',
      landmark: 'Near Highway 101',
      city: 'Manufacturing City',
      state: 'TX',
      zipCode: '75001',
      country: 'United States',
      phone: '+1 (555) 000-0001'
    },
    customerShippingAddress: {
      name: 'M2C Textiles Warehouse',
      addressLine1: '500 Industrial Blvd',
      addressLine2: 'Warehouse B',
      landmark: 'Near Highway 101',
      city: 'Manufacturing City',
      state: 'TX',
      zipCode: '75001',
      country: 'United States',
      phone: '+1 (555) 000-0001'
    },
    currentLocation: 'vendor',
    estimatedDelivery: '2024-01-25',
    createdAt: '2024-01-18T09:00:00Z',
    updatedAt: '2024-01-18T14:30:00Z'
  },
  {
    id: '5',
    orderNumber: 'VEND-2024-002',
    orderType: 'vendor',
    customer: {
      name: 'M2C Textiles (Admin)',
      email: 'admin@m2ctextiles.com',
      phone: '+1 (555) 000-0001'
    },
    vendor: {
      name: 'Packaging Solutions Ltd',
      id: 'vendor-5'
    },
    items: [
      {
        id: 'item-8',
        productName: 'Eco-Friendly Packaging Boxes - Medium',
        sku: 'EPB-MED-100',
        quantity: 100,
        price: 2.50,
        total: 250.00
      },
      {
        id: 'item-9',
        productName: 'Branded Tissue Paper',
        sku: 'BTP-M2C-500',
        quantity: 10,
        price: 18.00,
        total: 180.00
      }
    ],
    subtotal: 430.00,
    shipping: 25.00,
    tax: 36.40,
    total: 491.40,
    status: 'delivered',
    paymentStatus: 'paid',
    vendorShippingAddress: {
      name: 'M2C Textiles Admin Hub',
      addressLine1: '500 Industrial Blvd',
      addressLine2: 'Warehouse A',
      landmark: 'Near Highway 101',
      city: 'Manufacturing City',
      state: 'TX',
      zipCode: '75001',
      country: 'United States',
      phone: '+1 (555) 000-0001'
    },
    customerShippingAddress: {
      name: 'M2C Textiles Warehouse',
      addressLine1: '500 Industrial Blvd',
      addressLine2: 'Warehouse A',
      landmark: 'Near Highway 101',
      city: 'Manufacturing City',
      state: 'TX',
      zipCode: '75001',
      country: 'United States',
      phone: '+1 (555) 000-0001'
    },
    currentLocation: 'hub',
    trackingInfo: {
      vendorToHub: {
        trackingNumber: 'PKG789012345',
        carrier: 'DHL',
        shippedDate: '2024-01-17T08:00:00Z',
        receivedDate: '2024-01-18T10:30:00Z'
      }
    },
    estimatedDelivery: '2024-01-22',
    createdAt: '2024-01-16T11:15:00Z',
    updatedAt: '2024-01-19T08:45:00Z'
  }
];

interface ViewOrderProps {
  orderId: string;
}

export default function ViewOrder({ orderId }: ViewOrderProps) {
  const router = useRouter();
  const [order] = useState<Order | null>(
    mockOrders.find(o => o.id === orderId) || null
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
            <h1 className="text-2xl font-bold text-gray-900">Order Not Found</h1>
            <p className="text-gray-600">The requested order could not be found</p>
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
      case 'shipped_to_hub':
        return <Badge className="bg-indigo-100 text-indigo-800">Shipped to Hub</Badge>;
      case 'at_hub':
        return <Badge className="bg-orange-100 text-orange-800">At Hub</Badge>;
      case 'hub_quality_check':
        return <Badge className="bg-amber-100 text-amber-800">Quality Check</Badge>;
      case 'hub_approved':
        return <Badge className="bg-emerald-100 text-emerald-800">Hub Approved</Badge>;
      case 'shipped_to_customer':
        return <Badge className="bg-cyan-100 text-cyan-800">Shipped to Customer</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getOrderTypeBadge = (orderType: string) => {
    switch (orderType) {
      case 'customer':
        return <Badge className="bg-blue-100 text-blue-800">Customer Order</Badge>;
      case 'vendor':
        return <Badge className="bg-purple-100 text-purple-800">Vendor Order</Badge>;
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
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    console.log(`Updating order ${orderId} to status: ${newStatus}`);
    // Implement status update logic here
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
            <p className="text-xs uppercase tracking-wide text-gray-500">Order Details</p>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-gray-600">Order management and tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getOrderTypeBadge(order.orderType)}
          {getStatusBadge(order.status)}
          {getPaymentBadge(order.paymentStatus)}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Overview
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
              {(order.trackingInfo?.vendorToHub?.trackingNumber || order.trackingInfo?.hubToCustomer?.trackingNumber) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {order.trackingInfo?.vendorToHub?.trackingNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Vendor to Hub Tracking</label>
                      <p className="text-lg font-semibold text-gray-900">{order.trackingInfo.vendorToHub.trackingNumber}</p>
                      <p className="text-sm text-gray-500">Carrier: {order.trackingInfo.vendorToHub.carrier}</p>
                    </div>
                  )}
                  {order.trackingInfo?.hubToCustomer?.trackingNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Hub to Customer Tracking</label>
                      <p className="text-lg font-semibold text-gray-900">{order.trackingInfo.hubToCustomer.trackingNumber}</p>
                      <p className="text-sm text-gray-500">Carrier: {order.trackingInfo.hubToCustomer.carrier}</p>
                    </div>
                  )}
                  {order.estimatedDelivery && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Estimated Delivery</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(order.estimatedDelivery).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
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
              <div>
                <p className="text-xl font-semibold text-gray-900">{order.customer.name}</p>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>
                {order.orderType === 'customer' ? 'Customer Shipping Address' : 'Delivery Address'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {order.orderType === 'customer' 
                        ? order.customerShippingAddress.name 
                        : order.vendorShippingAddress.name
                      }
                    </div>
                    <div>
                      {order.orderType === 'customer' 
                        ? order.customerShippingAddress.addressLine1 
                        : order.vendorShippingAddress.addressLine1
                      }
                    </div>
                    {(order.orderType === 'customer' 
                      ? order.customerShippingAddress.addressLine2 
                      : order.vendorShippingAddress.addressLine2
                    ) && (
                      <div>
                        {order.orderType === 'customer' 
                          ? order.customerShippingAddress.addressLine2 
                          : order.vendorShippingAddress.addressLine2
                        }
                      </div>
                    )}
                    {(order.orderType === 'customer' 
                      ? order.customerShippingAddress.landmark 
                      : order.vendorShippingAddress.landmark
                    ) && (
                      <div className="text-gray-500">
                        Landmark: {order.orderType === 'customer' 
                          ? order.customerShippingAddress.landmark 
                          : order.vendorShippingAddress.landmark
                        }
                      </div>
                    )}
                    <div>
                      {order.orderType === 'customer' 
                        ? `${order.customerShippingAddress.city}, ${order.customerShippingAddress.state} ${order.customerShippingAddress.zipCode}`
                        : `${order.vendorShippingAddress.city}, ${order.vendorShippingAddress.state} ${order.vendorShippingAddress.zipCode}`
                      }
                    </div>
                    <div>
                      {order.orderType === 'customer' 
                        ? order.customerShippingAddress.country 
                        : order.vendorShippingAddress.country
                      }
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="text-xs">
                        {order.orderType === 'customer' 
                          ? order.customerShippingAddress.phone 
                          : order.vendorShippingAddress.phone
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hub Address for Customer Orders */}
          {order.orderType === 'customer' && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Hub Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">{order.vendorShippingAddress.name}</div>
                      <div>{order.vendorShippingAddress.addressLine1}</div>
                      {order.vendorShippingAddress.addressLine2 && (
                        <div>{order.vendorShippingAddress.addressLine2}</div>
                      )}
                      {order.vendorShippingAddress.landmark && (
                        <div className="text-gray-500">Landmark: {order.vendorShippingAddress.landmark}</div>
                      )}
                      <div>
                        {order.vendorShippingAddress.city}, {order.vendorShippingAddress.state} {order.vendorShippingAddress.zipCode}
                      </div>
                      <div>{order.vendorShippingAddress.country}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span className="text-xs">{order.vendorShippingAddress.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Update Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {order.status === 'pending' && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                  >
                    Confirm Order
                  </Button>
                )}
                {order.status === 'confirmed' && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleStatusUpdate(order.id, 'processing')}
                  >
                    Start Processing
                  </Button>
                )}
                {order.status === 'processing' && order.orderType === 'customer' && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleStatusUpdate(order.id, 'shipped_to_hub')}
                  >
                    Ship to Hub
                  </Button>
                )}
                {order.status === 'processing' && order.orderType === 'vendor' && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleStatusUpdate(order.id, 'delivered')}
                  >
                    Mark as Delivered
                  </Button>
                )}
                {order.status === 'shipped_to_hub' && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleStatusUpdate(order.id, 'at_hub')}
                  >
                    Received at Hub
                  </Button>
                )}
                {order.status === 'at_hub' && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleStatusUpdate(order.id, 'hub_quality_check')}
                  >
                    Start Quality Check
                  </Button>
                )}
                {order.status === 'hub_quality_check' && (
                  <div className="space-y-2">
                    <Button 
                      size="sm" 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusUpdate(order.id, 'hub_approved')}
                    >
                      Approve Quality
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => handleStatusUpdate(order.id, 'processing')}
                    >
                      Return to Vendor
                    </Button>
                  </div>
                )}
                {order.status === 'hub_approved' && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleStatusUpdate(order.id, 'shipped_to_customer')}
                  >
                    Ship to Customer
                  </Button>
                )}
                {order.status === 'shipped_to_customer' && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleStatusUpdate(order.id, 'delivered')}
                  >
                    Mark as Delivered
                  </Button>
                )}
                <Link href={`/admin/dashboard/orders/edit/${order.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Edit Order
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-800">
                    1
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Order Placed</p>
                      <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {order.orderType === 'customer' ? 'Order was successfully placed by customer' : 'Vendor order was placed by admin'}
                    </p>
                  </div>
                </div>
                
                {order.status !== 'pending' && (
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-800">
                      2
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Order Confirmed</p>
                        <p className="text-xs text-gray-500">{new Date(order.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Payment confirmed and order processing started</p>
                    </div>
                  </div>
                )}

                {order.orderType === 'customer' && (order.status === 'shipped_to_hub' || order.status === 'at_hub' || order.status === 'hub_quality_check' || order.status === 'hub_approved' || order.status === 'shipped_to_customer' || order.status === 'delivered') && (
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-800">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Shipped to Hub</p>
                        <p className="text-xs text-gray-500">{new Date(order.updatedAt).toLocaleDateString()}</p>
                      </div>
                      {order.trackingInfo?.vendorToHub?.trackingNumber && (
                        <p className="text-xs text-gray-600 mt-1">Tracking: {order.trackingInfo.vendorToHub.trackingNumber}</p>
                      )}
                    </div>
                  </div>
                )}

                {order.orderType === 'customer' && (order.status === 'at_hub' || order.status === 'hub_quality_check' || order.status === 'hub_approved' || order.status === 'shipped_to_customer' || order.status === 'delivered') && (
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-medium text-orange-800">
                      📦
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Received at Hub</p>
                        <p className="text-xs text-gray-500">{new Date(order.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Package received at admin hub for quality check</p>
                    </div>
                  </div>
                )}

                {order.orderType === 'customer' && (order.status === 'hub_approved' || order.status === 'shipped_to_customer' || order.status === 'delivered') && (
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-800">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Quality Approved</p>
                        <p className="text-xs text-gray-500">{new Date(order.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {order.hubQualityCheck?.notes || 'Quality check passed, ready for customer shipment'}
                      </p>
                    </div>
                  </div>
                )}

                {order.orderType === 'customer' && (order.status === 'shipped_to_customer' || order.status === 'delivered') && (
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-xs font-medium text-cyan-800">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Shipped to Customer</p>
                        <p className="text-xs text-gray-500">{new Date(order.updatedAt).toLocaleDateString()}</p>
                      </div>
                      {order.trackingInfo?.hubToCustomer?.trackingNumber && (
                        <p className="text-xs text-gray-600 mt-1">Tracking: {order.trackingInfo.hubToCustomer.trackingNumber}</p>
                      )}
                    </div>
                  </div>
                )}

                {order.status === 'delivered' && (
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-800">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {order.orderType === 'customer' ? 'Order Delivered' : 'Order Received'}
                        </p>
                        <p className="text-xs text-gray-500">{new Date(order.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {order.orderType === 'customer' 
                          ? 'Order successfully delivered to customer' 
                          : 'Vendor order successfully received at admin hub'
                        }
                      </p>
                    </div>
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