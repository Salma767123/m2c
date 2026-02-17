'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/UI/Table';
import Dropdown from '@/components/UI/Dropdown';
import {
  BarChart3,
  Download,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  Clock,
  Star,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  PieChart,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  BarChart as RechartsBarChart,
  Bar,
} from 'recharts';

interface ReportData {
  period: string;
  revenue: number;
  customers: number;
  orders: number;
  avgOrderValue: number;
  productsListed: number;
}

interface ProductPerformance {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  stock: number;
  trend: number;
  rating: number;
}

interface OrderMetrics {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

const mockReportData: ReportData[] = [
  { period: 'Jan 2024', revenue: 12450, customers: 89, orders: 156, avgOrderValue: 79.81, productsListed: 45 },
  { period: 'Dec 2023', revenue: 10200, customers: 76, orders: 142, avgOrderValue: 71.83, productsListed: 42 },
  { period: 'Nov 2023', revenue: 9800, customers: 72, orders: 134, avgOrderValue: 73.13, productsListed: 40 },
  { period: 'Oct 2023', revenue: 11200, customers: 81, orders: 148, avgOrderValue: 75.68, productsListed: 38 },
];

const topProducts: ProductPerformance[] = [
  { id: '1', name: 'Premium Cotton Kitchen Towel Set', sales: 234, revenue: 5850, stock: 145, trend: 12, rating: 4.8 },
  { id: '2', name: 'Handwoven Bath Towel Collection', sales: 198, revenue: 4950, stock: 89, trend: 8, rating: 4.9 },
  { id: '3', name: 'Artisan Linen Apron', sales: 167, revenue: 4175, stock: 234, trend: 15, rating: 4.7 },
  { id: '4', name: 'Heritage Table Runner', sales: 145, revenue: 3625, stock: 67, trend: -3, rating: 4.6 },
  { id: '5', name: 'Organic Tea Towel Set', sales: 132, revenue: 3300, stock: 178, trend: 5, rating: 4.8 },
];

const orderMetrics: OrderMetrics[] = [
  { status: 'Delivered', count: 106, percentage: 68, color: 'bg-green-500' },
  { status: 'Processing', count: 30, percentage: 19, color: 'bg-blue-500' },
  { status: 'Pending', count: 15, percentage: 10, color: 'bg-yellow-500' },
  { status: 'Cancelled', count: 5, percentage: 3, color: 'bg-red-500' },
];

const COLORS = ['#10b981', '#3b82f6', '#eab308', '#ef4444'];

const orderValueDistribution = [
  { range: '$0-$50', count: 45, percentage: 29 },
  { range: '$51-$100', count: 58, percentage: 37 },
  { range: '$101-$200', count: 38, percentage: 24 },
  { range: '$200+', count: 15, percentage: 10 },
];

const VALUE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function VendorReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');
  const [reportType, setReportType] = useState<'overview' | 'sales' | 'orders' | 'products' | 'performance'>('overview');
  const [exportFormat, setExportFormat] = useState('pdf');

  const currentData = mockReportData[0];
  const previousData = mockReportData[1];

  const calculateChange = (current: number, previous: number): string => {
    const change = ((current - previous) / previous * 100);
    return change.toFixed(1);
  };

  const getTrendIcon = (change: string) => {
    const value = parseFloat(change);
    if (value > 0) return <ArrowUp className="w-4 h-4" />;
    if (value < 0) return <ArrowDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = (change: string) => {
    const value = parseFloat(change);
    if (value > 0) return 'text-gray-900';
    if (value < 0) return 'text-gray-600';
    return 'text-gray-600';
  };

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting report as ${format}`);
  };

  const metrics = [
    {
      label: 'Total Revenue',
      value: `$${currentData.revenue.toLocaleString()}`,
      change: calculateChange(currentData.revenue, previousData.revenue),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      iconBg: 'bg-green-100',
    },
    {
      label: 'Total Orders',
      value: currentData.orders.toLocaleString(),
      change: calculateChange(currentData.orders, previousData.orders),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Products Listed',
      value: currentData.productsListed.toLocaleString(),
      change: calculateChange(currentData.productsListed, previousData.productsListed),
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      iconBg: 'bg-purple-100',
    },
    {
      label: 'Avg Order Value',
      value: `$${currentData.avgOrderValue.toFixed(2)}`,
      change: calculateChange(currentData.avgOrderValue, previousData.avgOrderValue),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
      iconBg: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Track your store performance and insights</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="w-48">
            <Dropdown
              value={selectedPeriod}
              options={[
                'Today',
                'Last 7 Days',
                'Last 30 Days',
                'Last 3 Months',
                'Last 6 Months',
                'Last Year',
                'Custom Range'
              ]}
              placeholder="Select Period"
              onChange={(val) => setSelectedPeriod(val as string)}
            />
          </div>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <div className="flex gap-2">
            <div className="w-32">
              <Dropdown
                value={exportFormat}
                options={[
                  { value: 'pdf', label: 'PDF' },
                  { value: 'excel', label: 'Excel' },
                  { value: 'csv', label: 'CSV' }
                ]}
                onChange={(val) => setExportFormat(val as string)}
              />
            </div>
            <Button 
              className="bg-gray-900 hover:bg-gray-700 gap-2"
              onClick={() => handleExport(exportFormat as 'pdf' | 'excel' | 'csv')}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Report Type Tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'sales', label: 'Sales', icon: DollarSign },
              { id: 'orders', label: 'Orders', icon: ShoppingCart },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'performance', label: 'Performance', icon: TrendingUp },
            ].map((type) => {
              const Icon = type.icon;
              const isActive = reportType === type.id;
              return (
                <Button
                  key={type.id}
                  variant="outline"
                  onClick={() => setReportType(type.id as any)}
                  className={`gap-2 ${
                    isActive 
                      ? 'bg-gray-900 text-white hover:bg-gray-800 border-gray-900' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {type.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className={metric.bgColor}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{metric.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mb-2">{metric.value}</p>
                    <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor(metric.change)}`}>
                      {getTrendIcon(metric.change)}
                      <span>{Math.abs(parseFloat(metric.change))}%</span>
                      <span className="text-gray-500 text-xs ml-1">vs last period</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${metric.iconBg || metric.bgColor}`}>
                    <Icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overview Report */}
      {reportType === 'overview' && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={mockReportData.slice().reverse()}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="period" 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number | string | undefined) => {
                        if (value === undefined) return ['$0', 'Revenue'];
                        const numValue = typeof value === 'string' ? parseFloat(value) : value;
                        return [`$${numValue.toLocaleString()}`, 'Revenue'];
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-gray-600" />
                  Order Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <RechartsPieChart>
                    <Pie
                      data={orderMetrics}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.status}: ${entry.percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {orderMetrics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any, name: any, props: any) => {
                        if (value === undefined) return ['0 orders', ''];
                        const status = props.payload?.status || '';
                        const percentage = props.payload?.percentage || 0;
                        return [`${value} orders (${percentage}%)`, status];
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value: any, entry: any) => entry.payload?.status || value}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Products Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600" />
                Top Performing Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium text-gray-900">{product.name}</TableCell>
                      <TableCell className="text-gray-600">{product.sales}</TableCell>
                      <TableCell className="text-gray-600">${product.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-gray-600">{product.stock}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-gray-900">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {product.rating}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 font-medium ${product.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.trend >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                          {Math.abs(product.trend)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Sales Report */}
      {reportType === 'sales' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales & Revenue Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="text-center">
                  <DollarSign className="w-20 h-20 text-blue-400 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-700">Sales Analytics Dashboard</p>
                  <p className="text-gray-500 mt-2">Detailed sales charts and metrics will be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Daily Average</p>
                    <p className="text-2xl font-bold text-gray-900">$415</p>
                    <p className="text-sm text-green-600 mt-1">+8.2% from yesterday</p>
                  </div>
                  <Calendar className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Peak Hour</p>
                    <p className="text-2xl font-bold text-gray-900">2-4 PM</p>
                    <p className="text-sm text-gray-600 mt-1">Highest sales volume</p>
                  </div>
                  <Clock className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">3.2%</p>
                    <p className="text-sm text-green-600 mt-1">+0.3% improvement</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Avg Order Value</TableHead>
                    <TableHead>Growth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockReportData.map((data, index) => {
                    const prevData = mockReportData[index + 1];
                    const growth = prevData ? calculateChange(data.revenue, prevData.revenue) : '0';
                    return (
                      <TableRow key={data.period}>
                        <TableCell className="font-medium text-gray-900">{data.period}</TableCell>
                        <TableCell className="text-gray-600">${data.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-gray-600">{data.orders}</TableCell>
                        <TableCell className="text-gray-600">${data.avgOrderValue.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1 font-medium ${getTrendColor(growth)}`}>
                            {getTrendIcon(growth)}
                            {Math.abs(parseFloat(growth))}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products Report */}
      {reportType === 'orders' && (
        <div className="space-y-6">
          {/* Order Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                    <p className="text-3xl font-bold text-gray-900">{currentData.orders}</p>
                  </div>
                  <ShoppingCart className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed</p>
                    <p className="text-3xl font-bold text-gray-900">106</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Processing</p>
                    <p className="text-3xl font-bold text-gray-900">30</p>
                  </div>
                  <Clock className="w-10 h-10 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
                    <p className="text-3xl font-bold text-gray-900">${currentData.avgOrderValue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-gray-600" />
                Order Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderMetrics.map((item) => (
                  <div key={item.status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="font-medium text-gray-700">{item.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600">{item.count} orders</span>
                        <span className="font-semibold text-gray-900">{item.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order History Table - WITHOUT CUSTOMER DETAILS */}
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { orderId: 'ORD-2024-001', product: 'Premium Cotton Kitchen Towel Set', quantity: 2, amount: 50, date: '2024-02-10', status: 'Delivered' },
                    { orderId: 'ORD-2024-002', product: 'Handwoven Bath Towel Collection', quantity: 1, amount: 75, date: '2024-02-11', status: 'Delivered' },
                    { orderId: 'ORD-2024-003', product: 'Artisan Linen Apron', quantity: 3, amount: 90, date: '2024-02-12', status: 'Processing' },
                    { orderId: 'ORD-2024-004', product: 'Heritage Table Runner', quantity: 1, amount: 45, date: '2024-02-13', status: 'Processing' },
                    { orderId: 'ORD-2024-005', product: 'Organic Tea Towel Set', quantity: 2, amount: 60, date: '2024-02-14', status: 'Pending' },
                  ].map((order, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-gray-900">{order.orderId}</TableCell>
                      <TableCell className="text-gray-600">{order.product}</TableCell>
                      <TableCell className="text-gray-600">{order.quantity}</TableCell>
                      <TableCell className="text-gray-600">${order.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-gray-600">{new Date(order.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {order.status === 'Delivered' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            {order.status}
                          </span>
                        ) : order.status === 'Processing' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Clock className="w-3 h-3" />
                            {order.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertCircle className="w-3 h-3" />
                            {order.status}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Order Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Volume Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={256}>
                  <RechartsBarChart data={mockReportData.slice().reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="period" 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any) => {
                        if (value === undefined) return ['0', 'Orders'];
                        return [`${value} orders`, 'Total'];
                      }}
                    />
                    <Bar 
                      dataKey="orders" 
                      fill="#3b82f6" 
                      radius={[8, 8, 0, 0]}
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Value Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={256}>
                  <RechartsPieChart>
                    <Pie
                      data={orderValueDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.range}: ${entry.percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {orderValueDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={VALUE_COLORS[index % VALUE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any, name: any, props: any) => {
                        if (value === undefined) return ['0 orders', ''];
                        const range = props.payload?.range || '';
                        const percentage = props.payload?.percentage || 0;
                        return [`${value} orders (${percentage}%)`, range];
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value: any, entry: any) => entry.payload?.range || value}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Products Report */}
      {reportType === 'products' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Products</p>
                    <p className="text-3xl font-bold text-gray-900">{currentData.productsListed}</p>
                  </div>
                  <Package className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">In Stock</p>
                    <p className="text-3xl font-bold text-gray-900">38</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Out of Stock</p>
                    <p className="text-3xl font-bold text-gray-900">4</p>
                  </div>
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Low Stock</p>
                    <p className="text-3xl font-bold text-gray-900">3</p>
                  </div>
                  <AlertCircle className="w-10 h-10 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Product Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium text-gray-900">{product.name}</TableCell>
                      <TableCell className="text-gray-600">{product.sales} units</TableCell>
                      <TableCell className="text-gray-600">${product.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-gray-600">{product.stock}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-gray-900">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {product.rating}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 font-medium ${product.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.trend >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                          {Math.abs(product.trend)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {product.stock > 100 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            In Stock
                          </span>
                        ) : product.stock > 50 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertCircle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3" />
                            Critical
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Report */}
      {reportType === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Fulfillment Rate</p>
                    <p className="text-3xl font-bold text-gray-900">96.8%</p>
                    <p className="text-sm text-green-600 mt-1">+2.1% improvement</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Delivery Time</p>
                    <p className="text-3xl font-bold text-gray-900">2.3 days</p>
                    <p className="text-sm text-green-600 mt-1">-0.2 days faster</p>
                  </div>
                  <Clock className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Customer Rating</p>
                    <p className="text-3xl font-bold text-gray-900">4.7</p>
                    <p className="text-sm text-green-600 mt-1">+0.1 improvement</p>
                  </div>
                  <Star className="w-10 h-10 text-yellow-600 fill-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Orders Fulfilled</TableHead>
                    <TableHead>Fulfillment Rate</TableHead>
                    <TableHead>Avg Delivery Time</TableHead>
                    <TableHead>Customer Rating</TableHead>
                    <TableHead>Return Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { month: 'Jan 2024', fulfilled: 151, rate: 96.8, delivery: 2.3, rating: 4.7, returns: 3.2 },
                    { month: 'Dec 2023', fulfilled: 138, rate: 97.2, delivery: 2.5, rating: 4.6, returns: 2.8 },
                    { month: 'Nov 2023', fulfilled: 130, rate: 97.0, delivery: 2.4, rating: 4.6, returns: 3.0 },
                    { month: 'Oct 2023', fulfilled: 144, rate: 97.3, delivery: 2.2, rating: 4.7, returns: 2.7 },
                  ].map((metric, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-gray-900">{metric.month}</TableCell>
                      <TableCell className="text-gray-600">{metric.fulfilled}</TableCell>
                      <TableCell className="text-gray-600">{metric.rate}%</TableCell>
                      <TableCell className="text-gray-600">{metric.delivery} days</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-gray-900">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {metric.rating}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">{metric.returns}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
