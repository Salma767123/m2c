'use client';

import { Package, DollarSign, TrendingUp, Users } from 'lucide-react';
import StatsGrid from './components/StatsGrid';
import AnalyticsOverview from './components/AnalyticsOverview';
import TopProducts from './components/TopProducts';
import PerformanceOverview from './components/PerformanceOverview';

export default function Dashboard() {
  const stats = [
    {
      title: 'Total Products',
      value: '45',
      change: '+12%',
      icon: Package,
    },
    {
      title: 'Revenue',
      value: '$45,230',
      change: '+18%',
      icon: DollarSign,
    },
    {
      title: 'Growth Rate',
      value: '12.5%',
      change: '+2.1%',
      icon: TrendingUp,
    }
  ];

  const analytics = {
    revenue: { current: 12450, change: 22.1 },
    customers: { current: 89, change: 17.1 },
  };

  const topProducts = [
    { name: 'Handwoven Cotton Towel Set', sales: 45, rating: 4.8, revenue: 584.55 },
    { name: 'Organic Bath Towel Set', sales: 32, rating: 4.9, revenue: 799.68 },
    { name: 'Heritage Tea Towel Collection', sales: 28, rating: 4.7, revenue: 531.72 },
  ];

  const performance = {
    rating: '4.8',
    satisfaction: '92%',
    fulfillmentTime: '2.3 days',
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

      {/* Top Products */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <TopProducts products={topProducts} />
      </div>

      {/* Performance Overview */}
      <PerformanceOverview performance={performance} />
    </div>
  );
}