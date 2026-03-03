'use client';

import { Package, DollarSign, TrendingUp, ShoppingCart } from 'lucide-react';
import StatsGrid from './components/StatsGrid';
import AnalyticsOverview from './components/AnalyticsOverview';
import RecentProducts from './components/RecentProducts';
import RecentOrders from './components/RecentOrders';
import { useState, useEffect } from 'react';
import VendorDashboardService, { VendorDashboardStats } from '@/services/vendorDashboardService';

export default function Dashboard() {
  const [data, setData] = useState<VendorDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const stats = await VendorDashboardService.getDashboardStats();
        setData(stats);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen border-t">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="p-6 text-red-500">Failed to load dashboard data.</div>;
  }
  const stats = [
    {
      title: 'Total Products',
      value: data.stats.totalProducts.toString(),
      change: '0%',
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      iconBg: 'bg-purple-100',
    },
    {
      title: 'Revenue',
      value: `₹${data.stats.totalRevenue.toLocaleString()}`,
      change: '0%',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      iconBg: 'bg-green-100',
    },
    {
      title: 'Total Orders',
      value: data.stats.totalOrders.toString(),
      change: '0%',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'Growth Rate',
      value: '0%',
      change: '0%',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
      iconBg: 'bg-orange-100',
    }
  ];



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
      <AnalyticsOverview analytics={data.analytics} earningsData={data.earningsData} />

      {/* Recent Products & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <RecentProducts products={data.recentProducts} />
        <RecentOrders orders={data.recentOrders} />
      </div>
    </div>
  );
}