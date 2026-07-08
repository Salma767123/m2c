import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  Search,
  Factory,
  MapPin,
  CalendarDays,
  ArrowRight,
  Eye,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { useDebounce } from '../../hooks/useDebounce';
import { router, useLocalSearchParams } from 'expo-router';
import DateRangeCalendar, { fmtDate } from '../../components/General/DateRangeCalendar';

const PAGE_SIZE = 12;
const DEFAULT_SORT = 'assignedQcAt:desc';

// ── Status tabs (mirror web VendorList) ──────────────────────────────────────
// These are the human-facing "main status" values derived from the raw DB
// status + latest inspection. Filtering is done client-side.
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'New Assignment', label: 'New Assignment' },
  { value: 'Under Review by Admin', label: 'Under Review by Admin' },
  { value: 'Re-Inspection', label: 'Re-Inspection' },
  { value: 'Re-Inspection Under Review by Admin', label: 'Re-Inspection Under Review' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
];

const INSPECTION_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Completed', label: 'Completed' },
];

const SORT_OPTIONS = [
  { value: 'assignedQcAt:desc', label: 'Newest assignment' },
  { value: 'assignedQcAt:asc', label: 'Oldest assignment' },
  { value: 'submittedAt:desc', label: 'Newest submission' },
  { value: 'submittedAt:asc', label: 'Oldest submission' },
];

// Map the human-facing tab value back to the backend status filter the server
// understands. Re-Inspection returns '' so we fetch everything and let the
// client-side derivation narrow it down (mirrors web getBackendStatus).
const getBackendStatus = (tabValue: string): string => {
  switch (tabValue) {
    case 'New Assignment':
    case 'Under Review by Admin':
    case 'Re-Inspection Under Review by Admin':
      return 'UNDER_REVIEW';
    case 'Re-Inspection':
      return '';
    case 'Approved':
      return 'APPROVED';
    case 'Rejected':
      return 'REJECTED';
    default:
      return '';
  }
};

// Derive the human-facing "main status" (mirrors web getNewMainStatus).
function getNewMainStatus(
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

// Derive the "inspection status" bucket (mirrors web getNewInspectionStatus).
function getNewInspectionStatus(
  dbStatus: string,
  latestInspection?: { status?: string | null; result?: string | null } | null,
): string {
  const status = dbStatus?.toUpperCase() || 'PENDING';
  if (status === 'APPROVED') return 'Completed';
  if (status === 'REJECTED') {
    if (latestInspection && latestInspection.result?.toUpperCase() === 'FAILED') return 'Rejected';
    return 'Completed';
  }
  if (status === 'REINSPECTION') return 'Pending';
  if (status === 'UNDER_REVIEW') {
    if (latestInspection) {
      const inspStatus = latestInspection.status?.toUpperCase();
      if (inspStatus === 'SCHEDULED' || inspStatus === 'IN_PROGRESS') return 'Pending';
      if (inspStatus === 'SUBMITTED' || inspStatus === 'UNDER_ADMIN_REVIEW') {
        if (latestInspection.result?.toUpperCase() === 'FAILED') return 'Rejected';
        return 'Submitted';
      }
    }
    return 'Pending';
  }
  if (status === 'PENDING') return 'Pending';
  return 'Pending';
}

// Badge colours keyed by the derived main status (mirror web colour map).
const MAIN_STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  'New Assignment': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Under Review by Admin': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Re-Inspection': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Re-Inspection Under Review by Admin': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};
const mainStatusStyle = (s: string) =>
  MAIN_STATUS_STYLE[s] || { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };

const INSPECTION_PRIORITY = ['IN_PROGRESS', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;

interface Vendor {
  id: string;
  name: string;
  location: string;
  submittedDate?: string;
  mainStatus: string;
  inspectionStatusBucket: string;
  createdAtRaw?: string;
  inspectionStatus: string | null;
}

const formatLocation = (city?: string | null, state?: string | null) => {
  const parts = [city, state].map((p) => (p ?? '').trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Location not provided';
};

const pickInspectionStatus = (insps?: Array<{ status?: string | null }>) => {
  if (!insps || insps.length === 0) return null;
  for (const target of INSPECTION_PRIORITY) {
    const hit = insps.find((i) => i.status === target);
    if (hit?.status) return hit.status;
  }
  return insps[0].status ?? null;
};

const transformVendor = (v: any): Vendor => {
  const latestInspection = v.inspections?.[0] ?? null;
  // Date used for the date-range filter: assignedQcAt, falling back to createdAt.
  const dateObj = v.assignedQcAt
    ? new Date(v.assignedQcAt)
    : v.createdAt
      ? new Date(v.createdAt)
      : null;
  const createdAtRaw = dateObj && !isNaN(dateObj.getTime()) ? fmtDate(dateObj) : undefined;
  return {
    id: v.id,
    name: v.companyName,
    location: formatLocation(v.factoryCity, v.factoryState),
    submittedDate: v.submittedAt
      ? new Date(v.submittedAt).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : undefined,
    mainStatus: getNewMainStatus(v.status, latestInspection),
    inspectionStatusBucket: getNewInspectionStatus(v.status, latestInspection),
    createdAtRaw,
    inspectionStatus: pickInspectionStatus(v.inspections),
  };
};

export default function VendorsTab() {
  // Incoming filter params from dashboard KPI navigation.
  const incoming = useLocalSearchParams<{
    status?: string;
    inspectionStatus?: string;
    sort?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>();

  const [searchInput, setSearchInput] = useState(incoming.search ?? '');
  const [status, setStatus] = useState(incoming.status ?? '');
  const [inspectionStatus, setInspectionStatus] = useState(incoming.inspectionStatus ?? '');
  const [sort, setSort] = useState(incoming.sort ?? DEFAULT_SORT);
  const [dateFrom, setDateFrom] = useState(incoming.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(incoming.dateTo ?? '');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchInput, 300);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Apply incoming params once when they change (deep-link from dashboard).
  useEffect(() => {
    if (incoming.status !== undefined) setStatus(incoming.status ?? '');
    if (incoming.inspectionStatus !== undefined) setInspectionStatus(incoming.inspectionStatus ?? '');
    if (incoming.sort !== undefined) setSort(incoming.sort ?? DEFAULT_SORT);
    if (incoming.search !== undefined) setSearchInput(incoming.search ?? '');
    if (incoming.dateFrom !== undefined) setDateFrom(incoming.dateFrom ?? '');
    if (incoming.dateTo !== undefined) setDateTo(incoming.dateTo ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming.status, incoming.inspectionStatus, incoming.sort, incoming.search, incoming.dateFrom, incoming.dateTo]);

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    setPage(1);
  }, [debouncedSearch, status, inspectionStatus, sort, dateFrom, dateTo]);

  const [sortBy, sortOrder] = useMemo(() => {
    const [by, ord] = sort.split(':');
    return [by || 'assignedQcAt', (ord as 'asc' | 'desc') || 'desc'];
  }, [sort]);

  const requestIdRef = useRef(0);

  const loadVendors = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setError(null);
    if (!refreshing) setLoading(true);
    try {
      // Fetch a wide page (client-side filters/derivation narrow it down, like web).
      const res = await qcCheckerService.getAssignedVendors({
        page: 1,
        limit: 200,
        search: debouncedSearch || undefined,
        status: getBackendStatus(status) || undefined,
        sortBy,
        sortOrder,
      });
      if (requestId !== requestIdRef.current) return;
      if (res.success) {
        setVendors((res.data.vendors || []).map(transformVendor));
      }
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setError(err?.message || 'Failed to fetch vendors');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, status, sortBy, sortOrder, refreshing]);

  // Refetch on focus so a returning checker (e.g. after a factory inspection
  // submit) always sees the latest vendor status.
  useFocusEffect(
    useCallback(() => {
      loadVendors();
    }, [loadVendors]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVendors();
  }, [loadVendors]);

  // ── Client-side filtering (mirror web VendorList) ──────────────────────────
  const filtered = useMemo(() => {
    let result = vendors;
    if (status) {
      result = result.filter((v) => v.mainStatus === status);
    }
    if (inspectionStatus) {
      result = result.filter(
        (v) => v.inspectionStatusBucket.toLowerCase() === inspectionStatus.toLowerCase(),
      );
    }
    if (dateFrom) {
      result = result.filter((v) => {
        if (!v.createdAtRaw) return false;
        if (dateTo) return v.createdAtRaw >= dateFrom && v.createdAtRaw <= dateTo;
        return v.createdAtRaw === dateFrom;
      });
    }
    return result;
  }, [vendors, status, inspectionStatus, dateFrom, dateTo]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  const hasActiveFilters = Boolean(
    debouncedSearch || status || inspectionStatus || dateFrom || dateTo || sort !== DEFAULT_SORT || page !== 1,
  );

  const clearFilters = () => {
    setSearchInput('');
    setStatus('');
    setInspectionStatus('');
    setSort(DEFAULT_SORT);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleViewDetails = (v: Vendor) => {
    router.push({ pathname: '/vendors/[id]' as any, params: { id: v.id, name: v.name } });
  };

  const handleStartInspection = (v: Vendor) => {
    router.push({ pathname: '/vendors/[id]/inspection' as any, params: { id: v.id, name: v.name } });
  };

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label || 'All Statuses';
  const inspectionLabel =
    INSPECTION_STATUS_OPTIONS.find((o) => o.value === inspectionStatus)?.label || 'All Statuses';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Newest assignment';

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" colors={['#2563eb']} />
      }
    >
      {/* Header */}
      <View className="mb-5">
        <Text className="text-2xl font-extrabold text-slate-900 mb-1">Vendor Management</Text>
        <Text className="text-slate-600 text-sm">Select a vendor to start quality inspection</Text>
      </View>

      {/* Search */}
      <View className="mb-3 flex-row items-center bg-white border border-slate-300 rounded-xl px-4 py-2.5">
        <Search size={18} color="#94a3b8" />
        <TextInput
          placeholder="Search by name, city, or state..."
          value={searchInput}
          onChangeText={setSearchInput}
          className="flex-1 ml-3 text-sm text-slate-900"
          placeholderTextColor="#94a3b8"
        />
        {searchInput ? (
          <TouchableOpacity onPress={() => setSearchInput('')} hitSlop={8}>
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status + Inspection Status */}
      <View className="flex-row mb-3" style={{ columnGap: 8 }}>
        <TouchableOpacity
          onPress={() => setShowStatusModal(true)}
          className="flex-1 flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5"
        >
          <Text className="text-sm text-slate-900" numberOfLines={1}>{statusLabel}</Text>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowInspectionModal(true)}
          className="flex-1 flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5"
        >
          <Text className="text-sm text-slate-900" numberOfLines={1}>{inspectionLabel}</Text>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Date range + Sort */}
      <View className="flex-row mb-4" style={{ columnGap: 8 }}>
        <View className="flex-1">
          <DateRangeCalendar
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
            placeholder="Filter by date"
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowSortModal(true)}
          className="flex-1 flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-3"
        >
          <Text className="text-sm text-slate-900" numberOfLines={1}>{sortLabel}</Text>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Summary + Clear */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xs text-slate-600">
          {loading && vendors.length === 0
            ? ''
            : total === 0
              ? '0 vendors'
              : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
        </Text>
        {hasActiveFilters ? (
          <TouchableOpacity onPress={clearFilters}>
            <Text className="text-xs font-semibold text-blue-600 underline">Clear filters</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Error */}
      {error && !loading ? (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <View className="flex-row items-start mb-3">
            <AlertCircle size={18} color="#dc2626" />
            <Text className="text-sm text-red-700 ml-2 flex-1">{error}</Text>
          </View>
          <TouchableOpacity
            onPress={loadVendors}
            className="bg-red-600 rounded-lg px-4 py-2 flex-row items-center justify-center self-start"
          >
            <RefreshCw size={14} color="#ffffff" />
            <Text className="text-white font-semibold text-sm ml-2">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Skeleton initial load */}
      {loading && vendors.length === 0 && !error ? (
        <View style={{ rowGap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 rounded-xl bg-slate-200" />
                <View className="flex-1 ml-3">
                  <View className="h-3 bg-slate-200 rounded w-3/4 mb-2" />
                  <View className="h-2 bg-slate-200 rounded w-1/2" />
                </View>
                <View className="h-5 w-16 bg-slate-200 rounded-full" />
              </View>
              <View className="h-2.5 bg-slate-200 rounded w-2/3 mb-2" />
              <View className="h-2.5 bg-slate-200 rounded w-1/2 mb-4" />
              <View className="flex-row" style={{ columnGap: 8 }}>
                <View className="flex-1 h-9 bg-slate-200 rounded-lg" />
                <View className="flex-1 h-9 bg-slate-200 rounded-lg" />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Vendor cards */}
      {!error && pageItems.length > 0 ? (
        <View style={{ rowGap: 12 }}>
          {pageItems.map((v) => {
            const pill = mainStatusStyle(v.mainStatus);
            const isCompleted = v.inspectionStatus === 'COMPLETED';
            const isCancelled = v.inspectionStatus === 'CANCELLED';
            const isInProgress = v.inspectionStatus === 'IN_PROGRESS';
            return (
              <View
                key={v.id}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                <View className="flex-row items-start justify-between mb-3" style={{ columnGap: 8 }}>
                  <View className="flex-row items-center flex-1">
                    <View className="w-11 h-11 rounded-xl bg-blue-100 items-center justify-center mr-3">
                      <Factory size={20} color="#2563eb" />
                    </View>
                    <Text className="font-bold text-slate-900 text-base flex-1" numberOfLines={2}>
                      {v.name}
                    </Text>
                  </View>
                  <View className={`px-2.5 py-1 rounded-full border ${pill.bg} ${pill.border}`}>
                    <Text className={`text-[10px] font-bold ${pill.text}`} numberOfLines={1}>
                      {v.mainStatus}
                    </Text>
                  </View>
                </View>

                <View className="mb-4" style={{ rowGap: 8 }}>
                  <View className="flex-row items-center">
                    <MapPin size={13} color="#64748b" />
                    <Text className="text-sm text-slate-600 ml-2 flex-1" numberOfLines={1}>
                      {v.location}
                    </Text>
                  </View>
                  {v.submittedDate ? (
                    <View className="flex-row items-center">
                      <CalendarDays size={13} color="#64748b" />
                      <View className="ml-2 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
                        <Text className="text-xs font-mono text-slate-600">
                          Submitted: {v.submittedDate}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View className="flex-row" style={{ columnGap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleViewDetails(v)}
                    activeOpacity={0.8}
                    className="flex-1 flex-row items-center justify-center bg-slate-100 rounded-lg py-2.5"
                  >
                    <Eye size={14} color="#475569" />
                    <Text className="text-slate-700 font-semibold text-sm ml-2">Details</Text>
                  </TouchableOpacity>

                  {isCompleted ? (
                    <View className="flex-1 flex-row items-center justify-center bg-emerald-100 border border-emerald-200 rounded-lg py-2.5">
                      <CheckCircle size={14} color="#065f46" />
                      <Text className="text-emerald-800 font-bold text-sm ml-2">Completed</Text>
                    </View>
                  ) : isCancelled ? (
                    <View className="flex-1 flex-row items-center justify-center bg-slate-100 border border-slate-200 rounded-lg py-2.5">
                      <X size={14} color="#64748b" />
                      <Text className="text-slate-700 font-bold text-sm ml-2">Cancelled</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleStartInspection(v)}
                      activeOpacity={0.85}
                      className="flex-1 flex-row items-center justify-center bg-blue-600 rounded-lg py-2.5"
                    >
                      <Text className="text-white font-semibold text-sm mr-1.5">
                        {isInProgress ? 'Continue' : 'Start'}
                      </Text>
                      <ArrowRight size={14} color="#ffffff" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Empty state */}
      {!loading && !error && total === 0 ? (
        <View className="py-12 items-center">
          <View className="w-20 h-20 rounded-2xl bg-slate-100 items-center justify-center mb-4">
            <Factory size={36} color="#94a3b8" strokeWidth={1.75} />
          </View>
          <Text className="text-base font-bold text-slate-900 mb-1 text-center">
            {hasActiveFilters ? 'No vendors match your filters' : 'No vendors assigned yet'}
          </Text>
          <Text className="text-sm text-slate-500 text-center mb-4">
            {hasActiveFilters
              ? 'Try adjusting or clearing your filters.'
              : 'Vendors assigned to you by the admin will appear here.'}
          </Text>
          {hasActiveFilters ? (
            <TouchableOpacity
              onPress={clearFilters}
              className="bg-blue-600 rounded-lg px-4 py-2.5"
            >
              <Text className="text-white font-semibold text-sm">Clear filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Pagination */}
      {totalPages > 1 ? (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={setPage}
          disabled={loading}
        />
      ) : null}

      {/* Status modal */}
      <OptionModal
        visible={showStatusModal}
        title="Filter by status"
        options={STATUS_OPTIONS}
        value={status}
        onSelect={(v) => { setStatus(v); setShowStatusModal(false); }}
        onClose={() => setShowStatusModal(false)}
      />

      {/* Inspection status modal */}
      <OptionModal
        visible={showInspectionModal}
        title="Inspection status"
        options={INSPECTION_STATUS_OPTIONS}
        value={inspectionStatus}
        onSelect={(v) => { setInspectionStatus(v); setShowInspectionModal(false); }}
        onClose={() => setShowInspectionModal(false)}
      />

      {/* Sort modal */}
      <OptionModal
        visible={showSortModal}
        title="Sort by"
        options={SORT_OPTIONS}
        value={sort}
        onSelect={(v) => { setSort(v); setShowSortModal(false); }}
        onClose={() => setShowSortModal(false)}
      />
    </ScrollView>
  );
}

function OptionModal({
  visible, title, options, value, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
      >
        <View className="bg-white rounded-2xl w-11/12 max-w-sm overflow-hidden">
          <View className="px-5 py-4 border-b border-slate-100">
            <Text className="text-base font-bold text-slate-900">{title}</Text>
          </View>
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onSelect(opt.value)}
                className={`px-5 py-3.5 flex-row items-center justify-between border-b border-slate-100 ${
                  active ? 'bg-blue-50' : ''
                }`}
              >
                <Text className={`text-sm ${active ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>
                  {opt.label}
                </Text>
                {active ? <CheckCircle size={16} color="#2563eb" /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function Pagination({
  page, totalPages, onChange, disabled,
}: {
  page: number; totalPages: number; onChange: (p: number) => void; disabled?: boolean;
}) {
  const pages = getPageRange(page, totalPages);
  return (
    <View className="mt-6 flex-row items-center justify-center flex-wrap" style={{ columnGap: 4, rowGap: 4 }}>
      <TouchableOpacity
        onPress={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        className="flex-row items-center px-3 py-2 rounded-lg border border-slate-200 bg-white"
        style={{ opacity: disabled || page <= 1 ? 0.4 : 1 }}
      >
        <ChevronLeft size={14} color="#475569" />
        <Text className="text-xs font-semibold text-slate-700 ml-1">Prev</Text>
      </TouchableOpacity>
      {pages.map((p, i) =>
        p === '…' ? (
          <Text key={`el-${i}`} className="px-2 text-slate-400">…</Text>
        ) : (
          <TouchableOpacity
            key={p}
            onPress={() => onChange(p)}
            disabled={disabled}
            className={`min-w-9 px-3 py-2 rounded-lg border ${
              p === page ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
            }`}
            style={{ opacity: disabled ? 0.4 : 1 }}
          >
            <Text className={`text-xs font-bold text-center ${p === page ? 'text-white' : 'text-slate-700'}`}>
              {p}
            </Text>
          </TouchableOpacity>
        ),
      )}
      <TouchableOpacity
        onPress={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        className="flex-row items-center px-3 py-2 rounded-lg border border-slate-200 bg-white"
        style={{ opacity: disabled || page >= totalPages ? 0.4 : 1 }}
      >
        <Text className="text-xs font-semibold text-slate-700 mr-1">Next</Text>
        <ChevronRight size={14} color="#475569" />
      </TouchableOpacity>
    </View>
  );
}

function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 3) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}
