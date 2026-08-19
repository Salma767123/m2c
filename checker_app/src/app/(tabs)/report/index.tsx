import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Modal,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Factory,
  Package,
  FileText,
  CalendarDays,
  MapPin,
  Video,
  SlidersHorizontal,
  Check,
} from 'lucide-react-native';
import qcCheckerService from '../../../services/qcCheckerService';
import { downloadProductReportPdf } from '@/lib/reportPdf';
import { showErrorToast } from '@/lib/toast-utils';
import { useDebounce } from '../../../hooks/useDebounce';
import DateRangeCalendar, { fmtDate } from '@/components/General/DateRangeCalendar';
import { AppText, StatusBadge } from '@/components/UI';
import { brand, colors, elevation } from '@/constants/design';

type Tab = 'factory' | 'product';
const PAGE_SIZE = 12;
const DEFAULT_SORT = 'completedAt:desc';

// Factory result-filter options — labels mirror web getResultBadge outcomes
// (values stay PASSED/FAILED so the request payload is unchanged).
const RESULT_OPTIONS = [
  { value: '', label: 'All results' },
  { value: 'PASSED', label: 'Approved' },
  { value: 'FAILED', label: 'Rejected' },
];

const SORT_OPTIONS = [
  { value: 'completedAt:desc', label: 'Latest first' },
  { value: 'completedAt:asc', label: 'Oldest first' },
];

const PRODUCT_DEFAULT_SORT = 'updatedAt:desc';

const PRODUCT_SORT_OPTIONS = [
  { value: 'updatedAt:desc', label: 'Latest first' },
  { value: 'updatedAt:asc', label: 'Oldest first' },
];

// Product status filter — labels match the web ProductReportsTab exactly.
const PRODUCT_STATUS_OPTIONS = [
  { value: '', label: 'All results' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

// Friendly product status label (mirrors web getStatusBadge).
const productStatusLabel = (status?: string) => {
  switch (status) {
    case 'QC_SUBMITTED':
      return 'Submitted';
    case 'QC_APPROVED':
      return 'Approved by QC';
    case 'APPROVED':
      return 'Approved by Admin';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status || '—';
  }
};

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('factory');

  // Collapsible search/filter section — toggled by the arrow next to the title
  // (ported from the vendor list). Shared across both tabs.
  return (
    <View className="flex-1 bg-gray-50">
      {/* Fixed page header + tab strip — stays put outside the scroll list */}
      <View className="bg-gray-50 border-b border-slate-200 pb-3">
        <View className="px-4 pt-5 pb-3">
          <AppText variant="headlineLg">Inspection Reports</AppText>
          <AppText variant="bodySm" color={colors.textSecondary} style={{ marginTop: 2 }}>
            Your completed quality control reports
          </AppText>
        </View>

        {/* Tab Bar — active = brand red */}
        <View className="flex-row mx-4 bg-slate-100 rounded-xl p-1">
          {([
            { key: 'factory' as Tab, label: 'Factory Reports', icon: Factory },
            { key: 'product' as Tab, label: 'Product Reports', icon: Package },
          ]).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
                className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${
                  isActive ? 'bg-brand-500' : ''
                }`}
                style={isActive ? {
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.12,
                  shadowRadius: 4,
                  elevation: 2,
                } : undefined}
              >
                <Icon size={15} color={isActive ? '#ffffff' : '#64748b'} strokeWidth={2.25} />
                <AppText
                  variant="titleMd"
                  color={isActive ? '#ffffff' : colors.textMuted}
                  style={{ marginLeft: 6 }}
                >
                  {tab.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {activeTab === 'factory' ? <FactoryReportsTab /> : <ProductReportsTab />}
    </View>
  );
}

// ─── Factory Reports Tab ─────────────────────────────────────────────────────

function FactoryReportsTab() {
  const [searchInput, setSearchInput] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput, 300);

  const [inspections, setInspections] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bottom-sheet filters — same pattern as the Vendors / Products tabs: every
  // criterion is edited as a draft and only committed on Apply, so a half-set
  // filter never triggers a refetch.
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [draftResult, setDraftResult] = useState(resultFilter);
  const [draftSort, setDraftSort] = useState(sort);
  const [draftDateFrom, setDraftDateFrom] = useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(dateTo);

  const openFilterSheet = () => {
    setDraftResult(resultFilter);
    setDraftSort(sort);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setShowFilterSheet(true);
  };

  const resetDraft = () => {
    setDraftResult('');
    setDraftSort(DEFAULT_SORT);
    setDraftDateFrom('');
    setDraftDateTo('');
  };

  const applyFilters = () => {
    setResultFilter(draftResult);
    setSort(draftSort);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setPage(1);
    setShowFilterSheet(false);
  };

  const draftActiveCount = useMemo(() => {
    let n = 0;
    if (draftResult) n += 1;
    if (draftSort !== DEFAULT_SORT) n += 1;
    if (draftDateFrom) n += 1;
    return n;
  }, [draftResult, draftSort, draftDateFrom]);

  // Badge count covers only the sheet's own criteria — search has its own
  // visible field and clear button, so counting it would double-report.
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (resultFilter) n += 1;
    if (sort !== DEFAULT_SORT) n += 1;
    if (dateFrom) n += 1;
    return n;
  }, [resultFilter, sort, dateFrom]);

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    setPage(1);
  }, [debouncedSearch, resultFilter, sort, dateFrom, dateTo]);

  const [sortBy, sortOrder] = useMemo(() => {
    const [by, ord] = sort.split(':');
    return [by || 'completedAt', (ord as 'asc' | 'desc') || 'desc'];
  }, [sort]);

  const requestIdRef = useRef(0);

  const loadReports = useCallback(async () => {
    const id = ++requestIdRef.current;
    setError(null);
    if (!refreshing) setLoading(true);
    try {
      const res = await qcCheckerService.getInspections({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        result: resultFilter || undefined,
        sortBy,
        sortOrder,
      });
      if (id !== requestIdRef.current) return;
      if (res.success) {
        setInspections(res.inspections || []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err: any) {
      if (id !== requestIdRef.current) return;
      setError(err?.message || 'Failed to load reports');
    } finally {
      if (id === requestIdRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [page, debouncedSearch, resultFilter, sortBy, sortOrder, refreshing]);

  // Refetch on focus so freshly-submitted inspections appear immediately.
  useFocusEffect(useCallback(() => { loadReports(); }, [loadReports]));

  // Client-side date filter — filters within the current server page, on the
  // same field the web filters (completion date, falling back to scheduled).
  const filteredInspections = useMemo(() => {
    if (!dateFrom) return inspections;
    return inspections.filter((insp) => {
      const src = insp.completedAt || insp.scheduledDate;
      if (!src) return false;
      const d = new Date(src);
      if (Number.isNaN(d.getTime())) return false;
      const raw = fmtDate(d);
      if (dateTo) return raw >= dateFrom && raw <= dateTo;
      return raw === dateFrom;
    });
  }, [inspections, dateFrom, dateTo]);

  const hasActiveFilters = Boolean(debouncedSearch || resultFilter || sort !== DEFAULT_SORT || dateFrom || page !== 1);
  const clearFilters = () => { setSearchInput(''); setResultFilter(''); setSort(DEFAULT_SORT); setDateFrom(''); setDateTo(''); setPage(1); };

  const buildRow = (insp: any) => {
    const fd = insp.itemsToInspect && !Array.isArray(insp.itemsToInspect) ? insp.itemsToInspect : {};
    const fmtRowDate = (d?: string | null) => {
      if (!d) return '—';
      const parsed = new Date(d);
      return Number.isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('en-IN');
    };
    return {
      id: insp.id,
      vendor: insp.vendor?.companyName || fd.vendorName || '—',
      factoryName: fd.factoryName || '—',
      // Human-readable vendor code (VND-YYYY-NNNN), same as the admin/web panel.
      vendorId: insp.vendor?.vendorCode || insp.vendor?.id || insp.vendorId || '—',
      // Date the inspection was scheduled/assigned.
      assignedDate: fmtRowDate(insp.scheduledDate),
      // Completion date, falling back to the scheduled date.
      inspectionDate: fmtRowDate(insp.completedAt || insp.scheduledDate),
      priority: insp.priority || '',
      inspectionType: insp.inspectionType,
      result: insp.result || '—',
    };
  };

  return (
    <View className="flex-1">
      <SearchFilterBar
        placeholder="Search by vendor, client..."
        value={searchInput}
        onChangeText={setSearchInput}
        activeFilterCount={activeFilterCount}
        onOpenFilters={openFilterSheet}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReports(); }} tintColor={brand[500]} colors={[brand[500]]} />}
      >
        {/* Clear filters (report-count summary intentionally omitted for web parity) */}
        {hasActiveFilters ? (
          <View className="flex-row items-center justify-end mb-3">
            <TouchableOpacity onPress={clearFilters}>
              <AppText variant="labelSm" color={brand[600]} style={{ textDecorationLine: 'underline' }}>Clear filters</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Error */}
        {error && !loading ? (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-3">
            <AppText variant="bodySm" color={colors.dangerFg} style={{ marginBottom: 8 }}>{error}</AppText>
            <Pressable onPress={loadReports}
              className="rounded-lg px-4 py-2.5 self-start flex-row items-center"
              style={({ pressed }) => ({ backgroundColor: pressed ? brand[600] : brand[500], minHeight: 44 })}
            >
              <RefreshCw size={14} color="#ffffff" />
              <AppText variant="titleMd" color="#ffffff" style={{ marginLeft: 8 }}>Retry</AppText>
            </Pressable>
          </View>
        ) : null}

        {/* Skeleton */}
        {loading && inspections.length === 0 && !error ? (
          <View style={{ rowGap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} className="bg-white rounded-2xl border border-slate-200 p-4" style={elevation.card}>
                <View className="flex-row items-center" style={{ columnGap: 12 }}>
                  <View className="w-11 h-11 bg-slate-200 rounded-xl" />
                  <View className="flex-1">
                    <View className="h-3.5 bg-slate-200 rounded w-3/4 mb-2" />
                    <View className="h-2.5 bg-slate-200 rounded w-1/2 mb-2" />
                    <View className="h-2.5 bg-slate-200 rounded w-2/5" />
                  </View>
                  <View className="h-5 w-16 bg-slate-200 rounded-full" />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Cards */}
        {!error && filteredInspections.length > 0 ? (
          <View style={{ rowGap: 12 }}>
            {filteredInspections.map((insp) => {
              const row = buildRow(insp);
              // Factory rows are a read-only summary — nothing opens on tap.
              return (
                <View
                  key={insp.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5"
                  style={[{ backgroundColor: '#ffffff' }, elevation.card]}
                >
                  <View className="flex-row items-center" style={{ gap: 14 }}>
                    <View className="w-11 h-11 bg-brand-50 rounded-full items-center justify-center">
                      <FileText size={18} color={brand[500]} strokeWidth={2} />
                    </View>
                    <View className="flex-1" style={{ gap: 4, minWidth: 0 }}>
                      <AppText variant="titleMd" numberOfLines={1}>{row.vendor}</AppText>
                      {row.factoryName && row.factoryName !== '—' ? (
                        <AppText variant="bodySm" color={colors.textMuted} numberOfLines={1}>{row.factoryName}</AppText>
                      ) : null}
                      <Text className="text-[11px] font-mono text-slate-400 uppercase tracking-wider" numberOfLines={1}>
                        {row.vendorId}
                      </Text>
                      {/* Type + priority — the two columns the web table carries
                          that the card was dropping. */}
                      <View className="flex-row items-center flex-wrap" style={{ columnGap: 6, rowGap: 4 }}>
                        <InspectionTypeChip type={row.inspectionType} />
                        {row.priority ? <PriorityChip priority={row.priority} /> : null}
                      </View>
                      <DatePair assigned={row.assignedDate} completed={row.inspectionDate} />
                    </View>
                    <View style={{ flexShrink: 0 }}>
                      <ResultBadge result={row.result} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Empty */}
        {!loading && !error && filteredInspections.length === 0 ? (
          <View className="py-12 items-center">
            <View className="w-20 h-20 rounded-2xl bg-slate-100 items-center justify-center mb-4">
              <Factory size={36} color="#94a3b8" />
            </View>
            <AppText variant="titleLg" style={{ marginBottom: 4 }}>{hasActiveFilters ? 'No reports match your filters' : 'No reports yet'}</AppText>
            <AppText variant="bodySm" color={colors.textSecondary} style={{ textAlign: 'center', marginBottom: 16 }}>
              {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Completed factory inspections will appear here.'}
            </AppText>
            {hasActiveFilters ? (
              <Pressable onPress={clearFilters}
                className="rounded-lg px-4 py-2.5"
                style={({ pressed }) => ({ backgroundColor: pressed ? brand[600] : brand[500], minHeight: 44, justifyContent: 'center' })}
              >
                <AppText variant="titleMd" color="#ffffff">Clear filters</AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Pagination */}
        {pagination.totalPages > 1 ? (
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} disabled={loading} />
        ) : null}
      </ScrollView>

      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        onReset={resetDraft}
        onApply={applyFilters}
        applyCount={draftActiveCount}
      >
        <Text className="text-sm font-bold text-slate-900 mb-2">Date range</Text>
        <View className="mb-5">
          <DateRangeCalendar
            from={draftDateFrom}
            to={draftDateTo}
            onChange={(f, t) => { setDraftDateFrom(f); setDraftDateTo(t); }}
            placeholder="Filter by date"
          />
        </View>

        <Text className="text-sm font-bold text-slate-900 mb-2">Result</Text>
        <FilterChips options={RESULT_OPTIONS} value={draftResult} onSelect={setDraftResult} />

        <Text className="text-sm font-bold text-slate-900 mb-2">Sort by</Text>
        <FilterChips options={SORT_OPTIONS} value={draftSort} onSelect={setDraftSort} last />
      </FilterSheet>
    </View>
  );
}

// ─── Product Reports Tab ─────────────────────────────────────────────────────

function ProductReportsTab() {
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState(PRODUCT_DEFAULT_SORT);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput, 300);

  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tapping a row opens the product report PDF directly, like the factory tab.
  // The list rows lack qcInspectionData, so the full product is fetched first.
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [checkerName, setCheckerName] = useState<string | undefined>(undefined);

  useEffect(() => {
    qcCheckerService.getCheckerData().then((d) => { if (d?.name) setCheckerName(d.name); }).catch(() => {});
  }, []);

  const openProductReportPdf = async (productId: string) => {
    if (openingId) return;
    setOpeningId(productId);
    try {
      const res = await qcCheckerService.getProductDetails(productId);
      const product = res?.data?.product;
      if (!product) throw new Error('Report not found.');
      await downloadProductReportPdf(product, { variant: 'canonical', checkerName, preview: true });
    } catch (err: any) {
      showErrorToast('Could not open report', err?.message || 'Please try again.');
    } finally {
      setOpeningId(null);
    }
  };

  // Same draft-then-Apply sheet as the factory tab and the Vendors / Products
  // list screens.
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draftSort, setDraftSort] = useState(sort);
  const [draftDateFrom, setDraftDateFrom] = useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(dateTo);

  const openFilterSheet = () => {
    setDraftStatus(statusFilter);
    setDraftSort(sort);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setShowFilterSheet(true);
  };

  const resetDraft = () => {
    setDraftStatus('');
    setDraftSort(PRODUCT_DEFAULT_SORT);
    setDraftDateFrom('');
    setDraftDateTo('');
  };

  const applyFilters = () => {
    setStatusFilter(draftStatus);
    setSort(draftSort);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setPage(1);
    setShowFilterSheet(false);
  };

  const draftActiveCount = useMemo(() => {
    let n = 0;
    if (draftStatus) n += 1;
    if (draftSort !== PRODUCT_DEFAULT_SORT) n += 1;
    if (draftDateFrom) n += 1;
    return n;
  }, [draftStatus, draftSort, draftDateFrom]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (statusFilter) n += 1;
    if (sort !== PRODUCT_DEFAULT_SORT) n += 1;
    if (dateFrom) n += 1;
    return n;
  }, [statusFilter, sort, dateFrom]);

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    setPage(1);
  }, [debouncedSearch, sort, statusFilter, dateFrom, dateTo]);

  const [sortBy, sortOrder] = useMemo(() => {
    const [by, ord] = sort.split(':');
    return [by || 'updatedAt', (ord as 'asc' | 'desc') || 'desc'];
  }, [sort]);

  const requestIdRef = useRef(0);

  const loadProducts = useCallback(async () => {
    const id = ++requestIdRef.current;
    setError(null);
    if (!refreshing) setLoading(true);
    try {
      const res = await qcCheckerService.getProductReports({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
      });
      if (id !== requestIdRef.current) return;
      if (res.success) {
        setProducts(res.data.products || []);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      if (id !== requestIdRef.current) return;
      setError(err?.message || 'Failed to load product reports');
    } finally {
      if (id === requestIdRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [page, debouncedSearch, sortBy, sortOrder, refreshing]);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  // Client-side status + date filters (within the current server page),
  // mirroring the web ProductReportsTab.
  const filteredProducts = useMemo(() => {
    let list = products;
    if (statusFilter === 'APPROVED') {
      // A submitted inspection is complete from the checker's side, even though the
      // admin has not ruled on it yet — it belongs with the approved ones here.
      list = list.filter(
        (p) =>
          p.approvalStatus === 'QC_SUBMITTED' ||
          p.approvalStatus === 'QC_APPROVED' ||
          p.approvalStatus === 'APPROVED',
      );
    } else if (statusFilter === 'REJECTED') {
      list = list.filter((p) => p.approvalStatus === 'REJECTED');
    }
    if (dateFrom) {
      list = list.filter((p) => {
        if (!p.updatedAt) return false;
        const d = new Date(p.updatedAt);
        if (Number.isNaN(d.getTime())) return false;
        const raw = fmtDate(d);
        if (dateTo) return raw >= dateFrom && raw <= dateTo;
        return raw === dateFrom;
      });
    }
    return list;
  }, [products, statusFilter, dateFrom, dateTo]);

  const isClientFiltered = Boolean(statusFilter || dateFrom);
  const hasActiveFilters = Boolean(debouncedSearch || sort !== PRODUCT_DEFAULT_SORT || statusFilter || dateFrom || page !== 1);
  const clearFilters = () => { setSearchInput(''); setSort(PRODUCT_DEFAULT_SORT); setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1); };

  return (
    <View className="flex-1">
      <SearchFilterBar
        placeholder="Search by product, or vendor..."
        value={searchInput}
        onChangeText={setSearchInput}
        activeFilterCount={activeFilterCount}
        onOpenFilters={openFilterSheet}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts(); }} tintColor={brand[500]} colors={[brand[500]]} />}
      >
        {/* Clear filters (report-count summary intentionally omitted for web parity) */}
        {hasActiveFilters ? (
          <View className="flex-row items-center justify-end mb-3">
            <TouchableOpacity onPress={clearFilters}>
              <AppText variant="labelSm" color={brand[600]} style={{ textDecorationLine: 'underline' }}>Clear filters</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Cards */}
        {loading && products.length === 0 ? (
          <View style={{ rowGap: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <View key={i} className="bg-white rounded-2xl border border-slate-200 p-4" style={elevation.card}>
                <View className="flex-row items-center" style={{ columnGap: 12 }}>
                  <View className="w-11 h-11 bg-slate-200 rounded-xl" />
                  <View className="flex-1">
                    <View className="h-3.5 bg-slate-200 rounded w-3/4 mb-2" />
                    <View className="h-2.5 bg-slate-200 rounded w-1/2" />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : error ? (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <AppText variant="bodySm" color={colors.dangerFg}>{error}</AppText>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View className="py-12 items-center">
            <View className="w-20 h-20 rounded-2xl bg-slate-100 items-center justify-center mb-4">
              <Package size={36} color="#94a3b8" />
            </View>
            <AppText variant="titleLg" style={{ marginBottom: 4 }}>{hasActiveFilters ? 'No reports match your filters' : 'No product reports yet'}</AppText>
            <AppText variant="bodySm" color={colors.textSecondary} style={{ textAlign: 'center' }}>
              {hasActiveFilters ? 'Try adjusting your search or sort.' : 'Completed product inspections will appear here.'}
            </AppText>
          </View>
        ) : (
          <View style={{ rowGap: 12 }}>
            {filteredProducts.map((p: any) => {
              const thumb = p.images?.[0]?.url;
              // Assigned = the admin's QC assignment date; Completed On = the
              // checker's own submission (lastReviewedAt, backfilled server-side
              // from the audit trail for legacy rows). These used to be the
              // product's createdAt / updatedAt, which meant "Submitted" was the
              // day the vendor created the product and "Inspected" moved every
              // time anything on the row changed.
              const assignedOn = p.qcAssignment?.assignedAt || p.qcAssignment?.scheduledDate;
              const assignedLabel = assignedOn
                ? new Date(assignedOn).toLocaleDateString('en-IN')
                : '—';
              const completedLabel = p.lastReviewedAt
                ? new Date(p.lastReviewedAt).toLocaleDateString('en-IN')
                : '—';
              const vendorCode = p.vendor?.vendorCode;
              const opening = openingId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => openProductReportPdf(p.id)}
                  disabled={!!openingId}
                  accessibilityRole="button"
                  accessibilityLabel={`Open report for ${p.name}`}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5"
                  style={({ pressed }) => [
                    { backgroundColor: pressed ? '#f8fafc' : '#ffffff', opacity: openingId && !opening ? 0.6 : 1 },
                    elevation.card,
                  ]}
                >
                  <View className="flex-row items-center" style={{ gap: 14 }}>
                    {thumb ? (
                      <Image
                        source={{ uri: thumb }}
                        className="w-11 h-11 rounded-full border border-slate-200"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-11 h-11 bg-brand-50 rounded-full items-center justify-center">
                        <Package size={18} color={brand[500]} strokeWidth={2} />
                      </View>
                    )}
                    <View className="flex-1" style={{ gap: 4, minWidth: 0 }}>
                      <AppText variant="titleMd" numberOfLines={1}>{p.name}</AppText>
                      <AppText variant="labelSm" color={colors.textFaint} numberOfLines={1}>
                        {p.vendor?.companyName || '—'} · {p.category || '—'}
                      </AppText>
                      {vendorCode ? (
                        <AppText variant="bodySm" color={colors.textMuted} numberOfLines={1}>ID: {vendorCode}</AppText>
                      ) : null}
                      <DatePair assigned={assignedLabel} completed={completedLabel} />
                    </View>
                    <View style={{ flexShrink: 0 }}>
                      {opening
                        ? <ActivityIndicator size="small" color={brand[500]} />
                        : <StatusBadge status={p.approvalStatus} label={productStatusLabel(p.approvalStatus)} />}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {pagination.totalPages > 1 && !isClientFiltered ? (
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} disabled={loading} />
        ) : null}
      </ScrollView>

      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        onReset={resetDraft}
        onApply={applyFilters}
        applyCount={draftActiveCount}
      >
        <Text className="text-sm font-bold text-slate-900 mb-2">Date range</Text>
        <View className="mb-5">
          <DateRangeCalendar
            from={draftDateFrom}
            to={draftDateTo}
            onChange={(f, t) => { setDraftDateFrom(f); setDraftDateTo(t); }}
            placeholder="Filter by date"
          />
        </View>

        <Text className="text-sm font-bold text-slate-900 mb-2">Result</Text>
        <FilterChips options={PRODUCT_STATUS_OPTIONS} value={draftStatus} onSelect={setDraftStatus} />

        <Text className="text-sm font-bold text-slate-900 mb-2">Sort by</Text>
        <FilterChips options={PRODUCT_SORT_OPTIONS} value={draftSort} onSelect={setDraftSort} last />
      </FilterSheet>
    </View>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

/**
 * The two report dates, as a labelled pair.
 *
 * They used to run together in one sentence ("Assigned Date 12 Aug 2026 ·
 * Completed On 19 Aug 2026"), which wrapped mid-date on a narrow phone and left
 * the reader working out where one date ended and the next began. Two aligned
 * columns — small-caps label above the value — read at a glance and never wrap.
 */
function DatePair({ assigned, completed }: { assigned?: string; completed?: string }) {
  const Item = ({ label, value }: { label: string; value?: string }) => (
    <View style={{ minWidth: 96 }}>
      <View className="flex-row items-center" style={{ gap: 4 }}>
        <CalendarDays size={10} color="#94a3b8" />
        <Text className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</Text>
      </View>
      <Text className="text-[12px] font-semibold text-slate-600 mt-0.5">{value || '—'}</Text>
    </View>
  );
  return (
    <View className="flex-row mt-1" style={{ columnGap: 18 }}>
      <Item label="Assigned" value={assigned} />
      <Item label="Completed" value={completed} />
    </View>
  );
}

/**
 * Search field + filter trigger, identical to the Vendors and Products tabs.
 *
 * Reports used to hide its filters behind a chevron in the page header, which
 * left the search box invisible until you found that toggle — a different
 * interaction from every other list in the app.
 */
function SearchFilterBar({
  placeholder,
  value,
  onChangeText,
  activeFilterCount,
  onOpenFilters,
}: {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
}) {
  return (
    <View className="px-4 pt-3 pb-3 bg-gray-50 flex-row items-center" style={{ columnGap: 8 }}>
      <View className="flex-1 flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3">
        <Search size={18} color="#94a3b8" />
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          className="flex-1 ml-3 text-sm text-slate-900"
          placeholderTextColor="#94a3b8"
        />
        {value ? (
          <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8}>
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={onOpenFilters}
        accessibilityRole="button"
        accessibilityLabel="Open filters"
        className="w-12 h-12 rounded-xl bg-brand-500 items-center justify-center"
        style={elevation.card}
      >
        <SlidersHorizontal size={18} color="#ffffff" />
        {activeFilterCount > 0 ? (
          <View className="absolute -top-1 -right-1 min-w-[18px] min-h-[18px] px-1 rounded-full bg-white border border-brand-600 items-center justify-center">
            <Text className="text-[10px] font-bold text-brand-600">{activeFilterCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

/** Wrapping row of selectable pills — same markup as the Vendors filter sheet. */
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

/** Bottom-sheet shell: Reset / Filters / Close, scrollable body, fixed actions. */
function FilterSheet({
  visible,
  onClose,
  onReset,
  onApply,
  applyCount,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  applyCount: number;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: '85%' }}>
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1.5 rounded-full bg-slate-200" />
          </View>

          <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
            <TouchableOpacity onPress={onReset} hitSlop={8}>
              <Text className="text-sm font-bold text-red-500">Reset</Text>
            </TouchableOpacity>
            <Text className="text-base font-extrabold text-slate-900">Filters</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          <View className="px-5 pt-3" style={{ paddingBottom: Platform.OS === 'ios' ? 28 : 18 }}>
            <TouchableOpacity
              onPress={onReset}
              activeOpacity={0.85}
              className="w-full items-center justify-center bg-white border border-slate-200 rounded-xl py-3.5 mb-2.5"
            >
              <Text className="text-sm font-bold text-slate-700">Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onApply}
              activeOpacity={0.9}
              className="w-full items-center justify-center bg-brand-500 rounded-xl py-3.5"
            >
              <Text className="text-sm font-extrabold text-white">
                Apply{applyCount > 0 ? ` (${applyCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// How the inspection was carried out. Anything not explicitly VIRTUAL is on-site
// — the column defaults to PHYSICAL and older rows predate the choice (mirrors
// the web Reports table's Type column).
function InspectionTypeChip({ type }: { type?: string | null }) {
  const isVirtual = String(type || '').toUpperCase() === 'VIRTUAL';
  return (
    <View
      className="flex-row items-center rounded-md px-2 py-0.5"
      style={{ backgroundColor: isVirtual ? '#e0f2fe' : '#f1f5f9', columnGap: 4 }}
    >
      {isVirtual ? <Video size={10} color="#0284c7" /> : <MapPin size={10} color="#64748b" />}
      <Text className="text-[10px] font-bold" style={{ color: isVirtual ? '#0369a1' : '#475569' }}>
        {isVirtual ? 'Virtual' : 'Physical'}
      </Text>
    </View>
  );
}

// Priority badge — same three tiers and colours as the web table.
const PRIORITY_STYLE: Record<string, { bg: string; fg: string }> = {
  high: { bg: '#fef2f2', fg: '#b91c1c' },
  medium: { bg: '#fffbeb', fg: '#b45309' },
  low: { bg: '#ecfdf5', fg: '#047857' },
};

function PriorityChip({ priority }: { priority: string }) {
  const style = PRIORITY_STYLE[priority.toLowerCase()] || { bg: '#f1f5f9', fg: '#475569' };
  return (
    <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: style.bg }}>
      <Text className="text-[10px] font-bold capitalize" style={{ color: style.fg }}>
        {priority}
      </Text>
    </View>
  );
}

// Factory result badge — mirrors the web getResultBadge exactly (finalised
// outcome the admin sees) so nothing renders as a raw enum value.
function ResultBadge({ result }: { result: string }) {
  const pill = (
    bg: string,
    border: string,
    fg: string,
    label: string,
    Icon?: typeof CheckCircle,
    iconColor?: string,
  ) => (
    <View className={`flex-row items-center ${bg} px-2.5 py-1 rounded-full border ${border}`} style={{ columnGap: 4 }}>
      {Icon ? <Icon size={10} color={iconColor} /> : null}
      <AppText variant="labelSm" color={fg}>{label}</AppText>
    </View>
  );

  switch (result) {
    case 'PASSED':
    case 'APPROVED':
      return pill('bg-emerald-100', 'border-emerald-200', '#047857', 'Approved', CheckCircle, '#059669');
    case 'QC_SUBMITTED':
      return pill('bg-blue-50', 'border-blue-200', '#1d4ed8', 'Submitted', CheckCircle, '#2563eb');
    case 'QC_APPROVED':
      return pill('bg-emerald-50', 'border-emerald-200', '#047857', 'QC Approved', CheckCircle, '#059669');
    case 'REINSPECTION':
    case 'RE_INSPECTION':
      return pill('bg-amber-100', 'border-amber-200', '#b45309', 'Re-Inspection');
    case 'FAILED':
    case 'REJECTED':
      return pill('bg-red-100', 'border-red-200', '#b91c1c', 'Rejected', XCircle, '#dc2626');
    case 'PENDING':
    case 'IN_PROGRESS':
      return pill('bg-brand-50', 'border-brand-200', brand[700], 'In Progress');
    case 'SUBMITTED':
      return pill('bg-brand-50', 'border-brand-200', brand[700], 'Submitted for Review');
    case 'UNDER_ADMIN_REVIEW':
      return pill('bg-yellow-50', 'border-yellow-200', '#a16207', 'Under Admin Review');
    case 'COMPLETED':
      return pill('bg-emerald-100', 'border-emerald-200', '#047857', 'Completed');
    default:
      return pill('bg-slate-100', 'border-slate-200', '#334155', result || '—');
  }
}

function Pagination({ page, totalPages, onChange, disabled }: {
  page: number; totalPages: number; onChange: (p: number) => void; disabled?: boolean;
}) {
  const pages = getPageRange(page, totalPages);
  return (
    <View className="mt-6 flex-row items-center justify-center flex-wrap" style={{ columnGap: 4, rowGap: 4 }}>
      <TouchableOpacity onPress={() => onChange(page - 1)} disabled={disabled || page <= 1}
        className="flex-row items-center px-3 py-2 rounded-lg border border-slate-200 bg-white"
        style={{ opacity: disabled || page <= 1 ? 0.4 : 1 }}
      >
        <ChevronLeft size={14} color="#475569" />
        <AppText variant="labelSm" color={colors.textSecondary} style={{ marginLeft: 4 }}>Prev</AppText>
      </TouchableOpacity>
      {pages.map((p, i) =>
        p === '…' ? (
          <AppText key={`el-${i}`} variant="bodySm" color={colors.textFaint} style={{ paddingHorizontal: 8 }}>…</AppText>
        ) : (
          <TouchableOpacity key={p} onPress={() => onChange(p)} disabled={disabled}
            className={`min-w-9 px-3 py-2 rounded-lg border ${
              p === page ? 'bg-brand-500 border-brand-500' : 'bg-white border-slate-200'
            }`} style={{ opacity: disabled ? 0.4 : 1 }}
          >
            <AppText variant="labelSm" color={p === page ? '#ffffff' : colors.textSecondary} style={{ textAlign: 'center' }}>{p}</AppText>
          </TouchableOpacity>
        ),
      )}
      <TouchableOpacity onPress={() => onChange(page + 1)} disabled={disabled || page >= totalPages}
        className="flex-row items-center px-3 py-2 rounded-lg border border-slate-200 bg-white"
        style={{ opacity: disabled || page >= totalPages ? 0.4 : 1 }}
      >
        <AppText variant="labelSm" color={colors.textSecondary} style={{ marginRight: 4 }}>Next</AppText>
        <ChevronRight size={14} color="#475569" />
      </TouchableOpacity>
    </View>
  );
}

function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 4) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('…');
  pages.push(total);
  return pages;
}
