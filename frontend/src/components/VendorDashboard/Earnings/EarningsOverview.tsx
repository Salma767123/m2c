'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/UI/Table';
import Dropdown from '@/components/UI/Dropdown';
import {
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Package,
  ShoppingCart,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

interface EarningsSummary {
  grossSales: number;
  refunds: number;
  netSales: number;
  commissionRate: number;
  commissionAmount: number;
  netEarnings: number;
  availableForPayout: number;
  pendingPayout: number;
  nextPayoutDate: string;
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  growthPercentage: number;
}

interface RecentOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderAmount: number;
  commission: number;
  vendorEarnings: number;
  status: string;
  orderDate: string;
}

interface TopProduct {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  contributionPercentage: number;
}

// Mock data
const mockEarningsSummary: EarningsSummary = {
  grossSales: 125000,
  refunds: 2500,
  netSales: 122500,
  commissionRate: 10,
  commissionAmount: 12250,
  netEarnings: 110250,
  availableForPayout: 87500,
  pendingPayout: 22750,
  nextPayoutDate: '2024-02-15',
  totalOrders: 156,
  completedOrders: 148,
  averageOrderValue: 801.28,
  growthPercentage: 12.5,
};

const mockRecentOrders: RecentOrder[] = [
  {
    orderId: '1',
    orderNumber: 'ORD-001',
    customerName: 'John Doe',
    orderAmount: 2500,
    commission: 250,
    vendorEarnings: 2250,
    status: 'Completed',
    orderDate: '2024-02-10',
  },
  {
    orderId: '2',
    orderNumber: 'ORD-002',
    customerName: 'Sarah Smith',
    orderAmount: 1800,
    commission: 180,
    vendorEarnings: 1620,
    status: 'Completed',
    orderDate: '2024-02-09',
  },
  {
    orderId: '3',
    orderNumber: 'ORD-003',
    customerName: 'Mike Johnson',
    orderAmount: 3200,
    commission: 320,
    vendorEarnings: 2880,
    status: 'Processing',
    orderDate: '2024-02-08',
  },
];

const mockTopProducts: TopProduct[] = [
  {
    productId: '1',
    productName: 'Premium Cotton Kitchen Towel Set',
    unitsSold: 234,
    revenue: 58500,
    contributionPercentage: 47.5,
  },
  {
    productId: '2',
    productName: 'Handwoven Bath Towel Collection',
    unitsSold: 198,
    revenue: 49500,
    contributionPercentage: 40.2,
  },
  {
    productId: '3',
    productName: 'Artisan Linen Apron',
    unitsSold: 89,
    revenue: 15125,
    contributionPercentage: 12.3,
  },
];

export default function EarningsOverview() {
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const earnings = mockEarningsSummary;

  const getStatusBadge = (status: string) => {
    const styles = {
      Completed: 'bg-green-100 text-green-800',
      Processing: 'bg-blue-100 text-blue-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      Cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earnings Overview</h1>
          <p className="text-gray-600 mt-1">Track your sales, earnings, and upcoming payouts</p>
        </div>
        <div className="flex gap-3">
          <div className="w-48">
            <Dropdown
              value={selectedPeriod}
              options={[
                { value: 'this_week', label: 'This Week' },
                { value: 'this_month', label: 'This Month' },
                { value: 'last_month', label: 'Last Month' },
                { value: 'last_3_months', label: 'Last 3 Months' },
                { value: 'custom', label: 'Custom Range' },
              ]}
              onChange={(val) => setSelectedPeriod(val as string)}
              placeholder="Select Period"
            />
          </div>
          <Button className="bg-gray-900 hover:bg-gray-700 gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Gross Sales</p>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  ₹{earnings.grossSales.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-gray-500">
                  {earnings.totalOrders} orders
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-100">
                <ShoppingCart className="w-6 h-6 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Platform Commission</p>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  -₹{earnings.commissionAmount.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-gray-500">
                  {earnings.commissionRate}% of sales
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-100">
                <TrendingUp className="w-6 h-6 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Net Earnings</p>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  ₹{earnings.netEarnings.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" />
                  {earnings.growthPercentage}% vs last period
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-100">
                <DollarSign className="w-6 h-6 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Available for Payout</p>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  ₹{earnings.availableForPayout.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-gray-600">
                  Ready to withdraw
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown & Next Payout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              Earnings Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2">
                <span className="text-gray-600">Gross Sales</span>
                <span className="font-semibold text-gray-900">
                  ₹{earnings.grossSales.toLocaleString('en-IN')}
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-2 border-t pt-2">
                <span className="text-red-600">Refunds</span>
                <span className="font-semibold text-red-600">
                  -₹{earnings.refunds.toLocaleString('en-IN')}
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-2 border-t pt-2">
                <span className="text-gray-600">Net Sales</span>
                <span className="font-semibold text-gray-900">
                  ₹{earnings.netSales.toLocaleString('en-IN')}
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-2 border-t pt-2">
                <span className="text-orange-600">
                  Platform Commission ({earnings.commissionRate}%)
                </span>
                <span className="font-semibold text-orange-600">
                  -₹{earnings.commissionAmount.toLocaleString('en-IN')}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
                <span className="font-bold text-gray-900 text-lg">Your Earnings</span>
                <span className="font-bold text-green-600 text-lg">
                  ₹{earnings.netEarnings.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Payout */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Calendar className="w-5 h-5" />
              Next Payout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Scheduled Date</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Date(earnings.nextPayoutDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-300">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Available Amount</p>
                  <p className="text-xl font-bold text-gray-900">
                    ₹{earnings.availableForPayout.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-xl font-bold text-gray-900">
                    ₹{earnings.pendingPayout.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              
              <Link href="/vendor/dashboard/earnings/payouts">
                <Button className="w-full bg-gray-900 hover:bg-gray-700 text-white mt-4">
                  View Payout History
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{earnings.totalOrders}</p>
              </div>
              <ShoppingCart className="w-10 h-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed Orders</p>
                <p className="text-2xl font-bold text-gray-900">{earnings.completedOrders}</p>
              </div>
              <Package className="w-10 h-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{earnings.averageOrderValue.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-600" />
            Top Performing Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTopProducts.map((product, index) => (
              <div
                key={product.productId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 text-white font-bold">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{product.productName}</p>
                    <p className="text-sm text-gray-600">{product.unitsSold} units sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    ₹{product.revenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-gray-600">{product.contributionPercentage}% of revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              Recent Orders
            </CardTitle>
            <Link href="/vendor/dashboard/orders">
              <Button variant="outline" size="sm" className="gap-2">
                View All Orders
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order Amount</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Your Earnings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRecentOrders.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{order.orderNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-gray-900">{order.customerName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">
                      ₹{order.orderAmount.toLocaleString('en-IN')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-600">
                      -₹{order.commission.toLocaleString('en-IN')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-gray-900">
                      ₹{order.vendorEarnings.toLocaleString('en-IN')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-gray-600">
                      {new Date(order.orderDate).toLocaleDateString('en-IN')}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Note:</span> Your earnings are calculated after deducting
            the platform commission of {earnings.commissionRate}%. Payouts are processed automatically
            based on your payout schedule. Available balance will be transferred to your registered
            bank account on the next payout date.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
