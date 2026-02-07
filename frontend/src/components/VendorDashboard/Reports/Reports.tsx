'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, Users, FileText } from 'lucide-react';

interface ReportData {
  period: string;
  revenue: number;
  customers: number;
  orders: number;
  avgOrderValue: number;
}

const mockReportData: ReportData[] = [
  { period: 'Jan 2024', revenue: 12450, customers: 89, orders: 156, avgOrderValue: 79.81 },
  { period: 'Dec 2023', revenue: 10200, customers: 76, orders: 142, avgOrderValue: 71.83 },
  { period: 'Nov 2023', revenue: 9800, customers: 72, orders: 134, avgOrderValue: 73.13 },
  { period: 'Oct 2023', revenue: 11200, customers: 81, orders: 148, avgOrderValue: 75.68 }
];

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');
  const [reportType, setReportType] = useState('Sales');

  const currentData = mockReportData[0];
  const previousData = mockReportData[1];

  const calculateChange = (current: number, previous: number) => {
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate detailed reports and insights</p>
        </div>
        <div className="flex gap-3">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 3 Months">Last 3 Months</option>
            <option value="Last Year">Last Year</option>
          </select>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            {['Sales', 'Inventory', 'Customers', 'Financial'].map((type) => (
              <Button
                key={type}
                variant={reportType === type ? 'default' : 'outline'}
                onClick={() => setReportType(type)}
              >
                {type}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${currentData.revenue.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">
                  +{calculateChange(currentData.revenue, previousData.revenue)}% vs last period
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Customers</p>
                <p className="text-2xl font-bold text-gray-900">{currentData.customers}</p>
                <p className="text-sm text-green-600 mt-1">
                  +{calculateChange(currentData.customers, previousData.customers)}% vs last period
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">${currentData.avgOrderValue.toFixed(2)}</p>
                <p className="text-sm text-green-600 mt-1">
                  +{calculateChange(currentData.avgOrderValue, previousData.avgOrderValue)}% vs last period
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Revenue chart visualization</p>
                <p className="text-sm text-gray-400">Chart component integration needed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Cotton Kitchen Towel', revenue: 2250, orders: 45 },
                { name: 'Handwoven Bath Towel', revenue: 1998, orders: 32 },
                { name: 'Artisan Apron', revenue: 1596, orders: 28 },
                { name: 'Linen Table Runner', revenue: 1344, orders: 24 }
              ].map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.orders} orders</p>
                  </div>
                  <p className="font-medium text-gray-900">${product.revenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Custom Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Sales Report', description: 'Detailed sales analysis', icon: DollarSign },
              { name: 'Inventory Report', description: 'Stock levels and movements', icon: BarChart3 },
              { name: 'Customer Report', description: 'Customer behavior insights', icon: Users },
              { name: 'Financial Report', description: 'Revenue and expense breakdown', icon: FileText }
            ].map((report, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <report.icon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900 mb-1">{report.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Generate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Historical Data */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Period</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Revenue</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Orders</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Customers</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {mockReportData.map((data, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{data.period}</td>
                    <td className="py-3 px-4 text-gray-600">${data.revenue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-600">{data.orders}</td>
                    <td className="py-3 px-4 text-gray-600">{data.customers}</td>
                    <td className="py-3 px-4 text-gray-600">${data.avgOrderValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}