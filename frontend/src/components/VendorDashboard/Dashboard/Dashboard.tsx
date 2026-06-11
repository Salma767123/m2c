'use client';

import { Package, DollarSign, Star, ShoppingCart } from 'lucide-react';
import StatsGrid from './components/StatsGrid';
import AnalyticsOverview from './components/AnalyticsOverview';
import RecentProducts from './components/RecentProducts';
import RecentOrders from './components/RecentOrders';
import { useState, useEffect } from 'react';
import VendorDashboardService, { VendorDashboardStats } from '@/services/vendorDashboardService';
import { orderService } from '@/services/orderService';

type RatingSummary = { rating: number | null; ratingCount: number };

export default function Dashboard() {
  const [data, setData] = useState<VendorDashboardStats | null>(null);
  const [rating, setRating] = useState<RatingSummary | null>(null);
  const [ratingError, setRatingError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [stats, reviews] = await Promise.all([
          VendorDashboardService.getDashboardStats(),
          orderService.getVendorReviews().catch(() => {
            setRatingError(true);
            return null;
          }),
        ]);
        setData(stats);
        if (reviews?.success) {
          setRating({
            rating: reviews.data.overall.rating,
            ratingCount: reviews.data.overall.ratingCount,
          });
        }
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
      color: 'text-brand-500',
      bgColor: 'bg-white border-slate-200/80',
      iconBg: 'bg-brand-50',
      href: '/vendor/dashboard/products',
    },
    {
      title: 'Revenue',
      value: `₹${data.stats.totalRevenue.toLocaleString()}`,
      change: '0%',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-white border-slate-200/80',
      iconBg: 'bg-emerald-50',
      href: '/vendor/dashboard/earnings/payouts',
    },
    {
      title: 'Total Orders',
      value: data.stats.totalOrders.toString(),
      change: '0%',
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-white border-slate-200/80',
      iconBg: 'bg-blue-50',
      href: '/vendor/dashboard/orders',
    },
    {
      title: 'Admin Rating',
      value:
        ratingError
          ? '—'
          : rating !== null && rating.rating !== null && rating.ratingCount > 0
            ? `★ ${rating.rating.toFixed(1)}`
            : 'No reviews',
      change:
        ratingError
          ? 'Unable to load'
          : rating !== null && rating.ratingCount > 0
            ? `${rating.ratingCount} review${rating.ratingCount === 1 ? '' : 's'}`
            : 'Ship your first order',
      icon: Star,
      color: 'text-amber-500',
      bgColor: 'bg-white border-slate-200/80',
      iconBg: 'bg-amber-50',
      href: '/vendor/dashboard/reviews',
    }
  ];



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Vendor Dashboard</h1>
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