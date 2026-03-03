'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/UI/Table';
import Dropdown from '@/components/UI/Dropdown';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  Package,
  Store,
  ShoppingCart,
  Clock,
  PieChart,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ReportMetric {
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

interface ReportData {
  period: string;
  revenue: number;
  orders: number;
  vendors: number;
  customers: number;
  products: number;
  avgOrderValue: number;
}

interface CategoryData {
  name: string;
  revenue: number;
  orders: number;
  growth: number;
}

interface VendorPerformance {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  rating: number;
  fulfillmentTime: string;
}

const mockReportData: ReportData[] = [
  { period: 'Jan 2024', revenue: 125450, orders: 1256, vendors: 89, customers: 2340, products: 456, avgOrderValue: 99.88 },
  { period: 'Dec 2023', revenue: 102300, orders: 1142, vendors: 82, customers: 2156, products: 423, avgOrderValue: 89.58 },
  { period: 'Nov 2023', revenue: 98700, orders: 1089, vendors: 78, customers: 2034, products: 398, avgOrderValue: 90.63 },
  { period: 'Oct 2023', revenue: 112400, orders: 1198, vendors: 75, customers: 1987, products: 387, avgOrderValue: 93.82 },
];

const categoryData: CategoryData[] = [
  { name: 'Kitchen Towels', revenue: 45230, orders: 523, growth: 12.5 },
  { name: 'Bath Towels', revenue: 38950, orders: 412, growth: 8.3 },
  { name: 'Aprons', revenue: 22340, orders: 289, growth: 15.2 },
  { name: 'Table Linens', revenue: 18930, orders: 234, growth: -3.4 },
];

const topVendors: VendorPerformance[] = [
  { id: '1', name: 'Heritage Textiles', revenue: 28450, orders: 342, rating: 4.8, fulfillmentTime: '2.1 days' },
  { id: '2', name: 'Artisan Crafts Co.', revenue: 24680, orders: 298, rating: 4.9, fulfillmentTime: '1.8 days' },
  { id: '3', name: 'Eco Fabrics Ltd.', revenue: 21230, orders: 267, rating: 4.7, fulfillmentTime: '2.3 days' },
  { id: '4', name: 'Traditional Weavers', revenue: 19870, orders: 245, rating: 4.6, fulfillmentTime: '2.5 days' },
];

// Chart data
const revenueChartData = [
  { month: 'Jan', revenue: 125450, orders: 1256, expenses: 98230 },
  { month: 'Feb', revenue: 142300, orders: 1398, expenses: 105400 },
  { month: 'Mar', revenue: 138900, orders: 1342, expenses: 102100 },
  { month: 'Apr', revenue: 156700, orders: 1489, expenses: 112300 },
  { month: 'May', revenue: 148200, orders: 1423, expenses: 108900 },
  { month: 'Jun', revenue: 165400, orders: 1567, expenses: 118200 },
];

const orderStatusData = [
  { name: 'Delivered', value: 856, color: '#10b981' },
  { name: 'Processing', value: 234, color: '#3b82f6' },
  { name: 'Pending', value: 123, color: '#f59e0b' },
  { name: 'Cancelled', value: 43, color: '#ef4444' },
];

const salesTrendData = [
  { day: 'Mon', sales: 4200, orders: 42 },
  { day: 'Tue', sales: 3800, orders: 38 },
  { day: 'Wed', sales: 5100, orders: 51 },
  { day: 'Thu', sales: 4600, orders: 46 },
  { day: 'Fri', sales: 5800, orders: 58 },
  { day: 'Sat', sales: 6200, orders: 62 },
  { day: 'Sun', sales: 5400, orders: 54 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function AdminReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');
  const [reportType, setReportType] = useState<'overview' | 'sales' | 'orders' | 'settlement' | 'financial' | 'vendors' | 'products' | 'customers'>('overview');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedCustomReport, setSelectedCustomReport] = useState<string | null>(null);

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
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const metrics: ReportMetric[] = [
    {
      label: 'Total Revenue',
      value: `$${currentData.revenue.toLocaleString()}`,
      change: calculateChange(currentData.revenue, previousData.revenue),
      trend: parseFloat(calculateChange(currentData.revenue, previousData.revenue)) > 0 ? 'up' : 'down',
    },
    {
      label: 'Total Orders',
      value: currentData.orders.toLocaleString(),
      change: calculateChange(currentData.orders, previousData.orders),
      trend: parseFloat(calculateChange(currentData.orders, previousData.orders)) > 0 ? 'up' : 'down',
    },
    {
      label: 'Active Vendors',
      value: currentData.vendors.toLocaleString(),
      change: calculateChange(currentData.vendors, previousData.vendors),
      trend: parseFloat(calculateChange(currentData.vendors, previousData.vendors)) > 0 ? 'up' : 'down',
    },
    {
      label: 'Total Customers',
      value: currentData.customers.toLocaleString(),
      change: calculateChange(currentData.customers, previousData.customers),
      trend: parseFloat(calculateChange(currentData.customers, previousData.customers)) > 0 ? 'up' : 'down',
    },
    {
      label: 'Avg Order Value',
      value: `$${currentData.avgOrderValue.toFixed(2)}`,
      change: calculateChange(currentData.avgOrderValue, previousData.avgOrderValue),
      trend: parseFloat(calculateChange(currentData.avgOrderValue, previousData.avgOrderValue)) > 0 ? 'up' : 'down',
    },
  ];

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting report as ${format}`);
    // Simulate export with loading state
    const fileName = `${reportType}-report-${new Date().toISOString().split('T')[0]}.${format}`;
    
    // In production, this would call an API endpoint
    setTimeout(() => {
      alert(`Report exported successfully as ${fileName}`);
    }, 500);
  };

  const handleGenerateCustomReport = async (reportName: string) => {
    setGeneratingReport(reportName);
    
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setGeneratingReport(null);
    setSelectedCustomReport(reportName);
    setShowReportModal(true);
  };

  const handleDownloadReport = (format: 'pdf' | 'excel' | 'csv') => {
    if (!selectedCustomReport) return;
    
    const fileName = `${selectedCustomReport.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.${format}`;
    
    // In production, this would generate and download the actual file
    console.log(`Downloading ${fileName}`);
    alert(`Report downloaded successfully as ${fileName}`);
    
    setShowReportModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and data analysis</p>
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
              className="bg-gray-900 text-white hover:bg-gray-700 gap-2"
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
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'sales', label: 'Sales & Revenue', icon: DollarSign },
              { id: 'orders', label: 'Orders', icon: ShoppingCart },
              { id: 'settlement', label: 'Settlement', icon: FileText },
              { id: 'financial', label: 'Financial', icon: BarChart3 },
              { id: 'vendors', label: 'Vendors', icon: Store },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'customers', label: 'Customers', icon: Users },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((metric, index) => {
          const icons = [DollarSign, ShoppingCart, Store, Users, TrendingUp];
          const colors = ['text-green-600', 'text-blue-600', 'text-purple-600', 'text-orange-600', 'text-indigo-600'];
          const bgColors = ['bg-green-50', 'bg-blue-50', 'bg-purple-50', 'bg-orange-50', 'bg-indigo-50'];
          const Icon = icons[index];

          return (
            <Card key={metric.label} className={bgColors[index]}>
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
                  <div className={`p-3 rounded-lg ${bgColors[index]}`}>
                    <Icon className={`w-6 h-6 ${colors[index]}`} />
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
          {/* Revenue Trend Chart */}
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
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number | undefined) => value ? `$${value.toLocaleString()}` : ''}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      name="Revenue"
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
                  <RechartsPie>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number | undefined) => value ? `${value} orders` : ''} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600" />
                Category Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Growth</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryData.map((category, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-gray-900">{category.name}</TableCell>
                      <TableCell className="text-gray-600">${category.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-gray-600">{category.orders}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 font-medium ${category.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {category.growth >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                          {Math.abs(category.growth)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {category.growth >= 10 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            Excellent
                          </span>
                        ) : category.growth >= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <AlertCircle className="w-3 h-3" />
                            Good
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3" />
                            Declining
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Vendors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-gray-600" />
                Top Performing Vendors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topVendors.map((vendor, index) => (
                  <div key={vendor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 text-white font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{vendor.name}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="w-4 h-4" />
                            {vendor.orders} orders
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {vendor.fulfillmentTime}
                          </span>
                          <span className="flex items-center gap-1">
                            ⭐ {vendor.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">${vendor.revenue.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
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
              <ResponsiveContainer width="100%" height={384}>
                <LineChart data={salesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number | undefined, name: string | undefined) => {
                      if (!value || !name) return ['', ''];
                      if (name === 'sales') return [`$${value.toLocaleString()}`, 'Sales'];
                      return [value, 'Orders'];
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 5 }}
                    name="Sales ($)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 5 }}
                    name="Orders"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Daily Average</p>
                    <p className="text-2xl font-bold text-gray-900">$4,182</p>
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
                    <p className="text-2xl font-bold text-gray-900">3.8%</p>
                    <p className="text-sm text-green-600 mt-1">+0.4% improvement</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Orders Report */}
      {reportType === 'orders' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                    <p className="text-3xl font-bold text-gray-900">{currentData.orders.toLocaleString()}</p>
                  </div>
                  <ShoppingCart className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Delivered</p>
                    <p className="text-3xl font-bold text-gray-900">856</p>
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
                    <p className="text-3xl font-bold text-gray-900">234</p>
                  </div>
                  <Clock className="w-10 h-10 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Cancelled</p>
                    <p className="text-3xl font-bold text-gray-900">43</p>
                  </div>
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: 'ORD-2024-1256', customer: 'John Doe', vendor: 'Heritage Textiles', amount: 125.50, status: 'Delivered', date: '2024-01-15' },
                    { id: 'ORD-2024-1255', customer: 'Jane Smith', vendor: 'Artisan Crafts Co.', amount: 89.99, status: 'Processing', date: '2024-01-14' },
                    { id: 'ORD-2024-1254', customer: 'Bob Johnson', vendor: 'Eco Fabrics Ltd.', amount: 156.75, status: 'Delivered', date: '2024-01-14' },
                    { id: 'ORD-2024-1253', customer: 'Alice Brown', vendor: 'Traditional Weavers', amount: 78.25, status: 'Pending', date: '2024-01-13' },
                    { id: 'ORD-2024-1252', customer: 'Charlie Wilson', vendor: 'Heritage Textiles', amount: 234.00, status: 'Cancelled', date: '2024-01-13' },
                  ].map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-gray-900">{order.id}</TableCell>
                      <TableCell className="text-gray-600">{order.customer}</TableCell>
                      <TableCell className="text-gray-600">{order.vendor}</TableCell>
                      <TableCell className="text-gray-900 font-semibold">${order.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status === 'Delivered' && <CheckCircle className="w-3 h-3" />}
                          {order.status === 'Processing' && <Clock className="w-3 h-3" />}
                          {order.status === 'Pending' && <AlertCircle className="w-3 h-3" />}
                          {order.status === 'Cancelled' && <XCircle className="w-3 h-3" />}
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">{order.date}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="orders" fill="#3b82f6" name="Orders" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fulfillment Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { metric: 'Avg Fulfillment Time', value: '2.3 days', status: 'good', icon: Clock },
                    { metric: 'On-Time Delivery Rate', value: '94.5%', status: 'excellent', icon: CheckCircle },
                    { metric: 'Return Rate', value: '2.8%', status: 'good', icon: RefreshCw },
                    { metric: 'Customer Satisfaction', value: '4.6/5', status: 'excellent', icon: Users },
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${item.status === 'excellent' ? 'bg-green-100' : 'bg-blue-100'}`}>
                            <Icon className={`w-5 h-5 ${item.status === 'excellent' ? 'text-green-600' : 'text-blue-600'}`} />
                          </div>
                          <span className="font-medium text-gray-700">{item.metric}</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Settlement Report */}
      {reportType === 'settlement' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Settlements</p>
                    <p className="text-3xl font-bold text-gray-900">$98,450</p>
                  </div>
                  <DollarSign className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending Settlements</p>
                    <p className="text-3xl font-bold text-gray-900">$12,340</p>
                  </div>
                  <Clock className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed This Month</p>
                    <p className="text-3xl font-bold text-gray-900">$45,230</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Settlement Time</p>
                    <p className="text-3xl font-bold text-gray-900">5.2 days</p>
                  </div>
                  <Activity className="w-10 h-10 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Settlement Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Settlement ID</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: 'SET-2024-0156', vendor: 'Heritage Textiles', amount: 28450, commission: 2845, net: 25605, status: 'Completed', date: '2024-01-15' },
                    { id: 'SET-2024-0155', vendor: 'Artisan Crafts Co.', amount: 24680, commission: 2468, net: 22212, status: 'Completed', date: '2024-01-14' },
                    { id: 'SET-2024-0154', vendor: 'Eco Fabrics Ltd.', amount: 21230, commission: 2123, net: 19107, status: 'Processing', date: '2024-01-13' },
                    { id: 'SET-2024-0153', vendor: 'Traditional Weavers', amount: 19870, commission: 1987, net: 17883, status: 'Pending', date: '2024-01-12' },
                    { id: 'SET-2024-0152', vendor: 'Heritage Textiles', amount: 15340, commission: 1534, net: 13806, status: 'Completed', date: '2024-01-11' },
                  ].map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell className="font-medium text-gray-900">{settlement.id}</TableCell>
                      <TableCell className="text-gray-600">{settlement.vendor}</TableCell>
                      <TableCell className="text-gray-900 font-semibold">${settlement.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-red-600">-${settlement.commission.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 font-bold">${settlement.net.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          settlement.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          settlement.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {settlement.status === 'Completed' && <CheckCircle className="w-3 h-3" />}
                          {settlement.status === 'Processing' && <Clock className="w-3 h-3" />}
                          {settlement.status === 'Pending' && <AlertCircle className="w-3 h-3" />}
                          {settlement.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">{settlement.date}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Settlement Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="colorSettlement" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number | undefined) => value ? `$${value.toLocaleString()}` : ''}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorSettlement)" 
                      name="Settlement Amount"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Commission Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: 'Platform Commission', amount: 8450, percentage: 68 },
                    { category: 'Payment Gateway Fees', amount: 2340, percentage: 19 },
                    { category: 'Service Charges', amount: 1230, percentage: 10 },
                    { category: 'Other Deductions', amount: 420, percentage: 3 },
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{item.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600">${item.amount.toLocaleString()}</span>
                          <span className="font-semibold text-gray-900">{item.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gray-900"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Financial Report */}
      {reportType === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">${currentData.revenue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Platform Commission</p>
                    <p className="text-3xl font-bold text-gray-900">$12,545</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Operating Expenses</p>
                    <p className="text-3xl font-bold text-gray-900">$8,230</p>
                  </div>
                  <FileText className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Net Profit</p>
                    <p className="text-3xl font-bold text-gray-900">$4,315</p>
                  </div>
                  <BarChart3 className="w-10 h-10 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number | undefined) => value ? `$${value.toLocaleString()}` : ''}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit Margin Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={revenueChartData.map(item => ({
                    ...item,
                    profit: item.revenue - item.expenses,
                    margin: ((item.revenue - item.expenses) / item.revenue * 100).toFixed(1)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number | undefined, name: string | undefined) => {
                        if (!value || !name) return ['', ''];
                        if (name === 'profit') return [`$${value.toLocaleString()}`, 'Profit'];
                        return [`${value}%`, 'Margin'];
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 5 }}
                      name="Profit ($)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="margin" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      dot={{ fill: '#f59e0b', r: 5 }}
                      name="Margin (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Financial Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { category: 'Product Sales', amount: 98450, percentage: 78.5, change: 12.3, status: 'up' },
                    { category: 'Platform Commission', amount: 12545, percentage: 10.0, change: 8.7, status: 'up' },
                    { category: 'Shipping Revenue', amount: 8230, percentage: 6.6, change: 5.2, status: 'up' },
                    { category: 'Other Income', amount: 6225, percentage: 4.9, change: -2.1, status: 'down' },
                  ].map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-gray-900">{item.category}</TableCell>
                      <TableCell className="text-gray-900 font-semibold">${item.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-gray-600">{item.percentage}%</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 font-medium ${item.status === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                          {item.status === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                          {Math.abs(item.change)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.status === 'up' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <TrendingUp className="w-3 h-3" />
                            Growing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <ArrowDown className="w-3 h-3" />
                            Declining
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cash Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Inflow</span>
                    <span className="text-lg font-bold text-green-600">+$125,450</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Outflow</span>
                    <span className="text-lg font-bold text-red-600">-$98,230</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Net Cash Flow</span>
                      <span className="text-xl font-bold text-gray-900">$27,220</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { method: 'Razorpay', amount: 78450, percentage: 62.5 },
                    { method: 'PayU', amount: 34230, percentage: 27.3 },
                    { method: 'COD', amount: 12770, percentage: 10.2 },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.method}</span>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">${item.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{item.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tax Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">GST Collected</span>
                    <span className="text-sm font-semibold text-gray-900">$15,054</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">TDS Deducted</span>
                    <span className="text-sm font-semibold text-gray-900">$2,509</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Net Tax</span>
                      <span className="text-lg font-bold text-gray-900">$12,545</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Vendors Report */}
      {reportType === 'vendors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Vendors</p>
                    <p className="text-3xl font-bold text-gray-900">{currentData.vendors}</p>
                  </div>
                  <Store className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Vendors</p>
                    <p className="text-3xl font-bold text-gray-900">76</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending Approval</p>
                    <p className="text-3xl font-bold text-gray-900">8</p>
                  </div>
                  <AlertCircle className="w-10 h-10 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Rating</p>
                    <p className="text-3xl font-bold text-gray-900">4.7</p>
                  </div>
                  <span className="text-4xl">⭐</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Fulfillment</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium text-gray-900">{vendor.name}</TableCell>
                      <TableCell className="text-gray-600">${vendor.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-gray-600">{vendor.orders}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-gray-900">
                          ⭐ {vendor.rating}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">{vendor.fulfillmentTime}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                    <p className="text-3xl font-bold text-gray-900">{currentData.products}</p>
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
                    <p className="text-3xl font-bold text-gray-900">398</p>
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
                    <p className="text-3xl font-bold text-gray-900">34</p>
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
                    <p className="text-3xl font-bold text-gray-900">24</p>
                  </div>
                  <AlertCircle className="w-10 h-10 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Premium Cotton Kitchen Towel Set', sales: 234, revenue: 5850, stock: 145, trend: 12 },
                  { name: 'Handwoven Bath Towel Collection', sales: 198, revenue: 4950, stock: 89, trend: 8 },
                  { name: 'Artisan Linen Apron', sales: 167, revenue: 4175, stock: 234, trend: 15 },
                  { name: 'Heritage Table Runner', sales: 145, revenue: 3625, stock: 67, trend: -3 },
                  { name: 'Organic Tea Towel Set', sales: 132, revenue: 3300, stock: 178, trend: 5 },
                ].map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{product.sales} sales</span>
                        <span>Stock: {product.stock}</span>
                        <span className={`flex items-center gap-1 font-medium ${product.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {Math.abs(product.trend)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">${product.revenue.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customers Report */}
      {reportType === 'customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Customers</p>
                    <p className="text-3xl font-bold text-gray-900">{currentData.customers.toLocaleString()}</p>
                  </div>
                  <Users className="w-10 h-10 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">New This Month</p>
                    <p className="text-3xl font-bold text-gray-900">184</p>
                  </div>
                  <ArrowUp className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Repeat Customers</p>
                    <p className="text-3xl font-bold text-gray-900">1,456</p>
                  </div>
                  <RefreshCw className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Lifetime Value</p>
                    <p className="text-3xl font-bold text-gray-900">$487</p>
                  </div>
                  <DollarSign className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#6366f1" 
                    fillOpacity={1} 
                    fill="url(#colorCustomers)" 
                    name="Customer Orders"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historical Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Historical Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Vendors</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Avg Order Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockReportData.map((data, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium text-gray-900">{data.period}</TableCell>
                  <TableCell className="text-gray-600">${data.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-600">{data.orders.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-600">{data.vendors}</TableCell>
                  <TableCell className="text-gray-600">{data.customers.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-600">${data.avgOrderValue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Custom Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Sales Report', description: 'Detailed sales analysis', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
              { name: 'Order Report', description: 'Order tracking and analytics', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
              { name: 'Settlement Report', description: 'Settlement transactions', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
              { name: 'Vendor Report', description: 'Vendor performance metrics', icon: Store, color: 'text-orange-600', bg: 'bg-orange-50' },
              { name: 'Product Report', description: 'Product analytics', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { name: 'Financial Report', description: 'Revenue and expenses', icon: BarChart3, color: 'text-teal-600', bg: 'bg-teal-50' },
              { name: 'Customer Report', description: 'Customer insights', icon: Users, color: 'text-pink-600', bg: 'bg-pink-50' },
              { name: 'Tax Report', description: 'GST and tax summary', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
            ].map((report, index) => {
              const Icon = report.icon;
              const isGenerating = generatingReport === report.name;
              return (
                <Card key={index} className={`cursor-pointer hover:shadow-lg transition-shadow ${report.bg}`}>
                  <CardContent className="p-6 text-center">
                    <Icon className={`w-12 h-12 ${report.color} mx-auto mb-3`} />
                    <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2"
                      onClick={() => handleGenerateCustomReport(report.name)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Generate
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Report Preview Modal */}
      {showReportModal && selectedCustomReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedCustomReport}</h2>
                <p className="text-sm text-gray-600 mt-1">Generated on {new Date().toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* Report Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Period</p>
                    <p className="text-lg font-bold text-gray-900">{selectedPeriod}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Records</p>
                    <p className="text-lg font-bold text-gray-900">1,256</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Value</p>
                    <p className="text-lg font-bold text-gray-900">$125,450</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3" />
                      Ready
                    </span>
                  </div>
                </div>

                {/* Report Preview */}
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Report Preview</h3>
                  </div>
                  <div className="bg-white p-6 rounded-lg border border-gray-200 min-h-75">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                        <div>
                          <h4 className="text-xl font-bold text-gray-900">{selectedCustomReport}</h4>
                          <p className="text-sm text-gray-600 mt-1">M2C Marketplace - Admin Dashboard</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Report Date</p>
                          <p className="font-semibold text-gray-900">{new Date().toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-700">Report Period:</span>
                          <span className="font-semibold text-gray-900">{selectedPeriod}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-700">Total Transactions:</span>
                          <span className="font-semibold text-gray-900">1,256</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-700">Total Amount:</span>
                          <span className="font-semibold text-gray-900">$125,450.00</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-700">Average Value:</span>
                          <span className="font-semibold text-gray-900">$99.88</span>
                        </div>
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> This is a preview of the report. Download the full report in your preferred format to view complete details and analytics.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Report Includes</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Detailed transaction records
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Performance metrics and KPIs
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Trend analysis and charts
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Summary and insights
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Export Options</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-red-600" />
                        PDF - Best for viewing and printing
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        Excel - Best for data analysis
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        CSV - Best for data import
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-600">Report is ready to download</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReportModal(false)}
                >
                  Close
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  onClick={() => handleDownloadReport('pdf')}
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={() => handleDownloadReport('excel')}
                >
                  <Download className="w-4 h-4" />
                  Download Excel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  onClick={() => handleDownloadReport('csv')}
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
