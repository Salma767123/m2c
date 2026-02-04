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
  ShoppingCart,
  DollarSign,
  Star,
  Printer,
  SquarePen
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
  status: 'pending' | 'confirmed' | 'processing' | 'shipped_to_hub' | 'at_hub' | 'hub_quality_check' | 'hub_approved' | 'shipped_to_customer' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
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
      { status: 'shipped_to_hub', date: '2024-01-17', note: 'Package shipped to Admin Hub via FedEx', updatedBy: 'vendor' },
      { status: 'at_hub', date: '2024-01-18', note: 'Package received at Admin Hub', updatedBy: 'system' },
      { status: 'hub_quality_check', date: '2024-01-18', note: 'Quality inspection in progress', updatedBy: 'admin' },
      { status: 'hub_approved', date: '2024-01-18', note: 'Quality check passed, approved for customer shipment', updatedBy: 'admin' },
      { status: 'shipped_to_customer', date: '2024-01-19', note: 'Package shipped to customer via UPS', updatedBy: 'admin' },
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
    status: 'shipped_to_customer',
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
      { status: 'shipped_to_hub', date: '2024-01-16', note: 'Package shipped to Admin Hub via UPS', updatedBy: 'vendor' },
      { status: 'at_hub', date: '2024-01-17', note: 'Package received at Admin Hub', updatedBy: 'system' },
      { status: 'hub_quality_check', date: '2024-01-17', note: 'Quality inspection in progress', updatedBy: 'admin' },
      { status: 'shipped_to_customer', date: '2024-01-18', note: 'Quality approved, shipped to customer via DHL', updatedBy: 'admin' }
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
    status: 'delivered',
    paymentStatus: 'paid',
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
    returnReason: 'Hub quality check failed - fabric defect found, returned to vendor for replacement',
    customerNotes: 'Quality issue detected during hub inspection',
    adminNotes: 'Quality issue detected during inspection - returned to vendor for replacement',
    createdAt: '2024-01-12T16:45:00Z',
    updatedAt: '2024-01-20T09:15:00Z',
    statusHistory: [
      { status: 'pending', date: '2024-01-12', note: 'Order placed by customer', updatedBy: 'customer' },
      { status: 'confirmed', date: '2024-01-12', note: 'Payment confirmed', updatedBy: 'system' },
      { status: 'processing', date: '2024-01-13', note: 'Vendor processing order', updatedBy: 'vendor' },
      { status: 'shipped_to_hub', date: '2024-01-14', note: 'Package shipped to Admin Hub via USPS', updatedBy: 'vendor' },
      { status: 'at_hub', date: '2024-01-15', note: 'Package received at Admin Hub', updatedBy: 'system' },
      { status: 'hub_quality_check', date: '2024-01-16', note: 'Quality inspection in progress', updatedBy: 'admin' },
      { status: 'shipped_to_customer', date: '2024-01-17', note: 'Package shipped to customer via FedEx', updatedBy: 'admin' },
      { status: 'delivered', date: '2024-01-17', note: 'Package delivered', updatedBy: 'system' }
    ],
    deliveryPreferences: {
      preferredTime: 'Evening (5PM-8PM)',
      specialInstructions: 'Ring doorbell twice',
      signatureRequired: false,
      leaveAtDoor: true
    }
  }
];

export default function CustomerOrder() {
  const [orders] = useState<CustomerOrder[]>(mockCustomerOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<CustomerOrder | null>(null);

  // Calculate stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const shippedOrders = orders.filter(order => order.status === 'shipped_to_hub' || order.status === 'shipped_to_customer').length;
  const deliveredOrders = orders.filter(order => order.status === 'delivered').length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.trackingNumber && order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

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



  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const showPrintPreview = (order: CustomerOrder) => {
    setSelectedOrderForPrint(order);
    setShowPrintModal(true);
  };

  const handlePrint = () => {
    // Print functionality is now handled directly in the modal
    setShowPrintModal(false);
  };

  const handleClosePrintModal = () => {
    setShowPrintModal(false);
    setSelectedOrderForPrint(null);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Order Management</h1>
          <p className="text-gray-600">Monitor customer orders and delivery experience</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard/orders/customer/add">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white">
              <Package className="h-4 w-4 mr-2" />
              Create Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-gray-600">All customer orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
            <p className="text-xs text-gray-600">Awaiting processing</p>
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
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Total value</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-slate-900">Filter Orders</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Search className="w-4 h-4 inline mr-2" />
                Search Orders
              </label>
              <input
                type="text"
                placeholder="Search orders, customers, or tracking numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 placeholder:text-slate-400"
              />
            </div>
            
            <div>
              <Dropdown
                label="Order Status"
                id="statusFilter"
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'shipped_to_hub', label: 'Shipped to Hub' },
                  { value: 'at_hub', label: 'At Hub' },
                  { value: 'hub_quality_check', label: 'Quality Check' },
                  { value: 'hub_approved', label: 'Hub Approved' },
                  { value: 'shipped_to_customer', label: 'Shipped to Customer' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'cancelled', label: 'Cancelled' }
                ]}
                onChange={(value) => setStatusFilter(value as string)}
                placeholder="Select status"
              />
            </div>
            
            <div>
              <Dropdown
                label="Payment Status"
                id="paymentFilter"
                value={paymentFilter}
                options={[
                  { value: 'all', label: 'All Payments' },
                  { value: 'pending', label: 'Payment Pending' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'failed', label: 'Payment Failed' }
                ]}
                onChange={(value) => setPaymentFilter(value as string)}
                placeholder="Select payment status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
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
                        <div className="text-sm text-gray-500">
                          {order.customer.totalOrders} orders
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell className="font-medium">${order.total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                    <TableCell>
                      {order.actualDelivery ? (
                        <div className="text-sm text-green-600">
                          Delivered {order.actualDelivery}
                        </div>
                      ) : order.estimatedDelivery ? (
                        <div className="text-sm text-gray-600">
                          Est. {order.estimatedDelivery}
                        </div>
                      ) : (
                        <span className="text-gray-400">TBD</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/dashboard/orders/customer/view/${order.id}`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="hover:bg-gray-100"
                            title="View Order Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/dashboard/orders/customer/edit/${order.id}`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="hover:bg-gray-100"
                            title="Edit Order & Shipping"
                          >
                            <SquarePen className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover:bg-gray-100"
                          title="Print Shipment Invoice"
                          onClick={() => showPrintPreview(order)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Print Preview Modal */}
      {selectedOrderForPrint && (
        <PrintPreviewModal
          isOpen={showPrintModal}
          onClose={handleClosePrintModal}
          htmlContent={generateInvoiceHTML(selectedOrderForPrint)}
          title={`Invoice Preview - ${selectedOrderForPrint.orderNumber}`}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}