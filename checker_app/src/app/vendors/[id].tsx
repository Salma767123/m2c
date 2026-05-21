import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Factory,
  Phone,
  Mail,
  CheckCircle,
  Play,
  TrendingUp,
  BarChart3,
  Globe,
  Briefcase,
  Package,
  Warehouse,
  Award,
  FileText,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react-native';
import qcCheckerService, { AuditLogEntry } from '../../services/qcCheckerService';
import AuditTimeline from '../../components/General/AuditTimeline';

type TabId = 'overview' | 'history' | 'upcoming' | 'performance';
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'performance', label: 'Stats' },
];

const statusStyle = (status: string) => {
  const key = (status || '').toLowerCase();
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
    approved: { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
    pending: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
    under_review: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
    review: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
    completed: { bg: '#e2e8f0', text: '#334155', dot: '#64748b' },
    passed: { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
    failed: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
    rejected: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
    reinspection: { bg: '#ffedd5', text: '#9a3412', dot: '#f59e0b' },
    submitted: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
    suspended: { bg: '#e2e8f0', text: '#334155', dot: '#64748b' },
  };
  return map[key] || map.active;
};

const priorityStyle = (p: string) => {
  const key = (p || '').toLowerCase();
  const map: Record<string, { bg: string; text: string }> = {
    high: { bg: '#fee2e2', text: '#991b1b' },
    medium: { bg: '#fef3c7', text: '#92400e' },
    low: { bg: '#d1fae5', text: '#065f46' },
  };
  return map[key] || map.medium;
};

const safeExternalUrl = (url?: string | null) => {
  if (!url) return null;
  const trimmed = String(url).trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
};

const formatDate = (input?: string | Date | null) => {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAddress = (...parts: Array<string | null | undefined>) =>
  parts.map((p) => (p ?? '').toString().trim()).filter((p) => p.length > 0).join(', ');

export default function VendorDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [fullVendor, setFullVendor] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentInspections, setRecentInspections] = useState<any[]>([]);
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [historyMeta, setHistoryMeta] = useState<{ total: number; returned: number; hasMore: boolean } | null>(null);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const loadAll = useCallback(async (limitOverride?: number) => {
    if (!id) return;
    const limit = limitOverride ?? historyLimit;
    setError(null);
    if (!fullVendor) setLoading(true);
    try {
      const res = await qcCheckerService.getVendorDetails(id, limit);
      if (res.success) {
        setFullVendor(res.data.vendor);
        setStats(res.data.stats);
        const inspections = res.data.recentInspections || [];
        setRecentInspections(inspections);
        setUpcomingList(res.data.upcomingInspections || []);
        if (res.data.recentInspectionsMeta) setHistoryMeta(res.data.recentInspectionsMeta);

        // Fetch audit trails for all of this vendor's inspections
        // (the API expects inspection IDs, not vendor IDs)
        if (inspections.length > 0) {
          const allLogs: AuditLogEntry[] = [];
          const seenIds = new Set<string>();
          await Promise.all(
            inspections.map(async (insp: any) => {
              try {
                const auditRes = await qcCheckerService.getAuditTrail(
                  'FACTORY_INSPECTION',
                  insp.id,
                );
                for (const log of auditRes.logs || []) {
                  if (!seenIds.has(log.id)) {
                    seenIds.add(log.id);
                    allLogs.push(log);
                  }
                }
              } catch {
                // Silently skip failed audit fetches
              }
            }),
          );
          // Sort chronologically (newest first for vendor-level view)
          allLogs.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setAuditLogs(allLogs);
        } else {
          setAuditLogs([]);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load vendor details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, historyLimit, fullVendor]);

  // Refetch vendor + audit trail every time this screen is focused, so the
  // status / history reflects any inspection action the checker just took.
  useFocusEffect(
    useCallback(() => {
      loadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, [loadAll]);

  const actualUpcoming = upcomingList.filter(
    (i) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS',
  );
  const firstUpcoming = actualUpcoming[0];
  const isContinuing = firstUpcoming?.status === 'IN_PROGRESS';

  const handleLoadMoreHistory = () => {
    const nextLimit = Math.min(historyLimit + 20, 50);
    setHistoryLimit(nextLimit);
    loadAll(nextLimit);
  };

  const handleStartInspectionFlow = () => {
    router.push({
      pathname: '/vendors/[id]/inspection' as any,
      params: { id: id!, name: fullVendor?.companyName || name || '' },
    });
  };

  // Skeleton only on initial load
  if (loading && !fullVendor) {
    return <VendorDetailSkeleton onBack={() => router.back()} insetsTop={insets.top} />;
  }

  if (error && !fullVendor) {
    return (
      <View className="flex-1 bg-white">
        <Header onBack={() => router.back()} insetsTop={insets.top} />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-5">
            <AlertCircle size={36} color="#dc2626" strokeWidth={1.75} />
          </View>
          <Text className="text-xl font-bold text-slate-900 mb-2 text-center">
            Something went wrong
          </Text>
          <Text className="text-base text-slate-600 text-center mb-6">{error}</Text>
          <TouchableOpacity
            onPress={() => loadAll()}
            activeOpacity={0.85}
            className="flex-row items-center bg-blue-600 rounded-xl px-6 py-3"
          >
            <RefreshCw size={18} color="#ffffff" />
            <Text className="text-white font-bold text-base ml-2">Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const companyName = fullVendor?.companyName || name || 'Vendor';
  const location =
    formatAddress(fullVendor?.factoryCity, fullVendor?.factoryState) || 'Location not provided';
  const specializations: string[] = fullVendor?.specializations || [];
  const productCategories: string[] = fullVendor?.productCategories || [];
  const certifications: any[] = fullVendor?.certifications || [];
  const paymentTerms: string[] = fullVendor?.paymentTerms || [];
  const pill = statusStyle(fullVendor?.status || 'active');
  const websiteSafe = safeExternalUrl(fullVendor?.website);

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Header
        onBack={() => router.back()}
        insetsTop={insets.top}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" colors={['#2563eb']} />
        }
      >
        {/* Top meta row: status + QC assignee */}
        <View className="px-4 pt-4 flex-row flex-wrap" style={{ rowGap: 6, columnGap: 6 }}>
          <View
            className="rounded-full px-3 py-1 flex-row items-center"
            style={{ backgroundColor: pill.bg }}
          >
            <View
              className="w-1.5 h-1.5 rounded-full mr-1.5"
              style={{ backgroundColor: pill.dot }}
            />
            <Text className="text-xs font-bold capitalize" style={{ color: pill.text }}>
              {(fullVendor?.status || '').replace(/_/g, ' ').toLowerCase()}
            </Text>
          </View>
          {fullVendor?.assignedQc?.name ? (
            <View className="bg-slate-100 rounded-full px-3 py-1">
              <Text className="text-xs font-medium text-slate-700">
                QC: {fullVendor.assignedQc.name}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Blue summary card */}
        <View className="mx-4 mt-4 rounded-2xl p-5" style={{ backgroundColor: '#2563eb' }}>
          <SummaryRow
            icon={<Factory size={18} color="#ffffff" />}
            label="Vendor"
            value={companyName}
          />
          <SummaryRow
            icon={<MapPin size={18} color="#ffffff" />}
            label="Location"
            value={location}
          />
          <SummaryRow
            icon={<Calendar size={18} color="#ffffff" />}
            label="Last Inspection"
            value={stats?.lastInspectionDate ? formatDate(stats.lastInspectionDate) : 'No inspections yet'}
          />
          <SummaryRow
            icon={<BarChart3 size={18} color="#ffffff" />}
            label="Total Inspections"
            value={String(stats?.totalInspections ?? 0)}
            isLast
          />
        </View>

        {/* Start / Continue CTA */}
        {firstUpcoming ? (
          <View className="mx-4 mt-3">
            <TouchableOpacity
              onPress={handleStartInspectionFlow}
              activeOpacity={0.85}
              className="flex-row items-center justify-center bg-blue-600 rounded-xl py-3"
            >
              <Play size={16} color="#ffffff" strokeWidth={2.25} />
              <Text className="text-white font-bold text-sm ml-2">
                {isContinuing ? 'Continue' : 'Start Now'}
                {firstUpcoming.poNumber ? ` (${firstUpcoming.poNumber})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4 mb-3"
          contentContainerStyle={{ paddingHorizontal: 12 }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
                className={`mx-1 px-4 py-2 rounded-full ${
                  isActive ? 'bg-slate-900' : 'bg-white border border-slate-200'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeTab === 'overview' ? (
          <View className="mx-4" style={{ rowGap: 14 }}>
            <Card icon={<Briefcase size={18} color="#2563eb" />} title="Company Information">
              <InfoRow label="Company Name" value={companyName} />
              <InfoRow label="Company Type" value={fullVendor?.companyType} />
              <InfoRow label="Vendor Type" value={fullVendor?.vendorType} />
              <InfoRow label="Established" value={fullVendor?.establishedYear?.toString()} />
              <InfoRow label="GST Number" value={fullVendor?.gstNumber} />
              <InfoRow label="Annual Turnover" value={fullVendor?.annualTurnover} />
              {fullVendor?.website ? (
                <View className="pb-3 border-b border-slate-100">
                  <Text className="text-xs font-medium text-slate-500 mb-1">Website</Text>
                  {websiteSafe ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(websiteSafe)}
                      className="flex-row items-center"
                    >
                      <Globe size={14} color="#2563eb" />
                      <Text className="text-sm text-blue-600 ml-1.5 underline" style={{ flexShrink: 1 }}>
                        {fullVendor.website}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="flex-row items-center">
                      <Globe size={14} color="#94a3b8" />
                      <Text className="text-sm text-slate-700 ml-1.5" style={{ flexShrink: 1 }}>
                        {fullVendor.website}
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}
              {fullVendor?.companyDescription ? (
                <View className="pb-3">
                  <Text className="text-xs font-medium text-slate-500 mb-1">Description</Text>
                  <Text className="text-sm text-slate-900" style={{ lineHeight: 20 }} selectable>
                    {fullVendor.companyDescription}
                  </Text>
                </View>
              ) : null}
            </Card>

            <Card icon={<Phone size={18} color="#2563eb" />} title="Contact Information">
              {/* Primary contact */}
              <View className="pb-3 border-b border-slate-100">
                <Text className="text-xs font-medium text-slate-500 mb-1">Primary Contact</Text>
                <Text className="text-sm font-semibold text-slate-900">
                  {fullVendor?.ownerName || '—'}
                </Text>
                <Text className="text-xs text-slate-500 mb-1">Owner</Text>
                <View className="flex-row flex-wrap mt-1" style={{ columnGap: 12, rowGap: 6 }}>
                  {fullVendor?.businessPhone ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${fullVendor.businessPhone}`)}
                      className="flex-row items-center"
                    >
                      <Phone size={13} color="#475569" />
                      <Text className="text-sm text-slate-700 ml-1">{fullVendor.businessPhone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {fullVendor?.businessEmail ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`mailto:${fullVendor.businessEmail}`)}
                      className="flex-row items-center"
                    >
                      <Mail size={13} color="#475569" />
                      <Text className="text-sm text-slate-700 ml-1">{fullVendor.businessEmail}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Assigned QC Checker — NEW section */}
              {fullVendor?.assignedQc ? (
                <View className="py-3 border-b border-slate-100">
                  <Text className="text-xs font-medium text-slate-500 mb-1">
                    Assigned QC Checker
                  </Text>
                  <Text className="text-sm font-semibold text-slate-900">
                    {fullVendor.assignedQc.name}
                  </Text>
                  {fullVendor.assignedQc.checkerId ? (
                    <Text className="text-[11px] text-slate-500">
                      ID: {fullVendor.assignedQc.checkerId}
                    </Text>
                  ) : null}
                  <View className="flex-row flex-wrap mt-1.5" style={{ columnGap: 12, rowGap: 6 }}>
                    {fullVendor.assignedQc.phone ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${fullVendor.assignedQc.phone}`)}
                        className="flex-row items-center"
                      >
                        <Phone size={13} color="#475569" />
                        <Text className="text-sm text-slate-700 ml-1">
                          {fullVendor.assignedQc.phone}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {fullVendor.assignedQc.email ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`mailto:${fullVendor.assignedQc.email}`)}
                        className="flex-row items-center"
                      >
                        <Mail size={13} color="#475569" />
                        <Text className="text-sm text-slate-700 ml-1">
                          {fullVendor.assignedQc.email}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {fullVendor?.businessAddress ? (
                <View className="py-3 border-b border-slate-100">
                  <Text className="text-xs font-medium text-slate-500 mb-1">Business Address</Text>
                  <Text className="text-sm text-slate-700" style={{ lineHeight: 20 }}>
                    {formatAddress(
                      fullVendor.businessAddress,
                      fullVendor.businessCity,
                      fullVendor.businessState,
                      fullVendor.businessZipCode,
                    )}
                  </Text>
                </View>
              ) : null}

              {fullVendor?.factoryAddress ? (
                <View className="py-3 border-b border-slate-100">
                  <View className="flex-row items-center mb-1">
                    <Factory size={13} color="#64748b" />
                    <Text className="text-xs font-medium text-slate-500 ml-1">Factory</Text>
                  </View>
                  <Text className="text-sm text-slate-700" style={{ lineHeight: 20 }}>
                    {formatAddress(
                      fullVendor.factoryAddress,
                      fullVendor.factoryCity,
                      fullVendor.factoryState,
                      fullVendor.factoryZipCode,
                    )}
                  </Text>
                  {fullVendor.factorySize ? (
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      Size: {fullVendor.factorySize}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {fullVendor?.warehouseAddress ? (
                <View className="pt-3">
                  <View className="flex-row items-center mb-1">
                    <Warehouse size={13} color="#64748b" />
                    <Text className="text-xs font-medium text-slate-500 ml-1">Warehouse</Text>
                  </View>
                  <Text className="text-sm text-slate-700" style={{ lineHeight: 20 }}>
                    {formatAddress(
                      fullVendor.warehouseAddress,
                      fullVendor.warehouseCity,
                      fullVendor.warehouseState,
                    )}
                  </Text>
                </View>
              ) : null}
            </Card>

            <Card icon={<Package size={18} color="#2563eb" />} title="Capabilities & Products">
              <InfoRow label="Production Capacity" value={fullVendor?.productionCapacity} />
              <InfoRow label="Minimum Order Quantity" value={fullVendor?.minimumOrderQuantity} />
              <InfoRow label="Delivery Time" value={fullVendor?.deliveryTime} />
              <InfoRow label="Quality Control" value={fullVendor?.qualityControl} />
              {productCategories.length > 0 ? (
                <ChipGroup label="Product Categories" items={productCategories} bg="#dbeafe" text="#1d4ed8" />
              ) : null}
              {specializations.length > 0 ? (
                <ChipGroup label="Specializations" items={specializations} bg="#f3e8ff" text="#6b21a8" />
              ) : null}
              {paymentTerms.length > 0 ? (
                <ChipGroup label="Payment Terms" items={paymentTerms} bg="#f1f5f9" text="#334155" />
              ) : null}
              {certifications.length > 0 ? (
                <View className="pt-3">
                  <View className="flex-row items-center mb-2">
                    <Award size={13} color="#059669" />
                    <Text className="text-xs font-medium text-slate-500 ml-1">Certifications</Text>
                  </View>
                  <View className="flex-row flex-wrap" style={{ rowGap: 6, columnGap: 6 }}>
                    {certifications.map((c: any, i: number) => (
                      <View
                        key={i}
                        className="rounded-lg px-2.5 py-1"
                        style={{ backgroundColor: '#dcfce7' }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: '#166534' }}>
                          {c.name}
                          {c.issuedBy ? ` — ${c.issuedBy}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </Card>
          </View>
        ) : null}

        {activeTab === 'history' ? (
          <View className="mx-4" style={{ rowGap: 16 }}>
            {/* ── Inspection History ────────────────────────────────────── */}
            <View className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Section header */}
              <View
                className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100"
                style={{ backgroundColor: '#F8FAFC' }}
              >
                <View className="flex-row items-center" style={{ gap: 10 }}>
                  <View
                    className="w-8 h-8 rounded-lg items-center justify-center"
                    style={{ backgroundColor: '#EEF2FF' }}
                  >
                    <FileText size={16} color="#4F46E5" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-slate-900">Inspection History</Text>
                    <Text className="text-[10px] text-slate-500">
                      {recentInspections.length === 0
                        ? 'Completed reports will appear here'
                        : historyMeta && historyMeta.total > 0
                          ? `Showing ${historyMeta.returned} of ${historyMeta.total}`
                          : `${recentInspections.length} completed`}
                    </Text>
                  </View>
                </View>
                {recentInspections.length > 0 && (
                  <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: '#E2E8F0' }}>
                    <Text className="text-[10px] font-bold text-slate-600">
                      {historyMeta?.total ?? recentInspections.length}
                    </Text>
                  </View>
                )}
              </View>

              {/* Inspection cards */}
              {recentInspections.length > 0 ? (
                <View className="p-3" style={{ gap: 10 }}>
                  {recentInspections.map((insp: any) => {
                    const r = statusStyle(insp.result || '');
                    const scoreNum = typeof insp.score === 'number' ? insp.score : null;
                    const scoreColor =
                      scoreNum === null
                        ? '#94A3B8'
                        : scoreNum >= 8
                          ? '#059669'
                          : scoreNum >= 6
                            ? '#D97706'
                            : '#DC2626';
                    const scoreBg =
                      scoreNum === null
                        ? '#F1F5F9'
                        : scoreNum >= 8
                          ? '#ECFDF5'
                          : scoreNum >= 6
                            ? '#FFFBEB'
                            : '#FEF2F2';
                    const resultText = insp.result
                      ? insp.result.replace(/_/g, ' ')
                      : 'Pending';
                    const isPassed = ['passed', 'approved', 'completed'].includes(
                      (insp.result || '').toLowerCase(),
                    );
                    const isFailed = ['failed', 'rejected'].includes(
                      (insp.result || '').toLowerCase(),
                    );
                    const dateLabel =
                      formatDate(insp.scheduledDate) || insp.scheduledDate || '';

                    return (
                      <TouchableOpacity
                        key={insp.id}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Inspection ${insp.poNumber}, ${insp.clientName}, ${resultText}`}
                        className="rounded-xl overflow-hidden"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        {/* Card content */}
                        <View className="flex-row">
                          {/* Left accent bar */}
                          <View
                            style={{
                              width: 4,
                              backgroundColor: r.dot,
                              borderTopLeftRadius: 12,
                              borderBottomLeftRadius: 12,
                            }}
                          />

                          {/* Main content */}
                          <View className="flex-1 p-3.5" style={{ gap: 10 }}>
                            {/* Top row: PO + Date */}
                            <View className="flex-row items-center justify-between">
                              <View
                                className="rounded-md px-2 py-0.5"
                                style={{ backgroundColor: '#F1F5F9' }}
                              >
                                <Text className="text-[11px] font-bold font-mono text-slate-600">
                                  {insp.poNumber || '—'}
                                </Text>
                              </View>
                              <View className="flex-row items-center" style={{ gap: 4 }}>
                                <Calendar size={11} color="#94A3B8" />
                                <Text className="text-[11px] text-slate-400 font-medium">
                                  {dateLabel}
                                </Text>
                              </View>
                            </View>

                            {/* Client name */}
                            <Text
                              className="text-sm font-bold text-slate-900"
                              numberOfLines={1}
                              style={{ lineHeight: 20 }}
                            >
                              {insp.clientName}
                            </Text>

                            {/* Bottom row: Status badge + Score */}
                            <View className="flex-row items-center justify-between">
                              {/* Status badge */}
                              <View
                                className="flex-row items-center rounded-full px-2.5 py-1"
                                style={{ backgroundColor: r.bg, gap: 4 }}
                              >
                                {isPassed ? (
                                  <CheckCircle size={12} color={r.text} />
                                ) : isFailed ? (
                                  <AlertCircle size={12} color={r.text} />
                                ) : (
                                  <Clock size={12} color={r.text} />
                                )}
                                <Text
                                  className="text-[10px] font-bold uppercase"
                                  style={{ color: r.text }}
                                >
                                  {resultText}
                                </Text>
                              </View>

                              {/* Score chip */}
                              {scoreNum !== null ? (
                                <View
                                  className="flex-row items-center rounded-lg px-2.5 py-1"
                                  style={{ backgroundColor: scoreBg, gap: 6 }}
                                >
                                  {/* Mini score ring */}
                                  <View
                                    className="w-5 h-5 rounded-full items-center justify-center"
                                    style={{
                                      borderWidth: 2,
                                      borderColor: scoreColor,
                                    }}
                                  >
                                    <Text
                                      className="font-extrabold"
                                      style={{
                                        color: scoreColor,
                                        fontSize: 8,
                                        lineHeight: 10,
                                      }}
                                    >
                                      {scoreNum}
                                    </Text>
                                  </View>
                                  <Text
                                    className="text-[11px] font-bold"
                                    style={{ color: scoreColor }}
                                  >
                                    / 10
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Completion date — if applicable */}
                            {insp.completedAt && (
                              <Text className="text-[10px] text-slate-400">
                                Completed {formatDate(insp.completedAt)}
                              </Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                /* Empty state */
                <View className="items-center py-12" style={{ gap: 8 }}>
                  <View
                    className="w-14 h-14 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: '#F1F5F9' }}
                  >
                    <FileText size={24} color="#94A3B8" />
                  </View>
                  <Text className="text-sm font-bold text-slate-900">No inspections yet</Text>
                  <Text className="text-xs text-slate-500 text-center px-8">
                    Completed inspections will appear here once they are submitted.
                  </Text>
                </View>
              )}

              {/* Load more */}
              {historyMeta?.hasMore && (
                <TouchableOpacity
                  onPress={handleLoadMoreHistory}
                  disabled={loading || historyLimit >= 50}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Load more inspections"
                  className="border-t border-slate-100 flex-row items-center justify-center"
                  style={{
                    paddingVertical: 14,
                    opacity: loading || historyLimit >= 50 ? 0.5 : 1,
                  }}
                >
                  <RefreshCw size={14} color="#2563EB" />
                  <Text className="text-sm font-semibold text-blue-600 ml-2">
                    {historyLimit >= 50 ? 'Showing max 50' : 'Load older inspections'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Audit Trail */}
            {auditLogs.length > 0 && (
              <View className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Section header */}
                <View
                  className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100"
                  style={{ backgroundColor: '#F8FAFC' }}
                >
                  <View className="flex-row items-center" style={{ gap: 10 }}>
                    <View
                      className="w-8 h-8 rounded-lg items-center justify-center"
                      style={{ backgroundColor: '#EFF6FF' }}
                    >
                      <ShieldCheck size={16} color="#2563EB" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-slate-900">Audit Trail</Text>
                      <Text className="text-[10px] text-slate-500">All actions and status changes</Text>
                    </View>
                  </View>
                  <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: '#E2E8F0' }}>
                    <Text className="text-[10px] font-bold text-slate-600">
                      {auditLogs.length} {auditLogs.length === 1 ? 'entry' : 'entries'}
                    </Text>
                  </View>
                </View>
                {/* Timeline content */}
                <View className="p-4">
                  <AuditTimeline logs={auditLogs} />
                </View>
              </View>
            )}
          </View>
        ) : null}

        {activeTab === 'upcoming' ? (
          <View className="mx-4">
            <Card icon={<Calendar size={18} color="#2563eb" />} title="Upcoming Inspections">
              {actualUpcoming.length > 0 ? (
                <View style={{ rowGap: 10 }}>
                  {actualUpcoming.map((insp: any) => {
                    const prio = priorityStyle(insp.priority);
                    return (
                      <View key={insp.id} className="border border-slate-200 rounded-xl p-3.5">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="rounded px-2 py-0.5" style={{ backgroundColor: '#dbeafe' }}>
                            <Text className="text-xs font-mono font-bold text-blue-700">
                              {insp.poNumber}
                            </Text>
                          </View>
                          {insp.priority ? (
                            <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: prio.bg }}>
                              <Text className="text-[10px] font-bold uppercase" style={{ color: prio.text }}>
                                {insp.priority}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-sm font-semibold text-slate-900 mb-2" numberOfLines={1}>
                          {insp.clientName}
                        </Text>
                        <View className="flex-row" style={{ columnGap: 16 }}>
                          <View className="flex-row items-center">
                            <Calendar size={12} color="#64748b" />
                            <Text className="text-xs text-slate-600 ml-1">{insp.scheduledDate}</Text>
                          </View>
                          <View className="flex-row items-center">
                            <Clock size={12} color="#64748b" />
                            <Text className="text-xs text-slate-600 ml-1">{insp.scheduledTime}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <EmptyCard icon={<Calendar size={26} color="#94a3b8" />} title="No pending inspections" sub="" />
              )}
            </Card>
          </View>
        ) : null}

        {activeTab === 'performance' ? (
          <View className="mx-4 flex-row flex-wrap" style={{ columnGap: 10, rowGap: 10 }}>
            <StatTile
              icon={<Calendar size={22} color="#2563eb" />}
              bg="#dbeafe"
              value={stats?.scheduledCount ?? 0}
              label="Scheduled"
            />
            <StatTile
              icon={<Clock size={22} color="#d97706" />}
              bg="#fef3c7"
              value={stats?.inProgressCount ?? 0}
              label="In Progress"
            />
            <StatTile
              icon={<CheckCircle size={22} color="#059669" />}
              bg="#d1fae5"
              value={stats?.completedCount ?? 0}
              label="Completed"
            />
            <StatTile
              icon={<TrendingUp size={22} color="#7c3aed" />}
              bg="#ede9fe"
              value={`${stats?.passRate ?? 0}%`}
              label="Pass Rate"
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Reusable bits ───────────────────────────────────────────────────────────

function Header({
  onBack,
  insetsTop,
}: {
  onBack: () => void;
  insetsTop: number;
}) {
  return (
    <View
      className="bg-white border-b border-slate-100 flex-row items-center justify-between px-4 pb-3"
      style={{ paddingTop: insetsTop + 8 }}
    >
      <TouchableOpacity
        onPress={onBack}
        hitSlop={10}
        activeOpacity={0.7}
        className="w-10 h-10 items-center justify-center rounded-full bg-slate-100"
      >
        <ArrowLeft size={20} color="#0f172a" />
      </TouchableOpacity>
      <Text className="text-base font-bold text-slate-900">Vendor Details</Text>
      <View className="w-10" />
    </View>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4">
      <View className="flex-row items-center mb-3">
        <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center mr-3">
          {icon}
        </View>
        <Text className="text-base font-extrabold text-slate-900">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View className="py-3 border-b border-slate-100">
      <Text className="text-xs font-medium text-slate-500 mb-1">{label}</Text>
      <Text className="text-sm text-slate-900" style={{ lineHeight: 20 }} selectable>
        {String(value)}
      </Text>
    </View>
  );
}

function ChipGroup({
  label,
  items,
  bg,
  text,
}: {
  label: string;
  items: string[];
  bg: string;
  text: string;
}) {
  return (
    <View className="pt-3 border-t border-slate-100 mt-1">
      <Text className="text-xs font-medium text-slate-500 mb-2">{label}</Text>
      <View className="flex-row flex-wrap" style={{ rowGap: 6, columnGap: 6 }}>
        {items.map((item, i) => (
          <View key={i} className="rounded-lg px-2.5 py-1" style={{ backgroundColor: bg }}>
            <Text className="text-xs font-semibold" style={{ color: text }}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatTile({
  icon,
  bg,
  value,
  label,
}: {
  icon: React.ReactNode;
  bg: string;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <View
      className="bg-white rounded-2xl border border-slate-200 p-4"
      style={{ width: '48%' }}
    >
      <View
        className="w-12 h-12 rounded-xl items-center justify-center mb-3"
        style={{ backgroundColor: bg }}
      >
        {icon}
      </View>
      <Text className="text-2xl font-extrabold text-slate-900">{value}</Text>
      <Text className="text-xs font-medium text-slate-500 mt-0.5">{label}</Text>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View className={`flex-row items-center ${isLast ? '' : 'mb-3'}`}>
      <View
        className="w-9 h-9 items-center justify-center rounded-lg mr-3"
        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-xs" style={{ color: '#bfdbfe' }}>
          {label}
        </Text>
        <Text className="text-sm font-semibold text-white" numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function EmptyCard({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200 py-10 items-center">
      <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
        {icon}
      </View>
      <Text className="text-sm font-semibold text-slate-700 mb-1">{title}</Text>
      {sub ? <Text className="text-xs text-slate-500">{sub}</Text> : null}
    </View>
  );
}

function VendorDetailSkeleton({
  onBack,
  insetsTop,
}: {
  onBack: () => void;
  insetsTop: number;
}) {
  const Block = ({
    w,
    h,
    style,
  }: {
    w: number | string;
    h: number;
    style?: any;
  }) => (
    <View
      className="bg-slate-200"
      style={{ width: w as any, height: h, borderRadius: 8, ...style }}
    />
  );
  return (
    <View className="flex-1 bg-slate-50">
      <Header onBack={onBack} insetsTop={insetsTop} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-4 flex-row" style={{ columnGap: 6 }}>
          <Block w={80} h={22} style={{ borderRadius: 999 }} />
          <Block w={100} h={22} style={{ borderRadius: 999 }} />
        </View>
        <View className="mx-4 mt-4 bg-slate-300/60 rounded-2xl p-5">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className={`flex-row items-center ${i === 3 ? '' : 'mb-3'}`}>
              <View className="w-9 h-9 bg-slate-300 rounded-lg mr-3" />
              <View className="flex-1">
                <Block w="30%" h={10} />
                <View style={{ height: 6 }} />
                <Block w="60%" h={14} />
              </View>
            </View>
          ))}
        </View>
        <View className="mx-4 mt-5" style={{ rowGap: 10 }}>
          {[0, 1].map((i) => (
            <View key={i} className="bg-white rounded-2xl p-4 border border-slate-200">
              <View className="flex-row items-center mb-3">
                <View className="w-9 h-9 bg-slate-200 rounded-xl mr-3" />
                <Block w={160} h={14} />
              </View>
              {[0, 1, 2, 3].map((j) => (
                <View key={j} className="py-3 border-b border-slate-100">
                  <Block w={90} h={10} />
                  <View style={{ height: 6 }} />
                  <Block w="80%" h={14} />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
