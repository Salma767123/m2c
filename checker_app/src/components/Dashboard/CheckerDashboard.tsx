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
  Calendar,
  RefreshCw,
  Inbox,
} from 'lucide-react-native';
import StatCard from './StatCard';
import qcCheckerService from '../../services/qcCheckerService';
import { formatCheckerName } from '../Vendor/Steps/fieldHelpers';
import { vendorInspectionStatusOf, vendorScheduledMs, formatScheduledDate } from '@/lib/checkerVendorStatus';
import { router } from 'expo-router';
import { brand } from '@/constants/design';

// ── Product status labels + badge colours (mirrors web CheckerDashboard) ──────
const PRODUCT_STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Approved by Admin',
  QC_SUBMITTED: 'Submitted',
  QC_APPROVED: 'Approved by QC',
  REJECTED: 'Rejected',
  REINSPECTION: 'Reinspection',
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review by Admin',
  SUSPENDED: 'Suspended',
};

const formatProductStatus = (status: string) =>
  PRODUCT_STATUS_LABELS[status] ||
  status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const PRODUCT_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  QC_SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  QC_APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  REINSPECTION: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  UNDER_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
};
const productBadge = (status: string) => PRODUCT_BADGE[status] || PRODUCT_BADGE.PENDING;

// ── Vendor "main status" derivation + colours (mirrors web CheckerDashboard) ──
const VENDOR_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'New Assignment': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Under Review by Admin': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Re-Inspection': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Re-Inspection Under Review by Admin': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Re-Inspection Under Review': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};
const vendorBadge = (status: string) =>
  VENDOR_STATUS_COLORS[status] || { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };

function getVendorMainStatus(
  dbStatus: string,
  latestInspection?: { status?: string | null; result?: string | null; cycleNumber?: number | null } | null,
): string {
  const status = dbStatus?.toUpperCase() || 'PENDING';
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'REINSPECTION') return 'Re-Inspection';
  if (status === 'UNDER_REVIEW') {
    if (latestInspection) {
      const inspStatus = latestInspection.status?.toUpperCase();
      const cycle = latestInspection.cycleNumber ?? 1;
      if (inspStatus === 'SCHEDULED' || inspStatus === 'IN_PROGRESS') {
        return cycle > 1 ? 'Re-Inspection' : 'New Assignment';
      }
      if (inspStatus === 'SUBMITTED' || inspStatus === 'UNDER_ADMIN_REVIEW') {
        return cycle > 1 ? 'Re-Inspection Under Review by Admin' : 'Under Review by Admin';
      }
    }
    return 'Under Review by Admin';
  }
  if (status === 'PENDING') return 'New Assignment';
  return status.replace(/_/g, ' ').toLowerCase();
}

const pl = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// How many rows the Recent Assignments card shows before the checker has to open
// the full list (matches web).
const RECENT_LIMIT = 8;

// Sortable timestamp for a product's booked QC window — the product-side twin of
// vendorScheduledMs. Falls back to the product's creation time when the admin
// hasn't booked a slot yet, so unscheduled products still order sensibly.
const productScheduledMs = (product: any): number => {
  const sched = product?.qcAssignment;
  if (sched?.scheduledDate) {
    const t = new Date(`${sched.scheduledDate} ${sched.scheduledTime || '00:00'}`).getTime();
    if (!isNaN(t)) return t;
    const d = new Date(sched.scheduledDate).getTime();
    if (!isNaN(d)) return d;
  }
  return new Date(product?.createdAt || 0).getTime();
};

const formattedDate = (d: Date) =>
  d.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const formattedTime = (d: Date) =>
  d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

type DomainTab = 'vendor' | 'product';

export function CheckerDashboard({ checkerId }: { checkerId: string | null }) {
  const [assignedProducts, setAssignedProducts] = useState<any[]>([]);
  const [assignedVendors, setAssignedVendors] = useState<any[]>([]);
  const [completedInspections, setCompletedInspections] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<DomainTab>('vendor');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  // The greeting reads better with a person's name than with a login code, so
  // pull the checker's name from the cached login payload. `checkerId` stays the
  // fallback for the first frame and for any account with no name stored.
  const [checkerName, setCheckerName] = useState<string | null>(null);
  const greetingName = checkerName || checkerId;

  useEffect(() => {
    let cancelled = false;
    qcCheckerService
      .getCheckerData()
      .then((data) => {
        if (cancelled) return;
        const name = formatCheckerName(data) || data?.name || null;
        if (name) setCheckerName(name);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Real-time clock — tick once a second (matches web).
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = await qcCheckerService.getCheckerToken();
      if (!token) return;

      setError(null);
      const [productsRes, vendorsRes, inspectionsRes] = await Promise.all([
        qcCheckerService.getAssignedProducts(),
        qcCheckerService.getAssignedVendors(),
        qcCheckerService.getInspections({ limit: 50, status: 'COMPLETED' }).catch(() => ({ success: false, inspections: [] })),
      ]);
      if (productsRes.success) {
        const raw: any = productsRes.data;
        setAssignedProducts(Array.isArray(raw) ? raw : raw?.products || raw?.items || []);
      }
      if (vendorsRes.success) {
        const raw: any = vendorsRes.data;
        setAssignedVendors(Array.isArray(raw) ? raw : raw?.vendors || []);
      }
      if ((inspectionsRes as any).success) {
        setCompletedInspections((inspectionsRes as any).inspections ?? []);
      }
    } catch (err: any) {
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

  // ── Counts (mirror web) ──────────────────────────────────────────────────
  const pendingProducts = assignedProducts.filter(
    (p) => p.approvalStatus === 'PENDING' || p.approvalStatus === 'REINSPECTION',
  ).length;
  // "Completed" from the checker's view = they finished & submitted the inspection.
  // QC_SUBMITTED (awaiting the admin's decision) counts here, alongside the admin's
  // later QC_APPROVED/APPROVED outcomes.
  const passedProducts = assignedProducts.filter(
    (p) =>
      p.approvalStatus === 'QC_SUBMITTED' ||
      p.approvalStatus === 'QC_APPROVED' ||
      p.approvalStatus === 'APPROVED',
  ).length;
  const failedProducts = assignedProducts.filter((p) => p.approvalStatus === 'REJECTED').length;

  // Vendor counts come from the SAME assigned-vendor list the Vendors tab shows,
  // through the SAME status derivation it filters on — so each card's number
  // equals exactly the rows its filter lands on, and the three are mutually
  // exclusive. They used to be a mix of raw DB status (which counted
  // awaiting-admin vendors as pending) and a separate completed-inspections
  // fetch (which counted every cycle of a re-inspected vendor).
  const pendingVendors = assignedVendors.filter((v) => vendorInspectionStatusOf(v) === 'Pending').length;
  const passedVendors = assignedVendors.filter((v) => vendorInspectionStatusOf(v) === 'Completed').length;
  const failedVendors = assignedVendors.filter((v) => vendorInspectionStatusOf(v) === 'Rejected').length;

  const isVendor = activeTab === 'vendor';

  // ── KPI navigation (mirror web query params) ─────────────────────────────
  const goVendors = (params: Record<string, string>) =>
    router.push({ pathname: '/(tabs)/vendors' as any, params });
  const goProducts = (params: Record<string, string>) =>
    router.push({ pathname: '/(tabs)/products' as any, params });

  const stats = isVendor
    ? [
        {
          label: 'Total Assignments',
          value: assignedVendors.length.toString(),
          icon: TrendingUp,
          trend: pl(assignedVendors.length, 'Vendor'),
          color: 'brand' as const,
          onPress: () => goVendors({}),
        },
        {
          label: 'Pending Action',
          value: pendingVendors.toString(),
          icon: Clock,
          trend: pl(pendingVendors, 'Vendor'),
          color: 'amber' as const,
          onPress: () => goVendors({ inspectionStatus: 'Pending' }),
        },
        {
          label: 'Completed',
          value: passedVendors.toString(),
          icon: CheckCircle2,
          trend: pl(passedVendors, 'Vendor'),
          color: 'success' as const,
          onPress: () => goVendors({ inspectionStatus: 'Completed' }),
        },
        {
          label: 'Rejected',
          value: failedVendors.toString(),
          icon: AlertCircle,
          trend: pl(failedVendors, 'Vendor'),
          color: 'danger' as const,
          // inspectionStatus, not status: the count is an inspection-status
          // bucket, so the filter it opens has to be the same bucket or the
          // list won't show the rows the card just counted.
          onPress: () => goVendors({ inspectionStatus: 'Rejected' }),
        },
      ]
    : [
        {
          label: 'Total Assignments',
          value: assignedProducts.length.toString(),
          icon: TrendingUp,
          trend: pl(assignedProducts.length, 'Product'),
          color: 'brand' as const,
          onPress: () => goProducts({}),
        },
        {
          label: 'Pending Action',
          value: pendingProducts.toString(),
          icon: Clock,
          trend: pl(pendingProducts, 'Product'),
          color: 'amber' as const,
          // The card counts PENDING + REINSPECTION, so the filter it opens has
          // to carry both — sending only PENDING showed fewer rows than the
          // number the checker just tapped. The API takes a comma-separated
          // list (getAssignedProducts splits and validates each value).
          onPress: () => goProducts({ status: 'PENDING,REINSPECTION' }),
        },
        {
          label: 'Completed',
          value: passedProducts.toString(),
          icon: CheckCircle2,
          trend: pl(passedProducts, 'Product'),
          color: 'success' as const,
          // Same three statuses the count uses: submitted-awaiting-admin counts
          // as done from the checker's side, alongside the admin's later
          // QC_APPROVED / APPROVED outcomes.
          onPress: () => goProducts({ status: 'QC_SUBMITTED,QC_APPROVED,APPROVED' }),
        },
        {
          label: 'Rejected',
          value: failedProducts.toString(),
          icon: AlertCircle,
          trend: pl(failedProducts, 'Product'),
          color: 'danger' as const,
          onPress: () => goProducts({ status: 'REJECTED' }),
        },
      ];

  const recentCount = isVendor ? assignedVendors.length : assignedProducts.length;

  if (loading) {
    return <DashboardSkeleton greetingName={greetingName} />;
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
        <Text className="text-base text-slate-600 text-center mb-6">{error}</Text>
        <Pressable
          onPress={fetchDashboardData}
          accessibilityLabel="Retry loading dashboard"
          accessibilityRole="button"
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: pressed ? brand[600] : brand[500],
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
    <View className="flex-1 bg-gray-50">
      {/* Sticky greeting — stays pinned below the AppBar; content scrolls under it */}
      <View className="px-4 pt-4 pb-3 bg-gray-50 border-b border-slate-200">
        <Text className="text-3xl font-extrabold text-slate-900 mb-1">Dashboard</Text>
        <Text className="text-slate-600 text-sm mb-2">
          Welcome back, <Text className="font-bold text-brand-600">{greetingName}</Text>
        </Text>
        <View className="flex-row items-center flex-wrap" style={{ columnGap: 8, rowGap: 4 }}>
          <View className="flex-row items-center">
            <Calendar size={14} color="#64748b" />
            <Text className="text-xs font-medium text-slate-500 ml-1.5">{formattedDate(now)}</Text>
          </View>
          <Text className="text-slate-300">|</Text>
          <View className="flex-row items-center">
            <Clock size={13} color="#64748b" />
            <Text className="text-xs font-medium text-slate-500 ml-1.5" style={{ fontVariant: ['tabular-nums'] }}>
              {formattedTime(now)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand[500]}
            colors={[brand[500]]}
          />
        }
      >
      {/* Domain toggle */}
      <View className="flex-row mb-6" style={{ columnGap: 12 }}>
        <Pressable
          onPress={() => setActiveTab('vendor')}
          className={`flex-1 flex-row items-center justify-center rounded-xl border py-3 ${
            isVendor ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'
          }`}
        >
          <Factory size={18} color={isVendor ? brand[500] : '#64748b'} />
          <Text className={`ml-2 text-sm font-bold ${isVendor ? 'text-brand-700' : 'text-slate-500'}`}>
            Vendor Inspection
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('product')}
          className={`flex-1 flex-row items-center justify-center rounded-xl border py-3 ${
            !isVendor ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'
          }`}
        >
          <Package size={18} color={!isVendor ? brand[500] : '#64748b'} />
          <Text className={`ml-2 text-sm font-bold ${!isVendor ? 'text-brand-700' : 'text-slate-500'}`}>
            Product Inspection
          </Text>
        </Pressable>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap justify-between mb-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </View>

      {/* Recent Assignments */}
      <View className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        {/* Primary-red header strip — white icon circle + white text */}
        <View className="bg-brand-500 px-5 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View className="w-10 h-10 bg-white rounded-full items-center justify-center">
                <CalendarDays size={20} color={brand[500]} strokeWidth={2.25} />
              </View>
              <View style={{ gap: 2 }}>
                <Text className="text-base font-bold text-white">Recent Assignments</Text>
                <Text className="text-xs text-white/85">
                  {isVendor ? 'Vendors awaiting action' : 'Products awaiting action'}
                </Text>
              </View>
            </View>
            <View className="bg-white px-3 py-1.5 rounded-full">
              <Text className="text-xs font-bold text-brand-600">{recentCount} total</Text>
            </View>
          </View>
        </View>

        <View className="p-5">
          {recentCount === 0 ? (
            <View className="items-center py-12" style={{ gap: 12 }}>
              <View className="w-20 h-20 rounded-2xl bg-slate-100 items-center justify-center">
                <Inbox size={32} color="#64748b" strokeWidth={1.75} />
              </View>
              <View style={{ gap: 4 }}>
                <Text className="text-base font-semibold text-slate-900 text-center">
                  No active assignments found.
                </Text>
                <Text className="text-sm text-slate-600 text-center">
                  New assignments will appear here
                </Text>
              </View>
            </View>
          ) : isVendor ? (
            <View style={{ gap: 10 }}>
              {[...assignedVendors]
                // Ordered by the booked inspection window (scheduledDate +
                // scheduledTime), not the vendor's join date — what the checker
                // needs first is what is scheduled next. Capped at 8; the "N
                // total" badge above carries the full count.
                .sort((a, b) => vendorScheduledMs(b) - vendorScheduledMs(a))
                .slice(0, RECENT_LIMIT)
                .map((vendor) => {
                  const vendorStatus = getVendorMainStatus(vendor.status, vendor.inspections?.[0] ?? null);
                  const badge = vendorBadge(vendorStatus);
                  const latestInsp = vendor.inspections?.[0];
                  const schedDate = latestInsp?.scheduledDate as string | undefined;
                  const schedTime = latestInsp?.scheduledTime as string | undefined;
                  return (
                    <Pressable
                      key={`v-${vendor.id}`}
                      onPress={() =>
                        router.push({ pathname: '/vendors/[id]' as any, params: { id: vendor.id, name: vendor.companyName } })
                      }
                      style={({ pressed }) => [
                        {
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          padding: 14,
                          backgroundColor: pressed ? '#f8fafc' : '#ffffff',
                        },
                      ]}
                    >
                      <View className="flex-row items-center" style={{ gap: 12 }}>
                        <View className="w-11 h-11 bg-brand-50 rounded-xl items-center justify-center">
                          <Factory size={18} color={brand[500]} strokeWidth={2} />
                        </View>
                        <View className="flex-1" style={{ gap: 4 }}>
                          <Text className="font-semibold text-slate-900" numberOfLines={1}>
                            {vendor.companyName}
                          </Text>
                          <Text className="text-xs text-slate-500">Factory Onboarding</Text>
                          {/* The booked window, or an explicit "not scheduled yet" —
                              a bare assignment date told the checker nothing about
                              when they are due on site. */}
                          <View className="flex-row items-center" style={{ gap: 4 }}>
                            <CalendarDays size={11} color="#94a3b8" />
                            <Text className="text-[11px] text-slate-400" numberOfLines={1}>
                              {schedDate
                                ? `Scheduled ${formatScheduledDate(schedDate)}${schedTime ? ` · ${schedTime}` : ''}`
                                : 'Not scheduled yet'}
                            </Text>
                          </View>
                        </View>
                        <View className={`px-2.5 py-1 rounded-full border ${badge.bg} ${badge.border}`}>
                          <Text className={`text-[10px] font-bold ${badge.text}`} numberOfLines={1}>
                            {vendorStatus}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {[...assignedProducts]
                // Ordered by the booked QC window, like the vendor list — what is
                // scheduled next matters more than when the product was created.
                // Products with no slot yet fall back to createdAt so they still sort.
                .sort((a, b) => productScheduledMs(b) - productScheduledMs(a))
                .slice(0, RECENT_LIMIT)
                .map((product) => {
                  const badge = productBadge(product.approvalStatus);
                  const sched = product.qcAssignment || {};
                  const schedDate = sched.scheduledDate as string | undefined;
                  const schedTime = sched.scheduledTime as string | undefined;
                  return (
                    <Pressable
                      key={`p-${product.id}`}
                      onPress={() =>
                        router.push({ pathname: '/products/[id]' as any, params: { id: product.id, name: product.name } })
                      }
                      style={({ pressed }) => [
                        {
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          padding: 14,
                          backgroundColor: pressed ? '#f8fafc' : '#ffffff',
                        },
                      ]}
                    >
                      <View className="flex-row items-center" style={{ gap: 12 }}>
                        <View className="w-11 h-11 bg-brand-50 rounded-xl items-center justify-center">
                          <Package size={18} color={brand[500]} strokeWidth={2} />
                        </View>
                        <View className="flex-1" style={{ gap: 4 }}>
                          <Text className="font-semibold text-slate-900" numberOfLines={1}>
                            {product.name}
                          </Text>
                          {product.baseSku ? (
                            <Text className="text-xs text-slate-500">SKU: {product.baseSku}</Text>
                          ) : null}
                          {product.vendor?.companyName ? (
                            <Text className="text-xs text-slate-500" numberOfLines={1}>{product.vendor.companyName}</Text>
                          ) : null}
                          {/* Same line as the vendor card: the booked window, or an
                              explicit "not scheduled yet". */}
                          <View className="flex-row items-center" style={{ gap: 4 }}>
                            <CalendarDays size={11} color="#94a3b8" />
                            <Text className="text-[11px] text-slate-400" numberOfLines={1}>
                              {schedDate
                                ? `Scheduled ${formatScheduledDate(schedDate)}${schedTime ? ` · ${schedTime}` : ''}`
                                : 'Not scheduled yet'}
                            </Text>
                          </View>
                        </View>
                        <View className={`px-2.5 py-1 rounded-full border ${badge.bg} ${badge.border}`}>
                          <Text className={`text-[10px] font-bold ${badge.text}`} numberOfLines={1}>
                            {formatProductStatus(product.approvalStatus)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          )}
        </View>
      </View>
      </ScrollView>
    </View>
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

function DashboardSkeleton({ greetingName }: { greetingName: string | null }) {
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header: real greeting + placeholder date */}
      <View className="mb-6">
        <Text className="text-3xl font-extrabold text-slate-900 mb-1">Dashboard</Text>
        <Text className="text-slate-600 text-sm mb-3">
          Welcome back, <Text className="font-bold text-brand-600">{greetingName || '...'}</Text>
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
        <View className="px-5 py-4 border-b border-slate-200 flex-row items-center justify-between bg-brand-50/50">
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
