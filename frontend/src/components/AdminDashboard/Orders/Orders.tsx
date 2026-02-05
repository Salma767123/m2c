'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/Table'
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import { 
  ShoppingCart, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  Search, 
  Filter, 
  Eye, 
  DollarSign,
  X,
  Save
} from 'lucide-react'
import Link from 'next/link'
import Dropdown from '@/components/UI/Dropdown'

interface OrderItem {
  id: string
  productName: string
  sku: string
  quantity: number
  price: number
  total: number
  image?: string
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
  id: string
  orderNumber: string
  customer: {
    name: string
    email: string
    phone: string
  }
  vendor: {
    name: string
    id: string
  }
  items: OrderItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  status: 'pending' | 'confirmed' | 'processing' | 'shipped_to_hub' | 'at_hub' | 'hub_quality_check' | 'hub_approved' | 'shipped_to_customer' | 'delivered' | 'cancelled'
  vendorStatus?: 'new_order' | 'processing' | 'packed' | 'ready_to_ship' | 'shipped_to_hub' | 'delivered_to_hub'
  shippingStatus?: 'pending' | 'ready_to_ship' | 'shipped_to_hub' | 'received_at_hub' | 'quality_check' | 'approved' | 'rejected'
  paymentStatus: 'pending' | 'paid' | 'failed'
  vendorShippingAddress: ShippingAddress // Admin Hub address
  customerShippingAddress: ShippingAddress // Final customer address
  currentLocation: 'vendor' | 'hub' | 'customer'
  trackingInfo?: {
    vendorToHub?: {
      trackingNumber: string
      carrier: string
      shippedDate: string
      receivedDate?: string
    }
    hubToCustomer?: {
      trackingNumber: string
      carrier: string
      shippedDate: string
      deliveredDate?: string
    }
  }
  hubQualityCheck?: {
    passed: boolean
    notes: string
    checkedBy: string
    checkDate: string
    issues?: string[]
    action: 'approve' | 'return_to_vendor' | 'replace'
  }
  estimatedDelivery?: string
  createdAt: string
  updatedAt: string
  notes?: string
}

// Mock orders data for textile business
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
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
    vendorStatus: 'processing',
    shippingStatus: 'pending',
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
    orderNumber: 'ORD-2024-002',
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
    vendorStatus: 'shipped_to_hub',
    shippingStatus: 'shipped_to_hub',
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
    orderNumber: 'ORD-2024-003',
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
    vendorStatus: 'delivered_to_hub',
    shippingStatus: 'approved',
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
  {
    id: '4',
    orderNumber: 'ORD-2024-004',
    customer: {
      name: 'David Wilson',
      email: 'david.wilson@email.com',
      phone: '+1 (555) 234-5678'
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
    status: 'processing',
    vendorStatus: 'packed',
    shippingStatus: 'ready_to_ship',
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
      name: 'David Wilson',
      addressLine1: '321 Business Ave',
      addressLine2: 'Suite 500',
      landmark: 'Corporate Center',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75201',
      country: 'United States',
      phone: '+1 (555) 234-5678'
    },
    currentLocation: 'vendor',
    estimatedDelivery: '2024-01-25',
    createdAt: '2024-01-18T09:00:00Z',
    updatedAt: '2024-01-18T14:30:00Z'
  },
  {
    id: '5',
    orderNumber: 'ORD-2024-005',
    customer: {
      name: 'Lisa Thompson',
      email: 'lisa.thompson@email.com',
      phone: '+1 (555) 345-6789'
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
    status: 'hub_approved',
    vendorStatus: 'delivered_to_hub',
    shippingStatus: 'approved',
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
      name: 'Lisa Thompson',
      addressLine1: '654 Residential St',
      addressLine2: 'Apt 8C',
      landmark: 'Near Shopping Mall',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      country: 'United States',
      phone: '+1 (555) 345-6789'
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
    hubQualityCheck: {
      passed: true,
      notes: 'Packaging materials approved, ready for customer shipment',
      checkedBy: 'Quality Inspector - Sarah Wilson',
      checkDate: '2024-01-18T14:00:00Z',
      action: 'approve'
    },
    estimatedDelivery: '2024-01-22',
    createdAt: '2024-01-16T11:15:00Z',
    updatedAt: '2024-01-19T08:45:00Z'
  }
]

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>(mockOrders)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  
  // Modal state for Get Order action
  const [showGetOrderModal, setShowGetOrderModal] = useState(false)
  const [selectedOrderForGet, setSelectedOrderForGet] = useState<Order | null>(null)
  const [getOrderNotes, setGetOrderNotes] = useState('')

  // Function to handle "Get Order" action for vendor orders
  const handleGetOrderClick = (order: Order) => {
    setSelectedOrderForGet(order)
    setShowGetOrderModal(true)
    setGetOrderNotes('')
  }

  const handleConfirmGetOrder = () => {
    if (selectedOrderForGet) {
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order.id === selectedOrderForGet.id) {
            return {
              ...order,
              status: 'delivered' as const,
              vendorStatus: 'delivered_to_hub' as const,
              shippingStatus: 'approved' as const,
              currentLocation: 'hub' as const,
              updatedAt: new Date().toISOString(),
              notes: getOrderNotes || order.notes
            }
          }
          return order
        })
      )
      setShowGetOrderModal(false)
      setSelectedOrderForGet(null)
      setGetOrderNotes('')
    }
  }

  const handleCancelGetOrder = () => {
    setShowGetOrderModal(false)
    setSelectedOrderForGet(null)
    setGetOrderNotes('')
  }

  // Calculate stats
  const totalOrders = orders.length
  const pendingOrders = orders.filter(order => order.status === 'pending').length
  const processingOrders = orders.filter(order => order.status === 'processing').length
  const atHubOrders = orders.filter(order => order.status === 'at_hub' || order.status === 'hub_quality_check' || order.status === 'hub_approved').length
  const shippedOrders = orders.filter(order => order.status === 'shipped_to_hub' || order.status === 'shipped_to_customer').length
  const deliveredOrders = orders.filter(order => order.status === 'delivered').length
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter

    return matchesSearch && matchesStatus && matchesPayment
  })

  const getStatusBadge = (order: Order) => {
    // Unified status display with vendor and shipping information
    const vendorStatusText = order.vendorStatus ? 
      order.vendorStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
      'New Order'
    
    const shippingStatusText = order.shippingStatus ? 
      order.shippingStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
      'Pending'

    switch (order.status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'confirmed':
        return (
          <div className="space-y-1">
            <Badge className="bg-blue-100 text-blue-800 block">Confirmed</Badge>
            <Badge className="bg-gray-100 text-gray-800 block text-xs">Vendor: {vendorStatusText}</Badge>
          </div>
        )
      case 'processing':
        return (
          <div className="space-y-1">
            <Badge className="bg-purple-100 text-purple-800 block">Processing</Badge>
            <Badge className="bg-blue-100 text-blue-800 block text-xs">Vendor: {vendorStatusText}</Badge>
            <Badge className="bg-yellow-100 text-yellow-800 block text-xs">Shipping: {shippingStatusText}</Badge>
          </div>
        )
      case 'shipped_to_hub':
        return (
          <div className="space-y-1">
            <Badge className="bg-indigo-100 text-indigo-800 block">Shipped to Hub</Badge>
            <Badge className="bg-blue-100 text-blue-800 block text-xs">Vendor: {vendorStatusText}</Badge>
            <Badge className="bg-indigo-100 text-indigo-800 block text-xs">Shipping: {shippingStatusText}</Badge>
          </div>
        )
      case 'at_hub':
        return <Badge className="bg-orange-100 text-orange-800">At Hub</Badge>
      case 'hub_quality_check':
        return <Badge className="bg-amber-100 text-amber-800">Quality Check</Badge>
      case 'hub_approved':
        return (
          <div className="space-y-1">
            <Badge className="bg-emerald-100 text-emerald-800 block">Hub Approved</Badge>
            <Badge className="bg-green-100 text-green-800 block text-xs">Ready for Customer</Badge>
          </div>
        )
      case 'shipped_to_customer':
        return <Badge className="bg-cyan-100 text-cyan-800">Shipped to Customer</Badge>
      case 'delivered':
        return (
          <div className="space-y-1">
            <Badge className="bg-green-100 text-green-800 block">Delivered</Badge>
            <Badge className="bg-emerald-100 text-emerald-800 block text-xs">Complete</Badge>
          </div>
        )
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Overview</h1>
          <p className="text-gray-600">Comprehensive order tracking and management dashboard</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-gray-600">All orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
            <p className="text-xs text-gray-600">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{processingOrders}</div>
            <p className="text-xs text-gray-600">Being prepared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Hub</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{atHubOrders}</div>
            <p className="text-xs text-gray-600">Quality check</p>
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
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search orders, customers, or vendors..."
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
                />
              </div>
              <Dropdown
                id="paymentFilter"
                value={paymentFilter}
                options={[
                  { value: 'all', label: 'All Payments' },
                  { value: 'pending', label: 'Payment Pending' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'failed', label: 'Payment Failed' }
                ]}
                onChange={(value) => setPaymentFilter(value as string)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
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
                        {order.trackingInfo?.vendorToHub?.trackingNumber && (
                          <div className="text-sm text-gray-500">Track: {order.trackingInfo.vendorToHub.trackingNumber}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer.name}</div>
                        <div className="text-sm text-gray-500">{order.customer.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{order.vendor.name}</TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell className="font-medium">${order.total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order)}</TableCell>
                    <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link href={`/admin/dashboard/orders/view/${order.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {/* Get Order button for orders that are not delivered */}
                        {order.status !== 'delivered' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleGetOrderClick(order)}
                            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300"
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Get Order
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Get Order Confirmation Modal */}
      {showGetOrderModal && selectedOrderForGet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Confirm Order Receipt</p>
                <h3 className="text-lg font-semibold text-gray-900">{selectedOrderForGet.orderNumber}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-gray-50 hover:text-gray-900"
                onClick={handleCancelGetOrder}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Vendor:</span>
                      <span className="font-medium ml-2 text-gray-900">{selectedOrderForGet.vendor.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Items:</span>
                      <span className="font-medium ml-2 text-gray-900">{selectedOrderForGet.items.length} items</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Value:</span>
                      <span className="font-medium ml-2 text-gray-900">${selectedOrderForGet.total.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Status:</span>
                      <div className="mt-1">
                        {getStatusBadge(selectedOrderForGet)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Receipt Notes (Optional)
                  </label>
                  <textarea
                    value={getOrderNotes}
                    onChange={(e) => setGetOrderNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 resize-none"
                    placeholder="Add any notes about the order receipt, quality check, or special instructions..."
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Confirmation:</strong> This will mark the vendor order as delivered to the admin hub and update the status to "Received".
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
              <Button
                variant="outline"
                className="hover:bg-gray-50 hover:border-gray-200"
                onClick={handleCancelGetOrder}
              >
                Cancel
              </Button>
              <Button 
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={handleConfirmGetOrder}
              >
                <Save className="w-4 h-4 mr-2" />
                Confirm Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}