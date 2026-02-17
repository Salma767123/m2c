'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { DollarSign, ShoppingCart } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface AnalyticsData {
  revenue: { current: number; change: number };
  orders: { current: number; change: number };
}

interface AnalyticsOverviewProps {
  analytics: AnalyticsData;
}

const revenueData = [
  { month: 'Jan', revenue: 8500, orders: 98 },
  { month: 'Feb', revenue: 9200, orders: 112 },
  { month: 'Mar', revenue: 10100, orders: 128 },
  { month: 'Apr', revenue: 11300, orders: 145 },
  { month: 'May', revenue: 12450, orders: 156 },
];

export default function AnalyticsOverview({ analytics }: AnalyticsOverviewProps) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[#222222] mb-4 sm:mb-6">Analytics Overview</h2>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue Trend Chart */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: any) => {
                    if (value === undefined) return ['₹0', 'Revenue'];
                    return [`₹${value.toLocaleString()}`, 'Revenue'];
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders Trend Chart */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              Orders Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
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
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
