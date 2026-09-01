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
  Platform,
} from 'react-native';
import {
  Search,
  Factory,
  MapPin,
  CalendarDays,
  ArrowRight,
  Eye,
  AlertCircle,
  RefreshCw,
  X,
  SlidersHorizontal,
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { useDebounce } from '../../hooks/useDebounce';
import { router, useLocalSearchParams } from 'expo-router';
import DateRangeCalendar, { fmtDate } from '../../components/General/DateRangeCalendar';
import { AppText, Button } from '@/components/UI';
import { brand, colors, elevation } from '@/constants/design';

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
  { value: '', label: 'All Inspection Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Completed', label: 'Completed' },
];

const SORT_OPTIONS = [
  { value: 'assignedQcAt:desc', label: 'Newest assignment' },
  { value: 'assignedQcAt:asc', label: 'Oldest assignment' },
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

// Badge colours keyed by the derived inspection-status bucket (mirror web).
const INSPECTION_STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Pending: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  Submitted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  Completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};
const inspectionStatusStyle = (s?: string | null) =>
  INSPECTION_STATUS_STYLE[s || 'Pending'] || INSPECTION_STATUS_STYLE.Pending;

interface Vendor {
  id: string;
  // Real vendor code (VND-YYYY-NNNN). Null for vendors created before the code
  // generator existed — those fall back to the id-derived string below.
  vendorCode?: string | null;
  name: string;
  location: string;
  state?: string | null;
  assignedDate?: string;
  mainStatus: string;
  inspectionStatusBucket: string;
  createdAtRaw?: string;
  contactPerson: {
    name: string;
    phone: string;
    email: string;
  };
}

const formatLocation = (city?: string | null, state?: string | null) => {
  const parts = [city, state].map((p) => (p ?? '').trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Location not provided';
};

const transformVendor = (v: any): Vendor => {
  const latestInspection = v.inspections?.[0] ?? null;
  // Date used for the "Assigned Date" and date-range filter: assignedQcAt,
  // falling back to createdAt for older records (mirrors web).
  const dateObj = v.assignedQcAt
    ? new Date(v.assignedQcAt)
    : v.createdAt
      ? new Date(v.createdAt)
      : null;
  const validDate = dateObj && !isNaN(dateObj.getTime()) ? dateObj : null;
  const createdAtRaw = validDate ? fmtDate(validDate) : undefined;
  const assignedDate = validDate
    ? validDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : undefined;
  return {
    id: v.id,
    vendorCode: v.vendorCode ?? null,
    name: v.companyName,
    location: formatLocation(v.factoryCity, v.factoryState),
    state: v.factoryState || null,
    assignedDate,
    mainStatus: getNewMainStatus(v.status, latestInspection),
    inspectionStatusBucket: getNewInspectionStatus(v.status, latestInspection),
    createdAtRaw,
    contactPerson: {
      name: v.ownerName || 'Not Provided',
      phone: v.businessPhone || 'Not Provided',
      email: v.businessEmail || 'Not Provided',
    },
  };
};

export default function VendorsTab() {
  // Incoming filter params from dashboard KPI navigation.
  const incoming = useLocalSearchParams<{
    status?: string;
    inspectionStatus?: string;
    state?: string;
    sort?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>();

  const [searchInput, setSearchInput] = useState(incoming.search ?? '');
  const [status, setStatus] = useState(incoming.status ?? '');
  const [inspectionStatus, setInspectionStatus] = useState(incoming.inspectionStatus ?? '');
  const [selectedState, setSelectedState] = useState(incoming.state ?? '');
  const [sort, setSort] = useState(incoming.sort ?? DEFAULT_SORT);
  const [dateFrom, setDateFrom] = useState(incoming.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(incoming.dateTo ?? '');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchInput, 300);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bottom sheet filter modal — every filter is edited as a draft and only
  // committed on Apply, so half-set criteria never refetch the list.
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftInspectionStatus, setDraftInspectionStatus] = useState(inspectionStatus);
  const [draftState, setDraftState] = useState(selectedState);
  const [draftSort, setDraftSort] = useState(sort);
  const [draftDateFrom, setDraftDateFrom] = useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(dateTo);

  const openFilterSheet = () => {
    setDraftStatus(status);
    setDraftInspectionStatus(inspectionStatus);
    setDraftState(selectedState);
    setDraftSort(sort);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setShowFilterSheet(true);
  };

  const draftActiveCount = useMemo(() => {
    let n = 0;
    if (draftStatus) n += 1;
    if (draftInspectionStatus) n += 1;
    if (draftState) n += 1;
    if (draftSort !== DEFAULT_SORT) n += 1;
    if (draftDateFrom) n += 1;
    return n;
  }, [draftStatus, draftInspectionStatus, draftState, draftSort, draftDateFrom]);

  const resetDraft = () => {
    setDraftStatus('');
    setDraftInspectionStatus('');
    setDraftState('');
    setDraftSort(DEFAULT_SORT);
    setDraftDateFrom('');
    setDraftDateTo('');
  };

  const applyFilters = () => {
    setStatus(draftStatus);
    setInspectionStatus(draftInspectionStatus);
    setSelectedState(draftState);
    setSort(draftSort);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setPage(1);
    setShowFilterSheet(false);
  };

  // Apply incoming params once when they change (deep-link from dashboard).
  useEffect(() => {
    if (incoming.status !== undefined) setStatus(incoming.status ?? '');
    if (incoming.inspectionStatus !== undefined) setInspectionStatus(incoming.inspectionStatus ?? '');
    if (incoming.state !== undefined) setSelectedState(incoming.state ?? '');
    if (incoming.sort !== undefined) setSort(incoming.sort ?? DEFAULT_SORT);
    if (incoming.search !== undefined) setSearchInput(incoming.search ?? '');
    if (incoming.dateFrom !== undefined) setDateFrom(incoming.dateFrom ?? '');
    if (incoming.dateTo !== undefined) setDateTo(incoming.dateTo ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming.status, incoming.inspectionStatus, incoming.state, incoming.sort, incoming.search, incoming.dateFrom, incoming.dateTo]);

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    setPage(1);
  }, [debouncedSearch, status, inspectionStatus, selectedState, sort, dateFrom, dateTo]);

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

  // State filter options derived from the loaded vendors (mirror web; a
  // vendor-derived list stands in for country-state-city's IN states).
  const stateOptions = useMemo(() => {
    const uniqueVendorStates = Array.from(
      new Set(vendors.map((v) => v.state).filter(Boolean)),
    ) as string[];
    uniqueVendorStates.sort((a, b) => a.localeCompare(b));
    return [
      { value: '', label: 'All States' },
      ...uniqueVendorStates.map((s) => ({ value: s, label: s })),
    ];
  }, [vendors]);

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
    if (selectedState) {
      result = result.filter((v) => v.state?.toLowerCase() === selectedState.toLowerCase());
    }
    if (dateFrom) {
      result = result.filter((v) => {
        if (!v.createdAtRaw) return false;
        if (dateTo) return v.createdAtRaw >= dateFrom && v.createdAtRaw <= dateTo;
        return v.createdAtRaw === dateFrom;
      });
    }
    return result;
  }, [vendors, status, inspectionStatus, selectedState, dateFrom, dateTo]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilters = Boolean(
    debouncedSearch || status || inspectionStatus || selectedState || dateFrom || dateTo || sort !== DEFAULT_SORT || page !== 1,
  );
  // Badge count covers only the sheet's own criteria — search has its own
  // visible field and clear button, so counting it would double-report.
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (status) n += 1;
    if (inspectionStatus) n += 1;
    if (selectedState) n += 1;
    if (sort !== DEFAULT_SORT) n += 1;
    if (dateFrom) n += 1;
    return n;
  }, [status, inspectionStatus, selectedState, sort, dateFrom]);

  const clearFilters = () => {
    setSearchInput('');
    setStatus('');
    setInspectionStatus('');
    setSelectedState('');
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

  return (
    <View className="flex-1 bg-gray-50">
      {/* Title */}
      <View className="px-4 pt-4 pb-2 bg-gray-50 flex-row items-start justify-between">
        <View className="flex-1">
          <AppText variant="headlineLg" color={colors.text}>Vendor Management</AppText>
          <AppText variant="bodySm" color={colors.textSecondary} style={{ marginTop: 2 }}>
            Select a vendor to start quality inspection
          </AppText>
        </View>
      </View>

      {/* Search + Filter trigger */}
      <View className="px-4 pb-3 bg-gray-50 flex-row items-center" style={{ columnGap: 8 }}>
        <View className="flex-1 flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3">
          <Search size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search by name, vendor ID, city, or state..."
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
        <TouchableOpacity
          onPress={openFilterSheet}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          className="w-12 h-12 rounded-xl bg-brand-500 items-center justify-center"
          style={elevation.card}
        >
          <SlidersHorizontal size={18} color="#ffffff" />
          {activeFilterCount > 0 ? (
            // White-on-red now that the button itself is brand red — a red
            // badge on a red button reads as one solid blob.
            <View className="absolute -top-1 -right-1 min-w-[18px] min-h-[18px] px-1 rounded-full bg-white border border-brand-600 items-center justify-center">
              <Text className="text-[10px] font-bold text-brand-600">{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {hasActiveFilters ? (
        <View className="px-4 pb-2 -mt-1 flex-row justify-end">
          <TouchableOpacity onPress={clearFilters}>
            <Text className="text-xs font-semibold text-brand-600 underline">Clear filters</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand[500]} colors={[brand[500]]} />
        }
      >
        {/* Error */}
        {error && !loading ? (
          <View className="bg-danger-50 border border-red-200 rounded-2xl p-4 mb-4" style={elevation.card}>
            <View className="flex-row items-center mb-3">
              <View className="w-9 h-9 rounded-full bg-red-100 items-center justify-center mr-2.5">
                <AlertCircle size={18} color="#dc2626" />
              </View>
              <AppText variant="bodySm" color="#b91c1c" className="flex-1">{error}</AppText>
            </View>
            <Button label="Retry" icon={RefreshCw} variant="primary" onPress={loadVendors} />
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
              const inspPill = inspectionStatusStyle(v.inspectionStatusBucket);
              // A checker-rejected/submitted inspection is submitted work — the
              // checker can't start again unless the admin orders a re-inspection
              // (mirrors web's derived-bucket gating).
              const isInspectionDone =
                v.inspectionStatusBucket === 'Completed' ||
                v.inspectionStatusBucket === 'Submitted' ||
                v.inspectionStatusBucket === 'Rejected' ||
                v.mainStatus === 'Approved' ||
                v.mainStatus === 'Rejected';
              return (
                <View
                  key={v.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5"
                  style={elevation.card}
                >
                  <View className="flex-row items-start justify-between mb-3" style={{ columnGap: 8 }}>
                    <View className="flex-row items-center flex-1">
                      <View className="w-11 h-11 rounded-xl bg-brand-50 items-center justify-center mr-3">
                        <Factory size={20} color={brand[500]} strokeWidth={2} />
                      </View>
                      <View className="flex-1">
                        <AppText variant="titleLg" color={colors.text} numberOfLines={2}>
                          {v.name}
                        </AppText>
                        <Text className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">
                          {v.vendorCode || `VND-${v.id.substring(0, 8).toUpperCase()}`}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end" style={{ rowGap: 4 }}>
                      <View className={`px-2.5 py-1 rounded-full border ${pill.bg} ${pill.border}`}>
                        <Text className={`text-[10px] font-bold ${pill.text}`} numberOfLines={1}>
                          {v.mainStatus}
                        </Text>
                      </View>
                      <View className={`px-2.5 py-1 rounded-full border ${inspPill.bg} ${inspPill.border}`}>
                        <Text className={`text-[10px] font-bold ${inspPill.text}`} numberOfLines={1}>
                          {v.inspectionStatusBucket || 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="mb-4" style={{ rowGap: 8 }}>
                    <View className="flex-row items-center">
                      <User size={13} color="#64748b" />
                      <AppText variant="bodySm" color={colors.text} className="ml-2 flex-1" numberOfLines={1}>
                        {v.contactPerson.name}
                      </AppText>
                    </View>
                    <View className="flex-row items-center">
                      <Mail size={13} color="#64748b" />
                      <AppText variant="bodySm" color={colors.textSecondary} className="ml-2 flex-1" numberOfLines={1}>
                        {v.contactPerson.email}
                      </AppText>
                    </View>
                    <View className="flex-row items-center">
                      <Phone size={13} color="#64748b" />
                      <AppText variant="bodySm" color={colors.textSecondary} className="ml-2 flex-1" numberOfLines={1}>
                        {v.contactPerson.phone}
                      </AppText>
                    </View>
                    <View className="flex-row items-center">
                      <MapPin size={13} color="#64748b" />
                      <AppText variant="bodySm" color={colors.textSecondary} className="ml-2 flex-1" numberOfLines={1}>
                        {v.location}
                      </AppText>
                    </View>
                    <View className="flex-row items-center">
                      <CalendarDays size={13} color="#64748b" />
                      <AppText variant="bodySm" color={colors.textSecondary} className="ml-2 flex-1" numberOfLines={1}>
                        {v.assignedDate || 'N/A'}
                      </AppText>
                    </View>
                  </View>

                  <View className="flex-row" style={{ columnGap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleViewDetails(v)}
                      activeOpacity={0.8}
                      accessibilityLabel="View Details"
                      className="w-12 items-center justify-center bg-slate-100 rounded-lg py-2.5"
                    >
                      <Eye size={16} color="#475569" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleStartInspection(v)}
                      disabled={isInspectionDone}
                      activeOpacity={0.85}
                      className="flex-1 flex-row items-center justify-center bg-brand-500 rounded-lg py-2.5"
                      style={{ opacity: isInspectionDone ? 0.5 : 1 }}
                    >
                      <ArrowRight size={14} color="#ffffff" />
                      <AppText variant="titleMd" color={colors.white} className="ml-1.5">
                        Start Inspect
                      </AppText>
                    </TouchableOpacity>
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
            <AppText variant="titleLg" color={colors.text} style={{ marginBottom: 4, textAlign: 'center' }}>
              {hasActiveFilters ? 'No vendors match your filters' : 'No vendors assigned yet'}
            </AppText>
            <AppText variant="bodySm" color={colors.textMuted} style={{ textAlign: 'center', marginBottom: 16 }}>
              {hasActiveFilters
                ? 'Try adjusting or clearing your filters.'
                : 'Vendors assigned to you by the admin will appear here.'}
            </AppText>
            {hasActiveFilters ? (
              <Button label="Clear filters" variant="primary" onPress={clearFilters} style={{ alignSelf: 'center' }} />
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
      </ScrollView>

      {/* Bottom sheet filter modal */}
      <Modal visible={showFilterSheet} transparent animationType="slide" onRequestClose={() => setShowFilterSheet(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowFilterSheet(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '85%' }}>
            {/* Drag handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1.5 rounded-full bg-slate-200" />
            </View>

            {/* Header: Reset / Filters / Close */}
            <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
              <TouchableOpacity onPress={resetDraft} hitSlop={8}>
                <Text className="text-sm font-bold text-red-500">Reset</Text>
              </TouchableOpacity>
              <Text className="text-base font-extrabold text-slate-900">Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterSheet(false)} hitSlop={8}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Date range */}
              <Text className="text-sm font-bold text-slate-900 mb-2">Date range</Text>
              <View className="mb-5">
                <DateRangeCalendar
                  from={draftDateFrom}
                  to={draftDateTo}
                  onChange={(f, t) => { setDraftDateFrom(f); setDraftDateTo(t); }}
                  placeholder="Filter by date"
                />
              </View>

              {/* Vendor status */}
              <Text className="text-sm font-bold text-slate-900 mb-2">Vendor status</Text>
              <FilterChips options={STATUS_OPTIONS} value={draftStatus} onSelect={setDraftStatus} />

              {/* Inspection status */}
              <Text className="text-sm font-bold text-slate-900 mb-2">Inspection status</Text>
              <FilterChips
                options={INSPECTION_STATUS_OPTIONS}
                value={draftInspectionStatus}
                onSelect={setDraftInspectionStatus}
              />

              {/* State — derived from the assigned vendors, so it is only worth
                  showing once more than the "All States" placeholder exists. */}
              {stateOptions.length > 1 ? (
                <>
                  <Text className="text-sm font-bold text-slate-900 mb-2">State</Text>
                  <FilterChips options={stateOptions} value={draftState} onSelect={setDraftState} />
                </>
              ) : null}

              {/* Sort by */}
              <Text className="text-sm font-bold text-slate-900 mb-2">Sort by</Text>
              <FilterChips options={SORT_OPTIONS} value={draftSort} onSelect={setDraftSort} last />
            </ScrollView>

            {/* Fixed bottom actions */}
            <View className="px-5 pt-3" style={{ paddingBottom: Platform.OS === 'ios' ? 28 : 18 }}>
              <TouchableOpacity
                onPress={resetDraft}
                activeOpacity={0.85}
                className="w-full items-center justify-center bg-white border border-slate-200 rounded-xl py-3.5 mb-2.5"
              >
                <Text className="text-sm font-bold text-slate-700">Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyFilters}
                activeOpacity={0.9}
                className="w-full items-center justify-center bg-brand-500 rounded-xl py-3.5"
              >
                <Text className="text-sm font-extrabold text-white">
                  Apply{draftActiveCount > 0 ? ` (${draftActiveCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Wrapping row of selectable pills. Vendors has four filter dimensions to the
 * products page's two, so the chip markup is factored out rather than repeated.
 */
function FilterChips({
  options,
  value,
  onSelect,
  last = false,
}: {
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  /** Tighter bottom margin for the final group in the sheet. */
  last?: boolean;
}) {
  return (
    <View className={`flex-row flex-wrap ${last ? 'mb-2' : 'mb-5'}`} style={{ columnGap: 8, rowGap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value || 'all'}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`flex-row items-center px-4 py-2.5 rounded-full border ${
              active ? 'bg-brand-500 border-brand-500' : 'bg-white border-slate-200'
            }`}
          >
            {active ? <Check size={13} color="#ffffff" style={{ marginRight: 6 }} /> : null}
            <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-500'}`}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
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
        <AppText variant="labelLg" color={colors.textSecondary} className="ml-1">Prev</AppText>
      </TouchableOpacity>
      {pages.map((p, i) =>
        p === '…' ? (
          <AppText key={`el-${i}`} variant="bodyMd" color={colors.textFaint} className="px-2">…</AppText>
        ) : (
          <TouchableOpacity
            key={p}
            onPress={() => onChange(p)}
            disabled={disabled}
            className={`min-w-9 px-3 py-2 rounded-lg border ${
              p === page ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-200'
            }`}
            style={{ opacity: disabled ? 0.4 : 1 }}
          >
            <AppText
              variant="labelLg"
              color={p === page ? colors.white : colors.textSecondary}
              style={{ textAlign: 'center' }}
            >
              {p}
            </AppText>
          </TouchableOpacity>
        ),
      )}
      <TouchableOpacity
        onPress={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        className="flex-row items-center px-3 py-2 rounded-lg border border-slate-200 bg-white"
        style={{ opacity: disabled || page >= totalPages ? 0.4 : 1 }}
      >
        <AppText variant="labelLg" color={colors.textSecondary} className="mr-1">Next</AppText>
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
