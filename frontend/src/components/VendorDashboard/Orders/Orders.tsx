'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table';
import Dropdown from '@/components/UI/Dropdown';
import { ShoppingCart, Search, Eye, Package, Truck, CheckCircle, Clock, PackageCheck, RotateCcw, X } from 'lucide-react';

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

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

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

  const updateOrderStatus = (orderId: string, newStatus: Order['status'], note?: string) => {
    setOrders(prevOrders => 
      prevOrders.map(order => {
        if (order.id === orderId) {
          const updatedHistory = [...(order.statusHistory || [])];
          updatedHistory.push({
            status: newStatus,
            date: new Date().toISOString().split('T')[0],
            note: note || `Status updated to ${newStatus}`
          });
          
          return {
            ...order,
            status: newStatus,
            statusHistory: updatedHistory
          };
        }
        return order;
      })
    );
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

  const canAdvanceStatus = (status: Order['status']) => {
    return getNextStatus(status) !== null;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">Orders</h1>
          <p className="text-slate-600">Manage and track your customer orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <ShoppingCart className="w-8 h-8 text-gray-700" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Orders</p>
                <p className="text-2xl font-bold text-[#222222]">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Processing</p>
                <p className="text-2xl font-bold text-[#222222]">
                  {orders.filter(o => o.status === 'Processing').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <PackageCheck className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Packed</p>
                <p className="text-2xl font-bold text-[#222222]">
                  {orders.filter(o => o.status === 'Packed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Truck className="w-8 h-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Shipped</p>
                <p className="text-2xl font-bold text-[#222222]">
                  {orders.filter(o => o.status === 'Shipped').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Delivered</p>
                <p className="text-2xl font-bold text-[#222222]">
                  {orders.filter(o => o.status === 'Delivered').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <RotateCcw className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Returns</p>
                <p className="text-2xl font-bold text-[#222222]">
                  {orders.filter(o => o.status === 'Returned').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders or customers..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="min-w-[200px]">
              <Dropdown
                value={statusFilter}
                options={[
                  'All',
                  'New Order',
                  'Processing',
                  'Packed',
                  'Shipped',
                  'Delivered',
                  'Returned',
                  'Cancelled'
                ]}
                placeholder="All Status"
                onChange={(value) => setStatusFilter(value as string)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="text-[#222222]">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium text-[#222222]">{order.orderNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-[#222222]">{order.customer}</div>
                      {/* <div className="text-sm text-slate-600">{order.email}</div> */}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600">{order.date}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-gray-50 hover:border-gray-200"
                        onClick={() => router.push(`/vendor/dashboard/orders/view/${order.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {canAdvanceStatus(order.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                          onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                        >
                          {getStatusIcon(getNextStatus(order.status)!)}
                          <span className="ml-1">{getNextStatus(order.status)}</span>
                        </Button>
                      )}
                      {order.status === 'Delivered' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                          onClick={() => updateOrderStatus(order.id, 'Returned', 'Customer initiated return')}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Return
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
