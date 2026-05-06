import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
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
  Calendar,
  RefreshCw,
  Inbox,
} from 'lucide-react-native';
import StatCard from './StatCard';
import qcCheckerService from '../../services/qcCheckerService';
import { router } from 'expo-router';

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Approved by Admin',
  QC_APPROVED: 'Approved by QC',
  REJECTED: 'Rejected',
  REINSPECTION: 'Re-Inspection',
  UNDER_ADMIN_REVIEW: 'Under Admin Review',
  SUBMITTED: 'Submitted for Review',
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review by Admin',
  SUSPENDED: 'Suspended',
};

const formatStatus = (status: string) =>
  STATUS_LABELS[status] || status.replace(/_/g, ' ');

const pl = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

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
      // Skip fetch if not authenticated
      const token = await qcCheckerService.getCheckerToken();
      if (!token) return;

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
      // 401 = token expired/invalid — don't show error, axios interceptor handles redirect
      if (err?.status === 401) return;
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

  const pendingProducts = assignedProducts.filter(
    (p) =>
      p.approvalStatus === 'PENDING' ||
      p.approvalStatus === 'REINSPECTION' ||
      p.approvalStatus === 'UNDER_REVIEW',
  ).length;

  const pendingVendors = assignedVendors.filter(
    (v) => v.status === 'UNDER_REVIEW' || v.status === 'PENDING' || v.status === 'REINSPECTION',
  ).length;

  const passedProducts = assignedProducts.filter(
    (p) =>
      p.approvalStatus === 'QC_APPROVED' || p.approvalStatus === 'APPROVED',
  ).length;

  const failedProducts = assignedProducts.filter(
    (p) => p.approvalStatus === 'REJECTED',
  ).length;

  const totalAssignments = assignedProducts.length + assignedVendors.length;

  const stats = [
    {
      label: 'Total Assignments',
      value: totalAssignments.toString(),
      icon: TrendingUp,
      trend: `${pl(assignedProducts.length, 'Product')} · ${pl(assignedVendors.length, 'Vendor')}`,
      color: 'blue' as const,
    },
    {
      label: 'Pending Action',
      value: (pendingProducts + pendingVendors).toString(),
      icon: Clock,
      trend: `${pl(pendingProducts, 'Product')} · ${pl(pendingVendors, 'Vendor')}`,
      color: 'amber' as const,
    },
    {
      label: 'Passed',
      value: passedProducts.toString(),
      icon: CheckCircle2,
      trend: `${pl(passedProducts, 'Product')} approved`,
      color: 'emerald' as const,
    },
    {
      label: 'Rejected',
      value: failedProducts.toString(),
      icon: AlertCircle,
      trend: `${pl(failedProducts, 'Product')} rejected`,
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
        <Pressable
          onPress={fetchDashboardData}
          accessibilityLabel="Retry loading dashboard"
          accessibilityRole="button"
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: pressed ? '#1d4ed8' : '#2563eb',
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 12,
            },
          ]}
        >
          <RefreshCw size={18} color="#ffffff" strokeWidth={2.25} />
          <Text className="text-white font-bold text-base ml-2">Try Again</Text>
        </Pressable>
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
      <View 
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6"
        
      >
        <View className="px-5 py-4 border-b border-slate-100" style={{ gap: 12 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View 
                className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center"
                
              >
                <CalendarDays size={20} color="#2563eb" strokeWidth={2} />
              </View>
              <View style={{ gap: 2 }}>
                <Text className="text-base font-semibold text-slate-900">
                  Recent Assignments
                </Text>
                <Text className="text-xs text-slate-600">
                  Products and Vendors awaiting action
                </Text>
              </View>
            </View>
            <View 
              className="bg-blue-100 px-3 py-1.5 rounded-full"
              
            >
              <Text className="text-xs font-bold text-blue-800">
                {totalAssignments}
              </Text>
            </View>
          </View>
        </View>

        <View className="p-5">
          {totalAssignments === 0 ? (
            <View className="items-center py-12" style={{ gap: 12 }}>
              <View 
                className="w-20 h-20 rounded-2xl bg-slate-100 items-center justify-center"
                
              >
                <Inbox size={32} color="#64748b" strokeWidth={1.75} />
              </View>
              <View style={{ gap: 4 }}>
                <Text className="text-base font-semibold text-slate-900 text-center">
                  No active assignments
                </Text>
                <Text className="text-sm text-slate-600 text-center">
                  New assignments will appear here
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: 24 }}>
              {/* Products Section */}
              {assignedProducts.length > 0 && (
                <View style={{ gap: 12 }}>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <View 
                      className="w-6 h-6 bg-blue-100 rounded-lg items-center justify-center"
                      
                    >
                      <Package size={14} color="#2563eb" strokeWidth={2.5} />
                    </View>
                    <Text className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                      Products
                    </Text>
                    <View 
                      className="bg-slate-100 px-2 py-0.5 rounded-full"
                      
                    >
                      <Text className="text-[10px] font-bold text-slate-600">
                        {assignedProducts.length}
                      </Text>
                    </View>
                  </View>
                  <ScrollView
                    style={{ maxHeight: 300 }}
                    contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {[...assignedProducts]
                      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                      .map((product) => {
                        const badge = getStatusBadgeStyle(product.approvalStatus);
                        return (
                          <Pressable
                            key={`p-${product.id}`}
                            onPress={() => router.push('/products' as any)}
                            style={({ pressed }) => [
                              {
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#e2e8f0',
                                padding: 14,
                                backgroundColor: pressed ? '#f8fafc' : '#ffffff',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                              },
                            ]}
                          >
                            <View className="flex-row items-center" style={{ gap: 12 }}>
                              <View 
                                className="w-12 h-12 bg-blue-50 rounded-xl items-center justify-center"
                                
                              >
                                <Package size={18} color="#2563eb" strokeWidth={2} />
                              </View>
                              <View className="flex-1" style={{ gap: 4 }}>
                                <Text
                                  className="font-semibold text-slate-900"
                                  numberOfLines={1}
                                >
                                  {product.name}
                                </Text>
                                <Text
                                  className="text-xs text-slate-600"
                                  numberOfLines={1}
                                >
                                  {product.baseSku}
                                </Text>
                              </View>
                              <View
                                className={`px-2.5 py-1 rounded-lg border ${badge.bg} ${badge.border}`}
                                
                              >
                                <Text
                                  className={`text-[10px] font-bold ${badge.text}`}
                                  numberOfLines={1}
                                >
                                  {formatStatus(product.approvalStatus)}
                                </Text>
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                  </ScrollView>
                </View>
              )}

              {/* Vendors Section */}
              {assignedVendors.length > 0 && (
                <View style={{ gap: 12 }}>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <View 
                      className="w-6 h-6 bg-emerald-100 rounded-lg items-center justify-center"
                      
                    >
                      <Factory size={14} color="#059669" strokeWidth={2.5} />
                    </View>
                    <Text className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                      Vendors
                    </Text>
                    <View 
                      className="bg-slate-100 px-2 py-0.5 rounded-full"
                      
                    >
                      <Text className="text-[10px] font-bold text-slate-600">
                        {assignedVendors.length}
                      </Text>
                    </View>
                  </View>
                  <ScrollView
                    style={{ maxHeight: 300 }}
                    contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {[...assignedVendors]
                      .sort((a, b) => new Date(b.createdAt || b.submittedAt || 0).getTime() - new Date(a.createdAt || a.submittedAt || 0).getTime())
                      .map((vendor) => {
                        const badge = getStatusBadgeStyle(vendor.status);
                        return (
                          <Pressable
                            key={`v-${vendor.id}`}
                            onPress={() => router.push('/vendors' as any)}
                            style={({ pressed }) => [
                              {
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#e2e8f0',
                                padding: 14,
                                backgroundColor: pressed ? '#f8fafc' : '#ffffff',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                              },
                            ]}
                          >
                            <View className="flex-row items-center" style={{ gap: 12 }}>
                              <View 
                                className="w-12 h-12 bg-emerald-50 rounded-xl items-center justify-center"
                                
                              >
                                <Factory size={18} color="#059669" strokeWidth={2} />
                              </View>
                              <View className="flex-1" style={{ gap: 4 }}>
                                <Text
                                  className="font-semibold text-slate-900"
                                  numberOfLines={1}
                                >
                                  {vendor.companyName}
                                </Text>
                                <Text className="text-xs text-slate-600">
                                  Factory Onboarding
                                </Text>
                              </View>
                              <View
                                className={`px-2.5 py-1 rounded-lg border ${badge.bg} ${badge.border}`}
                                
                              >
                                <Text
                                  className={`text-[10px] font-bold ${badge.text}`}
                                  numberOfLines={1}
                                >
                                  {formatStatus(vendor.status)}
                                </Text>
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
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
    </ScrollView>
  );
}

