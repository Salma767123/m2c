'use client';

import { Package, DollarSign, TrendingUp, ShoppingCart } from 'lucide-react';
import StatsGrid from './components/StatsGrid';
import AnalyticsOverview from './components/AnalyticsOverview';
import RecentProducts from './components/RecentProducts';
import RecentOrders from './components/RecentOrders';

export default function Dashboard() {
  const stats = [
    {
      title: 'Total Products',
      value: '45',
      change: '+12%',
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      iconBg: 'bg-purple-100',
    },
    {
      title: 'Revenue',
      value: '₹45,230',
      change: '+18%',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      iconBg: 'bg-green-100',
    },
    {
      title: 'Total Orders',
      value: '156',
      change: '+8%',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'Growth Rate',
      value: '12.5%',
      change: '+2.1%',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
      iconBg: 'bg-orange-100',
    }
  ];

  const analytics = {
    revenue: { current: 12450, change: 22.1 },
    orders: { current: 156, change: 17.1 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#222222] mb-2">Vendor Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here's what's happening with your store.</p>
      </div>

      {/* Overview Stats Grid */}
      <StatsGrid stats={stats} />

      {/* Analytics Section */}
      <AnalyticsOverview analytics={analytics} />

      {/* Recent Products & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <RecentProducts />
        <RecentOrders />
      </div>
    </div>
  );
}