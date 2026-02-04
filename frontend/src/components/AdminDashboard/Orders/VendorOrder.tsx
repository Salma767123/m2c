'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/Table';
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb';
import Dropdown from '@/components/UI/Dropdown';
import Link from 'next/link';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  Search, 
  Filter, 
  Eye,
  PackageCheck,
  RotateCcw,
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

export default function VendorOrder() {
  const [orders] = useState<VendorOrder[]>(mockVendorOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  // Calculate stats
  const totalOrders = orders.length;
  const shippedOrders = orders.filter(order => order.status === 'Shipped').length;
  const deliveredOrders = orders.filter(order => order.status === 'Delivered').length;
  const returnedOrders = orders.filter(order => order.status === 'Returned').length;
  const processingOrders = orders.filter(order => order.status === 'Processing' || order.status === 'Packed').length;

  // Get unique vendors for filter
  const vendors = Array.from(new Set(orders.map(order => order.vendor.name)));

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.trackingNumber && order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesVendor = vendorFilter === 'all' || order.vendor.name === vendorFilter;

    return matchesSearch && matchesStatus && matchesVendor;
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Shipping Management</h1>
          <p className="text-gray-600">Monitor vendor order fulfillment and shipping details</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-gray-600">All vendor orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{processingOrders}</div>
            <p className="text-xs text-gray-600">Being prepared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <Truck className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{shippedOrders}</div>
            <p className="text-xs text-gray-600">In transit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{deliveredOrders}</div>
            <p className="text-xs text-gray-600">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{returnedOrders}</div>
            <p className="text-xs text-gray-600">Returned items</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search orders, customers, vendors, or tracking numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Dropdown
                  id="statusFilter"
                  value={statusFilter}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'New Order', label: 'New Order' },
                    { value: 'Processing', label: 'Processing' },
                    { value: 'Packed', label: 'Packed' },
                    { value: 'Shipped', label: 'Shipped' },
                    { value: 'Delivered', label: 'Delivered' },
                    { value: 'Returned', label: 'Returned' },
                    { value: 'Cancelled', label: 'Cancelled' }
                  ]}
                  onChange={(value) => setStatusFilter(value as string)}
                />
              </div>
              <Dropdown
                id="vendorFilter"
                value={vendorFilter}
                options={[
                  { value: 'all', label: 'All Vendors' },
                  ...vendors.map(vendor => ({ value: vendor, label: vendor }))
                ]}
                onChange={(value) => setVendorFilter(value as string)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="text-gray-500">
                      <p className="text-lg font-medium">No orders found</p>
                      <p className="text-sm">Try adjusting your search or filter criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.orderNumber}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer.name}</div>
                        <div className="text-sm text-gray-500">ID: {order.customer.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.vendor.name}</div>
                        <div className="text-sm text-gray-500">{order.vendor.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {order.trackingNumber ? (
                        <div>
                          <div className="font-medium text-sm">{order.trackingNumber}</div>
                          <div className="text-xs text-gray-500">{order.shippingCarrier}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No tracking</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.estimatedDelivery ? (
                        <div className="text-sm">
                          <div className={order.actualDelivery ? 'text-green-600' : 'text-gray-600'}>
                            {order.actualDelivery ? 'Delivered' : 'Est:'} {order.actualDelivery || order.estimatedDelivery}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">TBD</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/dashboard/orders/vendor/view/${order.id}`}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}