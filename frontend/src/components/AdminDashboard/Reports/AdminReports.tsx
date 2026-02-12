'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
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
  Filter,
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
import { Breadcrumb } from '../Breadcrumb/Breadcrumb';

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

export default function AdminReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');
  const [reportType, setReportType] = useState<'overview' | 'sales' | 'vendors' | 'products' | 'customers'>('overview');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

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
    // Implementation for export functionality
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and data analysis</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="Today">Today</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 3 Months">Last 3 Months</option>
            <option value="Last 6 Months">Last 6 Months</option>
            <option value="Last Year">Last Year</option>
            <option value="Custom">Custom Range</option>
          </select>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <div className="relative">
            <Button className="bg-gray-900 hover:bg-gray-700 gap-2">
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
              { id: 'vendors', label: 'Vendors', icon: Store },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'customers', label: 'Customers', icon: Users },
            ].map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.id}
                  variant={reportType === type.id ? 'default' : 'outline'}
                  onClick={() => setReportType(type.id as any)}
                  className="gap-2"
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
                <div className="h-80 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Revenue Chart</p>
                    <p className="text-sm text-gray-500 mt-1">Chart visualization will be displayed here</p>
                  </div>
                </div>
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
                <div className="space-y-4">
                  {[
                    { status: 'Delivered', count: 856, percentage: 68, color: 'bg-green-500' },
                    { status: 'Processing', count: 234, percentage: 19, color: 'bg-blue-500' },
                    { status: 'Pending', count: 123, percentage: 10, color: 'bg-yellow-500' },
                    { status: 'Cancelled', count: 43, percentage: 3, color: 'bg-red-500' },
                  ].map((item) => (
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Revenue</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Orders</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Growth</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((category, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{category.name}</td>
                        <td className="py-3 px-4 text-gray-600">${category.revenue.toLocaleString()}</td>
                        <td className="py-3 px-4 text-gray-600">{category.orders}</td>
                        <td className="py-3 px-4">
                          <span className={`flex items-center gap-1 font-medium ${category.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {category.growth >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                            {Math.abs(category.growth)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className="h-96 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Vendor</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Revenue</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Orders</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Rating</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Fulfillment</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVendors.map((vendor) => (
                      <tr key={vendor.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{vendor.name}</td>
                        <td className="py-3 px-4 text-gray-600">${vendor.revenue.toLocaleString()}</td>
                        <td className="py-3 px-4 text-gray-600">{vendor.orders}</td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1 text-gray-900">
                            ⭐ {vendor.rating}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{vendor.fulfillmentTime}</td>
                        <td className="py-3 px-4">
                          <Button variant="outline" size="sm" className="gap-1">
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className="h-80 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <div className="text-center">
                  <Users className="w-20 h-20 text-indigo-400 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-700">Customer Analytics Dashboard</p>
                  <p className="text-gray-500 mt-2">Customer behavior and segmentation data will be displayed here</p>
                </div>
              </div>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Period</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Revenue</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Orders</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Vendors</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Customers</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {mockReportData.map((data, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{data.period}</td>
                    <td className="py-3 px-4 text-gray-600">${data.revenue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-600">{data.orders.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-600">{data.vendors}</td>
                    <td className="py-3 px-4 text-gray-600">{data.customers.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-600">${data.avgOrderValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              { name: 'Vendor Report', description: 'Vendor performance metrics', icon: Store, color: 'text-blue-600', bg: 'bg-blue-50' },
              { name: 'Product Report', description: 'Product analytics', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
              { name: 'Financial Report', description: 'Revenue and expenses', icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map((report, index) => {
              const Icon = report.icon;
              return (
                <Card key={index} className={`cursor-pointer hover:shadow-lg transition-shadow ${report.bg}`}>
                  <CardContent className="p-6 text-center">
                    <Icon className={`w-12 h-12 ${report.color} mx-auto mb-3`} />
                    <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Download className="w-4 h-4" />
                      Generate
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
