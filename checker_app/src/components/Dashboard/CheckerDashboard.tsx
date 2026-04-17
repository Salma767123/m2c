import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Factory,
  Package,
  ArrowRight,
  BarChart3,
  Calendar,
  RefreshCw,
  Inbox,
} from 'lucide-react-native';
import StatCard from './StatCard';
import qcCheckerService from '../../services/qcCheckerService';
import { router } from 'expo-router';

type StatusKey =
  | 'APPROVED'
  | 'QC_APPROVED'
  | 'REJECTED'
  | 'REINSPECTION'
  | 'PENDING'
  | 'UNDER_REVIEW';

const getStatusBadgeStyle = (status: string) => {
  const map: Record<StatusKey, { bg: string; text: string; border: string }> = {
    APPROVED: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    },
    QC_APPROVED: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    },
    REJECTED: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
    },
    REINSPECTION: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-200',
    },
    PENDING: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    UNDER_REVIEW: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200',
    },
  };
  return map[(status as StatusKey)] || map.PENDING;
};

const formattedDate = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export function CheckerDashboard({ checkerId }: { checkerId: string | null }) {
  const [assignedProducts, setAssignedProducts] = useState<any[]>([]);
  const [assignedVendors, setAssignedVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [productsRes, vendorsRes] = await Promise.all([
        qcCheckerService.getAssignedProducts(),
        qcCheckerService.getAssignedVendors(),
      ]);
      if (productsRes.success) {
        const raw: any = productsRes.data;
        const list = Array.isArray(raw) ? raw : (raw?.products || raw?.items || []);
        setAssignedProducts(list);
      }
      if (vendorsRes.success) {
        // Service now returns { data: { vendors, pagination } } for the list page,
        // but some callers (dashboard) just want the array. Handle both shapes.
        const raw: any = vendorsRes.data;
        const list = Array.isArray(raw) ? raw : (raw?.vendors || []);
        setAssignedVendors(list);
      }
    } catch (err: any) {
      console.error('Dashboard fetch failed:', err);
      setError(err?.message || 'Could not fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const pendingCount =
    assignedProducts.filter(
      (p) =>
        p.approvalStatus === 'PENDING' ||
        p.approvalStatus === 'REINSPECTION' ||
        p.approvalStatus === 'UNDER_REVIEW',
    ).length +
    assignedVendors.filter(
      (v) => v.status === 'UNDER_REVIEW' || v.status === 'PENDING',
    ).length;

  const passedCount = assignedProducts.filter(
    (p) =>
      p.approvalStatus === 'QC_APPROVED' || p.approvalStatus === 'APPROVED',
  ).length;

  const failedCount = assignedProducts.filter(
    (p) => p.approvalStatus === 'REJECTED',
  ).length;

  const totalAssignments = assignedProducts.length + assignedVendors.length;

  const stats = [
    {
      label: 'Total Assignments',
      value: totalAssignments.toString(),
      icon: TrendingUp,
      trend: 'Products and Vendors',
      color: 'blue' as const,
    },
    {
      label: 'Pending Action',
      value: pendingCount.toString(),
      icon: Clock,
      trend: 'Awaiting inspection',
      color: 'amber' as const,
    },
    {
      label: 'QC Approved',
      value: passedCount.toString(),
      icon: CheckCircle2,
      trend: 'Passed inspection',
      color: 'emerald' as const,
    },
    {
      label: 'Rejected',
      value: failedCount.toString(),
      icon: AlertCircle,
      trend: 'Failed quality check',
      color: 'red' as const,
    },
  ];

  if (loading) {
    return <DashboardSkeleton checkerId={checkerId} />;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-5">
          <AlertCircle size={36} color="#dc2626" strokeWidth={1.75} />
        </View>
        <Text className="text-xl font-bold text-slate-900 mb-2 text-center">
          Something went wrong
        </Text>
        <Text className="text-base text-slate-600 text-center mb-6">
          {error}
        </Text>
        <TouchableOpacity
          onPress={fetchDashboardData}
          accessibilityLabel="Retry loading dashboard"
          accessibilityRole="button"
          activeOpacity={0.85}
          className="flex-row items-center bg-blue-600 rounded-xl px-6 py-3"
        >
          <RefreshCw size={18} color="#ffffff" strokeWidth={2.25} />
          <Text className="text-white font-bold text-base ml-2">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2563eb"
          colors={['#2563eb']}
        />
      }
    >
      {/* Header */}
      <View className="mb-6">
        <Text className="text-3xl font-extrabold text-slate-900 mb-1">
          Dashboard
        </Text>
        <Text className="text-slate-600 text-sm mb-3">
          Welcome back,{' '}
          <Text className="font-bold text-blue-600">{checkerId}</Text>
        </Text>
        <View className="flex-row items-center">
          <Calendar size={14} color="#64748b" />
          <Text className="text-xs font-medium text-slate-500 ml-1.5">
            {formattedDate()}
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap justify-between mb-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </View>

      {/* Recent Assignments */}
      <View className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <View className="px-5 py-4 border-b border-slate-200 bg-blue-50/50 flex-row justify-between items-center">
          <View className="flex-row items-center flex-1 pr-2">
            <View className="p-2 bg-blue-100 rounded-lg mr-3">
              <CalendarDays size={18} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900">
                Recent Assignments
              </Text>
              <Text className="text-xs text-slate-600">
                Products and Vendors awaiting action
              </Text>
            </View>
          </View>
          <View className="bg-blue-100 px-2.5 py-1 rounded-full">
            <Text className="text-xs font-bold text-blue-800">
              {totalAssignments} total
            </Text>
          </View>
        </View>

        <View className="p-4">
          {totalAssignments === 0 ? (
            <View className="items-center py-10">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Inbox size={28} color="#64748b" strokeWidth={1.75} />
              </View>
              <Text className="text-base font-bold text-slate-900 mb-1">
                No active assignments
              </Text>
              <Text className="text-xs text-slate-500 text-center">
                New assignments will appear here when available.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ rowGap: 12, paddingBottom: 4 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {assignedProducts.map((product) => {
                const badge = getStatusBadgeStyle(product.approvalStatus);
                return (
                  <View
                    key={`p-${product.id}`}
                    className="border border-slate-200 rounded-xl p-4 bg-white"
                  >
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-row items-start flex-1 pr-2">
                        <View className="p-2 bg-blue-50 rounded-lg mr-3">
                          <Package size={16} color="#2563eb" />
                        </View>
                        <View className="flex-1">
                          <Text
                            className="font-semibold text-slate-900 text-sm mb-0.5"
                            numberOfLines={1}
                          >
                            {product.name}
                          </Text>
                          <Text
                            className="text-xs text-slate-600 mb-2"
                            numberOfLines={1}
                          >
                            SKU: {product.baseSku}
                          </Text>
                          <View
                            className={`self-start px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.border}`}
                          >
                            <Text
                              className={`text-[10px] font-bold ${badge.text}`}
                            >
                              {product.approvalStatus}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {product.vendor?.companyName ? (
                        <Text
                          className="text-[11px] font-medium text-slate-500 max-w-[110px] text-right"
                          numberOfLines={2}
                        >
                          {product.vendor.companyName}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push('/products' as any)}
                      accessibilityLabel={`Go to products for ${product.name}`}
                      accessibilityRole="button"
                      activeOpacity={0.85}
                      className="flex-row items-center justify-center bg-blue-600 rounded-lg py-2.5"
                    >
                      <Text className="text-white font-semibold text-sm mr-1.5">
                        Go to Products
                      </Text>
                      <ArrowRight size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {assignedVendors.map((vendor) => {
                const badge = getStatusBadgeStyle(vendor.status);
                return (
                  <View
                    key={`v-${vendor.id}`}
                    className="border border-slate-200 rounded-xl p-4 bg-white"
                  >
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-row items-start flex-1">
                        <View className="p-2 bg-emerald-50 rounded-lg mr-3">
                          <Factory size={16} color="#059669" />
                        </View>
                        <View className="flex-1">
                          <Text
                            className="font-semibold text-slate-900 text-sm mb-0.5"
                            numberOfLines={1}
                          >
                            {vendor.companyName}
                          </Text>
                          <Text className="text-xs text-slate-600 mb-2">
                            Factory Onboarding
                          </Text>
                          <View
                            className={`self-start px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.border}`}
                          >
                            <Text
                              className={`text-[10px] font-bold ${badge.text}`}
                            >
                              {vendor.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push('/vendors' as any)}
                      accessibilityLabel={`Go to vendors for ${vendor.companyName}`}
                      accessibilityRole="button"
                      activeOpacity={0.85}
                      className="flex-row items-center justify-center bg-emerald-600 rounded-lg py-2.5"
                    >
                      <Text className="text-white font-semibold text-sm mr-1.5">
                        Go to Vendors
                      </Text>
                      <ArrowRight size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Summary Statistics */}
      <View className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <View className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex-row items-center">
          <View className="p-2 bg-emerald-100 rounded-lg mr-3">
            <BarChart3 size={18} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">
              Summary Statistics
            </Text>
            <Text className="text-xs text-slate-600">
              Current inspection overview
            </Text>
          </View>
        </View>
        <View className="py-10 px-6 items-center">
          <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4">
            <BarChart3 size={36} color="#2563eb" strokeWidth={1.75} />
          </View>
          <Text className="text-base font-bold text-slate-900 mb-1">
            Live Updates
          </Text>
          <Text className="text-sm text-slate-600 text-center max-w-xs">
            Your dashboard reflects real-time assignments from the
            administrators.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonBlock({
  width,
  height,
  rounded = 'md',
  className = '',
}: {
  width: number | string;
  height: number;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}) {
  const radius = { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 }[rounded];
  return (
    <View
      className={`bg-slate-200 ${className}`}
      style={{ width: width as any, height, borderRadius: radius }}
    />
  );
}

function SkeletonStatCard() {
  return (
    <View
      className="bg-white border border-slate-200 rounded-2xl p-4"
      style={{ width: '48%', marginBottom: 12 }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <SkeletonBlock width={36} height={36} rounded="xl" />
        <SkeletonBlock width={36} height={14} rounded="md" />
      </View>
      <SkeletonBlock width="70%" height={24} rounded="md" className="mb-2" />
      <SkeletonBlock width="50%" height={10} rounded="md" />
    </View>
  );
}

function SkeletonAssignmentCard() {
  return (
    <View className="border border-slate-200 rounded-xl p-4 mb-3">
      <View className="flex-row items-start mb-3">
        <SkeletonBlock width={36} height={36} rounded="lg" className="mr-3" />
        <View className="flex-1">
          <SkeletonBlock width="75%" height={14} rounded="md" className="mb-2" />
          <SkeletonBlock width="40%" height={10} rounded="md" className="mb-2" />
          <SkeletonBlock width={72} height={18} rounded="full" />
        </View>
      </View>
      <SkeletonBlock width="100%" height={36} rounded="lg" />
    </View>
  );
}

function DashboardSkeleton({ checkerId }: { checkerId: string | null }) {
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header: real greeting + placeholder date */}
      <View className="mb-6">
        <Text className="text-3xl font-extrabold text-slate-900 mb-1">Dashboard</Text>
        <Text className="text-slate-600 text-sm mb-3">
          Welcome back,{' '}
          <Text className="font-bold text-blue-600">{checkerId || '...'}</Text>
        </Text>
        <SkeletonBlock width={220} height={14} rounded="md" />
      </View>

      {/* Stats grid */}
      <View className="flex-row flex-wrap justify-between mb-6">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </View>

      {/* Recent Assignments card */}
      <View className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <View className="px-5 py-4 border-b border-slate-200 flex-row items-center justify-between bg-blue-50/50">
          <View className="flex-row items-center flex-1">
            <SkeletonBlock width={36} height={36} rounded="lg" className="mr-3" />
            <View className="flex-1">
              <SkeletonBlock width={160} height={16} rounded="md" className="mb-2" />
              <SkeletonBlock width={220} height={10} rounded="md" />
            </View>
          </View>
          <SkeletonBlock width={64} height={22} rounded="full" />
        </View>
        <View className="p-4">
          <SkeletonAssignmentCard />
          <SkeletonAssignmentCard />
          <SkeletonAssignmentCard />
        </View>
      </View>

      {/* Summary statistics card */}
      <View className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <View className="px-5 py-4 border-b border-slate-200 flex-row items-center bg-slate-50">
          <SkeletonBlock width={36} height={36} rounded="lg" className="mr-3" />
          <View className="flex-1">
            <SkeletonBlock width={160} height={16} rounded="md" className="mb-2" />
            <SkeletonBlock width={200} height={10} rounded="md" />
          </View>
        </View>
        <View className="py-10 px-6 items-center">
          <SkeletonBlock width={80} height={80} rounded="full" className="mb-4" />
          <SkeletonBlock width={120} height={14} rounded="md" className="mb-2" />
          <SkeletonBlock width={200} height={10} rounded="md" />
        </View>
      </View>
    </ScrollView>
  );
}
