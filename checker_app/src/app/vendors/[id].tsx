import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
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
  ThumbsUp,
  ThumbsDown,
  Globe,
  Briefcase,
  Package,
  Warehouse,
  Award,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'performance', label: 'Performance' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const getStatusColor = (status: string) => {
  const key = (status || '').toLowerCase();
  const map: Record<string, { bg: string; text: string; border: string }> = {
    active: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
    approved: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
    review: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    under_review: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    completed: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
    passed: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
    failed: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    suspended: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
  };
  return map[key] || map.active;
};

const getPriorityColor = (priority: string) => {
  const key = (priority || '').toLowerCase();
  const map: Record<string, { bg: string; text: string; border: string }> = {
    high: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    medium: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
    low: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  };
  return map[key] || map.medium;
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View className="mb-3">
      <Text className="text-xs font-medium text-slate-600 mb-0.5">{label}</Text>
      <Text className="text-sm text-slate-900">{String(value)}</Text>
    </View>
  );
}

function Chip({
  label,
  variant = 'blue',
}: {
  label: string;
  variant?: 'blue' | 'purple' | 'green' | 'slate';
}) {
  const map = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const [bg, text, border] = map[variant].split(' ');
  return (
    <View className={`px-2 py-1 rounded-full border ${bg} ${border} mr-2 mb-2`}>
      <Text className={`text-xs ${text}`}>{label}</Text>
    </View>
  );
}

function PerfCard({
  icon,
  iconColor,
  bg,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconColor: string;
  bg: string;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <View
      className="bg-white rounded-xl border border-slate-200 p-5 items-center"
      style={{ width: '48%', marginBottom: 12 }}
    >
      <View className={`${bg} w-12 h-12 items-center justify-center rounded-lg mb-2`}>
        {icon}
      </View>
      <Text className="text-2xl font-bold text-slate-900">{value}</Text>
      <Text className="text-xs text-slate-600 mt-0.5 text-center">{label}</Text>
    </View>
  );
}

export default function VendorDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [fullVendor, setFullVendor] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentInspections, setRecentInspections] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [detailsRes, inspectionsRes] = await Promise.all([
        qcCheckerService.getVendorDetails(id),
        qcCheckerService.getInspections(),
      ]);
      if (detailsRes.success) {
        setFullVendor(detailsRes.data.vendor);
        setStats(detailsRes.data.stats);
        setRecentInspections(detailsRes.data.recentInspections || []);
      }
      if (inspectionsRes.success) {
        setInspections(
          (inspectionsRes.inspections || []).filter(
            (i: any) => i.vendorId === id,
          ),
        );
      }
    } catch (err: any) {
      console.error('Failed to load vendor details', err);
      setError(err?.message || 'Failed to load vendor details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetails();
  }, [fetchDetails]);

  const actualUpcomingInspections = inspections.filter(
    (i) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS',
  );

  const currentStatus = (fullVendor?.status || '').toUpperCase();
  const isActionable =
    currentStatus === 'UNDER_REVIEW' || currentStatus === 'PENDING';

  const handleApprove = () => {
    Alert.alert(
      'Approve Vendor',
      `Approve ${fullVendor?.companyName || name || 'this vendor'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await qcCheckerService.approveVendor(id!);
              Alert.alert('Success', 'Vendor approved successfully');
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to approve vendor');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  const handleReject = () => {
    Alert.prompt?.(
      'Reject Vendor',
      'Enter rejection reason:',
      async (reason?: string) => {
        if (!reason) return;
        setIsProcessing(true);
        try {
          await qcCheckerService.rejectVendor(id!, reason);
          Alert.alert('Success', 'Vendor rejected successfully');
          router.back();
        } catch {
          Alert.alert('Error', 'Failed to reject vendor');
        } finally {
          setIsProcessing(false);
        }
      },
      'plain-text',
    );
    // Android fallback — Alert.prompt is iOS-only
    if (!Alert.prompt) {
      Alert.alert(
        'Reject Vendor',
        'Use the web dashboard to enter a rejection reason (not available on Android).',
      );
    }
  };

  const handleStartInspection = async (inspectionId: string) => {
    setIsProcessing(true);
    try {
      await qcCheckerService.startInspection(inspectionId);
      Alert.alert('Inspection Started', 'Status is now In Progress');
      fetchDetails();
    } catch {
      Alert.alert(
        'Error',
        'Failed to start inspection. Ensure it has not been completed.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-slate-600">Loading vendor details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header onBack={() => router.back()} title="Vendor Details" />
        <View className="flex-1 items-center justify-center px-8">
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
            onPress={fetchDetails}
            activeOpacity={0.85}
            className="flex-row items-center bg-blue-600 rounded-xl px-6 py-3"
          >
            <RefreshCw size={18} color="#ffffff" />
            <Text className="text-white font-bold text-base ml-2">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const companyName = fullVendor?.companyName || name || 'Vendor';
  const location = [fullVendor?.factoryCity, fullVendor?.factoryState]
    .filter(Boolean)
    .join(', ');
  const specializations: string[] = fullVendor?.specializations || [];
  const productCategories: string[] = fullVendor?.productCategories || [];
  const certifications: any[] = fullVendor?.certifications || [];
  const paymentTerms: string[] = fullVendor?.paymentTerms || [];
  const statusPill = getStatusColor(fullVendor?.status || 'active');

  return (
    <View className="flex-1 bg-gray-50">
      <Header onBack={() => router.back()} title="Vendor Details" />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
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
        {/* Status + QC badge row */}
        <View className="flex-row flex-wrap mb-4" style={{ columnGap: 8, rowGap: 8 }}>
          <View
            className={`px-3 py-1 rounded-full border ${statusPill.bg} ${statusPill.border}`}
          >
            <Text className={`text-xs font-semibold capitalize ${statusPill.text}`}>
              {(fullVendor?.status || '').toString().replace(/_/g, ' ').toLowerCase()}
            </Text>
          </View>
          {fullVendor?.assignedQc?.name ? (
            <View className="px-3 py-1 rounded-full border bg-slate-100 border-slate-200">
              <Text className="text-xs font-medium text-slate-700">
                QC: {fullVendor.assignedQc.name}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Blue summary card */}
        <View className="rounded-2xl p-5 mb-6" style={{ backgroundColor: '#2563eb' }}>
          <SummaryRow
            icon={<Factory size={18} color="#ffffff" />}
            label="Vendor"
            value={companyName}
          />
          <SummaryRow
            icon={<MapPin size={18} color="#ffffff" />}
            label="Location"
            value={location || '—'}
          />
          <SummaryRow
            icon={<Calendar size={18} color="#ffffff" />}
            label="Last PO"
            value={
              stats?.lastPoDate
                ? new Date(stats.lastPoDate).toLocaleDateString()
                : 'No PO yet'
            }
          />
          <SummaryRow
            icon={<TrendingUp size={18} color="#ffffff" />}
            label="Pass Rate"
            value={`${stats?.passRate ?? 0}%`}
            isLast
          />
        </View>

        {/* Action buttons */}
        {(isActionable || actualUpcomingInspections.length > 0) && (
          <View className="mb-6" style={{ rowGap: 8 }}>
            {isActionable ? (
              <View className="flex-row" style={{ columnGap: 8 }}>
                <TouchableOpacity
                  onPress={handleApprove}
                  disabled={isProcessing}
                  activeOpacity={0.85}
                  className="flex-1 flex-row items-center justify-center bg-emerald-600 rounded-xl py-3"
                  style={{ opacity: isProcessing ? 0.5 : 1 }}
                >
                  <ThumbsUp size={16} color="#ffffff" />
                  <Text className="text-white font-semibold ml-2">Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleReject}
                  disabled={isProcessing}
                  activeOpacity={0.85}
                  className="flex-1 flex-row items-center justify-center bg-red-600 rounded-xl py-3"
                  style={{ opacity: isProcessing ? 0.5 : 1 }}
                >
                  <ThumbsDown size={16} color="#ffffff" />
                  <Text className="text-white font-semibold ml-2">Reject</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {actualUpcomingInspections.length > 0 ? (
              <TouchableOpacity
                onPress={() =>
                  handleStartInspection(actualUpcomingInspections[0].id)
                }
                disabled={isProcessing}
                activeOpacity={0.85}
                className="flex-row items-center justify-center bg-blue-600 rounded-xl py-3"
                style={{ opacity: isProcessing ? 0.5 : 1 }}
              >
                <Play size={16} color="#ffffff" />
                <Text className="text-white font-semibold ml-2">
                  Start Now ({actualUpcomingInspections[0].poNumber})
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-5"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
              className={`mr-2 px-4 py-2 rounded-full border ${
                activeTab === tab.id
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab.id ? 'text-white' : 'text-slate-700'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeTab === 'overview' ? (
          <View style={{ rowGap: 16 }}>
            <Section icon={<Briefcase size={18} color="#2563eb" />} title="Company Information">
              <Field label="Company Name" value={companyName} />
              <Field label="Company Type" value={fullVendor?.companyType} />
              <Field label="Vendor Type" value={fullVendor?.vendorType} />
              <Field label="Established" value={fullVendor?.establishedYear} />
              <Field label="GST Number" value={fullVendor?.gstNumber} />
              <Field label="Annual Turnover" value={fullVendor?.annualTurnover} />
              {fullVendor?.website ? (
                <View className="mb-3">
                  <Text className="text-xs font-medium text-slate-600 mb-0.5">
                    Website
                  </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(fullVendor.website)}
                    className="flex-row items-center"
                  >
                    <Globe size={14} color="#2563eb" />
                    <Text className="text-sm text-blue-600 ml-1.5 underline" numberOfLines={1}>
                      {fullVendor.website}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {fullVendor?.companyDescription ? (
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-0.5">
                    Description
                  </Text>
                  <Text className="text-sm text-slate-900">
                    {fullVendor.companyDescription}
                  </Text>
                </View>
              ) : null}
            </Section>

            <Section icon={<Phone size={18} color="#2563eb" />} title="Contact Information">
              <View className="mb-3">
                <Text className="text-xs font-medium text-slate-600 mb-1">
                  Primary Contact
                </Text>
                <Text className="text-sm font-semibold text-slate-900">
                  {fullVendor?.ownerName || '—'}
                </Text>
                <Text className="text-xs text-slate-600">Owner</Text>
                <View className="flex-row flex-wrap mt-2" style={{ columnGap: 12, rowGap: 6 }}>
                  {fullVendor?.businessPhone ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${fullVendor.businessPhone}`)}
                      className="flex-row items-center"
                    >
                      <Phone size={14} color="#475569" />
                      <Text className="text-sm text-slate-700 ml-1.5">
                        {fullVendor.businessPhone}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {fullVendor?.businessEmail ? (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(`mailto:${fullVendor.businessEmail}`)
                      }
                      className="flex-row items-center"
                    >
                      <Mail size={14} color="#475569" />
                      <Text className="text-sm text-slate-700 ml-1.5">
                        {fullVendor.businessEmail}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {fullVendor?.businessAddress ? (
                <View className="mb-3">
                  <Text className="text-xs font-medium text-slate-600 mb-0.5">
                    Business Address
                  </Text>
                  <Text className="text-sm text-slate-700">
                    {[
                      fullVendor.businessAddress,
                      fullVendor.businessCity,
                      fullVendor.businessState,
                      fullVendor.businessZipCode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              ) : null}

              {fullVendor?.factoryAddress ? (
                <View className="mb-3">
                  <View className="flex-row items-center mb-0.5">
                    <Factory size={14} color="#64748b" />
                    <Text className="text-xs font-medium text-slate-600 ml-1">
                      Factory
                    </Text>
                  </View>
                  <Text className="text-sm text-slate-700">
                    {[
                      fullVendor.factoryAddress,
                      fullVendor.factoryCity,
                      fullVendor.factoryState,
                      fullVendor.factoryZipCode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                  {fullVendor.factorySize ? (
                    <Text className="text-xs text-slate-500 mt-0.5">
                      Size: {fullVendor.factorySize}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {fullVendor?.warehouseAddress ? (
                <View>
                  <View className="flex-row items-center mb-0.5">
                    <Warehouse size={14} color="#64748b" />
                    <Text className="text-xs font-medium text-slate-600 ml-1">
                      Warehouse
                    </Text>
                  </View>
                  <Text className="text-sm text-slate-700">
                    {[
                      fullVendor.warehouseAddress,
                      fullVendor.warehouseCity,
                      fullVendor.warehouseState,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              ) : null}
            </Section>

            <Section
              icon={<Package size={18} color="#2563eb" />}
              title="Capabilities & Products"
            >
              <Field label="Production Capacity" value={fullVendor?.productionCapacity} />
              <Field label="Minimum Order Quantity" value={fullVendor?.minimumOrderQuantity} />
              <Field label="Delivery Time" value={fullVendor?.deliveryTime} />
              <Field label="Quality Control" value={fullVendor?.qualityControl} />

              {productCategories.length > 0 ? (
                <View className="mb-3">
                  <Text className="text-xs font-medium text-slate-600 mb-2">
                    Product Categories
                  </Text>
                  <View className="flex-row flex-wrap">
                    {productCategories.map((c, i) => (
                      <Chip key={i} label={c} variant="blue" />
                    ))}
                  </View>
                </View>
              ) : null}

              {specializations.length > 0 ? (
                <View className="mb-3">
                  <Text className="text-xs font-medium text-slate-600 mb-2">
                    Specializations
                  </Text>
                  <View className="flex-row flex-wrap">
                    {specializations.map((s, i) => (
                      <Chip key={i} label={s} variant="purple" />
                    ))}
                  </View>
                </View>
              ) : null}

              {paymentTerms.length > 0 ? (
                <View className="mb-3">
                  <Text className="text-xs font-medium text-slate-600 mb-2">
                    Payment Terms
                  </Text>
                  <View className="flex-row flex-wrap">
                    {paymentTerms.map((t, i) => (
                      <Chip key={i} label={t} variant="slate" />
                    ))}
                  </View>
                </View>
              ) : null}

              {certifications.length > 0 ? (
                <View>
                  <View className="flex-row items-center mb-2">
                    <Award size={14} color="#64748b" />
                    <Text className="text-xs font-medium text-slate-600 ml-1">
                      Certifications
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap">
                    {certifications.map((c: any, i: number) => (
                      <Chip
                        key={i}
                        label={`${c.name}${c.issuedBy ? ` — ${c.issuedBy}` : ''}`}
                        variant="green"
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </Section>
          </View>
        ) : null}

        {activeTab === 'history' ? (
          <Section
            icon={<FileText size={18} color="#2563eb" />}
            title="Recent Inspection History"
          >
            {recentInspections.length > 0 ? (
              <View style={{ rowGap: 12 }}>
                {recentInspections.map((insp: any) => {
                  const resultPill = getStatusColor(insp.result || '');
                  return (
                    <View
                      key={insp.id}
                      className="border border-slate-200 rounded-lg p-3"
                    >
                      <View className="flex-row items-center justify-between mb-2 flex-wrap" style={{ rowGap: 6 }}>
                        <View className="flex-row items-center flex-1 mr-2">
                          <View className="bg-blue-50 border border-blue-200 rounded px-2 py-0.5 mr-2">
                            <Text className="text-xs font-mono text-blue-600">
                              {insp.poNumber}
                            </Text>
                          </View>
                          <Text className="text-sm font-medium text-slate-900 flex-1" numberOfLines={1}>
                            {insp.clientName}
                          </Text>
                        </View>
                        {insp.result ? (
                          <View
                            className={`px-2 py-0.5 rounded-full border ${resultPill.bg} ${resultPill.border}`}
                          >
                            <Text className={`text-[10px] font-bold capitalize ${resultPill.text}`}>
                              {insp.result.replace(/_/g, ' ').toLowerCase()}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View className="flex-row flex-wrap" style={{ columnGap: 12, rowGap: 4 }}>
                        <Text className="text-xs text-slate-600">
                          Scheduled: {insp.scheduledDate}
                        </Text>
                        {insp.completedAt ? (
                          <Text className="text-xs text-slate-600">
                            Completed: {new Date(insp.completedAt).toLocaleDateString()}
                          </Text>
                        ) : null}
                        {typeof insp.score === 'number' ? (
                          <Text className="text-xs text-slate-600">
                            Score:{' '}
                            <Text className="font-semibold text-slate-900">
                              {insp.score}/10
                            </Text>
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <EmptyState icon={<FileText size={28} color="#64748b" />} text="No completed inspections yet." />
            )}
          </Section>
        ) : null}

        {activeTab === 'upcoming' ? (
          <Section
            icon={<Calendar size={18} color="#2563eb" />}
            title="Upcoming Inspections"
          >
            {actualUpcomingInspections.length > 0 ? (
              <View style={{ rowGap: 12 }}>
                {actualUpcomingInspections.map((insp: any) => {
                  const prio = getPriorityColor(insp.priority);
                  return (
                    <View
                      key={insp.id}
                      className="border border-slate-200 rounded-lg p-3"
                    >
                      <View className="flex-row items-center justify-between mb-2 flex-wrap" style={{ rowGap: 6 }}>
                        <View className="flex-row items-center flex-1 mr-2">
                          <View className="bg-blue-50 border border-blue-200 rounded px-2 py-0.5 mr-2">
                            <Text className="text-xs font-mono text-blue-600">
                              {insp.poNumber}
                            </Text>
                          </View>
                          <Text className="text-sm font-medium text-slate-900 flex-1" numberOfLines={1}>
                            {insp.clientName}
                          </Text>
                        </View>
                        {insp.priority ? (
                          <View
                            className={`px-2 py-0.5 rounded-full border ${prio.bg} ${prio.border}`}
                          >
                            <Text className={`text-[10px] font-bold uppercase ${prio.text}`}>
                              {insp.priority}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View className="flex-row items-center" style={{ columnGap: 16 }}>
                        <View className="flex-row items-center">
                          <Calendar size={12} color="#64748b" />
                          <Text className="text-xs text-slate-600 ml-1">
                            {insp.scheduledDate}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Clock size={12} color="#64748b" />
                          <Text className="text-xs text-slate-600 ml-1">
                            {insp.scheduledTime}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <EmptyState icon={<Calendar size={28} color="#64748b" />} text="No pending inspections found." />
            )}
          </Section>
        ) : null}

        {activeTab === 'performance' ? (
          <View className="flex-row flex-wrap justify-between">
            <PerfCard
              icon={<BarChart3 size={22} color="#2563eb" />}
              iconColor="#2563eb"
              bg="bg-blue-100"
              value={stats?.totalCompleted ?? 0}
              label="Total Inspections"
            />
            <PerfCard
              icon={<CheckCircle size={22} color="#059669" />}
              iconColor="#059669"
              bg="bg-green-100"
              value={`${stats?.passRate ?? 0}%`}
              label="Pass Rate"
            />
            <PerfCard
              icon={<TrendingUp size={22} color="#d97706" />}
              iconColor="#d97706"
              bg="bg-amber-100"
              value={`${stats?.averageScore ?? 0}/10`}
              label="Average Score"
            />
            <PerfCard
              icon={<Clock size={22} color="#7c3aed" />}
              iconColor="#7c3aed"
              bg="bg-purple-100"
              value={`${stats?.onTimeDelivery ?? 0}%`}
              label="On-Time Delivery"
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View className="bg-white border-b border-slate-200 px-4 py-3 flex-row items-center">
      <TouchableOpacity
        onPress={onBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={10}
        className="w-10 h-10 items-center justify-center rounded-full bg-slate-100 mr-3"
      >
        <ArrowLeft size={20} color="#0f172a" />
      </TouchableOpacity>
      <Text className="text-lg font-extrabold text-slate-900 flex-1">
        {title}
      </Text>
    </View>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-xl border border-slate-200 p-4">
      <View className="flex-row items-center mb-3">
        {icon}
        <Text className="text-base font-bold text-slate-900 ml-2">{title}</Text>
      </View>
      {children}
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

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="items-center py-8">
      <View className="w-14 h-14 rounded-full bg-slate-100 items-center justify-center mb-3">
        {icon}
      </View>
      <Text className="text-sm text-slate-500">{text}</Text>
    </View>
  );
}
