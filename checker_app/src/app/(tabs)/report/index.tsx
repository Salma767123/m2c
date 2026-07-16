import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Factory,
  Package,
  FileText,
  CalendarDays,
  User,
} from 'lucide-react-native';
import { router } from 'expo-router';
import qcCheckerService from '../../../services/qcCheckerService';
import { useDebounce } from '../../../hooks/useDebounce';
import DateRangeCalendar, { fmtDate } from '@/components/General/DateRangeCalendar';
import { AppText, StatusBadge } from '@/components/UI';
import { brand, colors, elevation } from '@/constants/design';

type Tab = 'factory' | 'product';
const PAGE_SIZE = 12;
const DEFAULT_SORT = 'completedAt:desc';

const RESULT_OPTIONS = [
  { value: '', label: 'All results' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
];

const SORT_OPTIONS = [
  { value: 'completedAt:desc', label: 'Latest first' },
  { value: 'completedAt:asc', label: 'Oldest first' },
  { value: 'vendorName:asc', label: 'Vendor A–Z' },
  { value: 'vendorName:desc', label: 'Vendor Z–A' },
];

const PRODUCT_SORT_OPTIONS = [
  { value: 'updatedAt:desc', label: 'Latest first' },
  { value: 'updatedAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
];

// Product status filter — labels match the web ProductReportsTab exactly.
const PRODUCT_STATUS_OPTIONS = [
  { value: '', label: 'All results' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('factory');

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
            { key: 'factory' as Tab, label: 'Factory', icon: Factory },
            { key: 'product' as Tab, label: 'Product', icon: Package },
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
  const [showResultModal, setShowResultModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

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
  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = dateFrom
    ? rangeStart + filteredInspections.length - 1
    : Math.min(pagination.page * pagination.limit, pagination.total);
  const totalShown = dateFrom ? filteredInspections.length : pagination.total;
  const clearFilters = () => { setSearchInput(''); setResultFilter(''); setSort(DEFAULT_SORT); setDateFrom(''); setDateTo(''); setPage(1); };

  const buildRow = (insp: any) => {
    const fd = insp.itemsToInspect && !Array.isArray(insp.itemsToInspect) ? insp.itemsToInspect : {};
    return {
      id: insp.id,
      vendor: insp.vendor?.companyName || fd.vendorName || '—',
      factoryName: fd.factoryName || '—',
      clientName: insp.clientName || '—',
      inspectionDate: insp.completedAt
        ? new Date(insp.completedAt).toLocaleDateString('en-IN')
        : insp.scheduledDate || '—',
      result: insp.result || '—',
    };
  };

  const resultLabel = RESULT_OPTIONS.find((o) => o.value === resultFilter)?.label || 'All results';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Latest first';

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReports(); }} tintColor={brand[500]} colors={[brand[500]]} />}
    >
      {/* Search */}
      <View className="mb-3 flex-row items-center bg-white border border-slate-300 rounded-xl px-4 py-2.5">
        <Search size={18} color="#94a3b8" />
        <TextInput
          placeholder="Search vendor, client..."
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

      {/* Date range filter */}
      <View className="mb-3">
        <DateRangeCalendar
          from={dateFrom}
          to={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          placeholder="Filter by date"
        />
      </View>

      {/* Filter + Sort */}
      <View className="flex-row mb-3" style={{ columnGap: 8 }}>
        <TouchableOpacity onPress={() => setShowResultModal(true)}
          className="flex-1 flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5"
        >
          <AppText variant="bodySm" color={colors.text} numberOfLines={1}>{resultLabel}</AppText>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSortModal(true)}
          className="flex-1 flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5"
        >
          <AppText variant="bodySm" color={colors.text} numberOfLines={1}>{sortLabel}</AppText>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View className="flex-row items-center justify-between mb-3">
        <AppText variant="labelSm" color={colors.textSecondary}>
          {loading && inspections.length === 0 ? '' : totalShown === 0 ? '0 reports' : `Showing ${rangeStart}–${rangeEnd} of ${totalShown}`}
        </AppText>
        {hasActiveFilters ? (
          <TouchableOpacity onPress={clearFilters}>
            <AppText variant="labelSm" color={brand[600]} style={{ textDecorationLine: 'underline' }}>Clear filters</AppText>
          </TouchableOpacity>
        ) : null}
      </View>

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
        <View style={{ rowGap: 10 }}>
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
        <View style={{ rowGap: 10 }}>
          {filteredInspections.map((insp) => {
            const row = buildRow(insp);
            return (
              <Pressable
                key={insp.id}
                onPress={() => router.push({ pathname: '/factory-report/[id]' as any, params: { id: insp.id } })}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                style={({ pressed }) => [{ padding: 14, minHeight: 44, backgroundColor: pressed ? '#f8fafc' : '#ffffff' }, elevation.card]}
              >
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <View className="w-11 h-11 bg-brand-50 rounded-xl items-center justify-center">
                    <FileText size={18} color={brand[500]} strokeWidth={2} />
                  </View>
                  <View className="flex-1" style={{ gap: 3 }}>
                    <AppText variant="titleMd" numberOfLines={1}>{row.vendor}</AppText>
                    <AppText variant="bodySm" color={colors.textMuted} numberOfLines={1}>{row.factoryName}</AppText>
                    <View className="flex-row items-center flex-wrap" style={{ columnGap: 12, rowGap: 2 }}>
                      <View className="flex-row items-center" style={{ gap: 4 }}>
                        <User size={11} color={colors.textFaint} />
                        <AppText variant="labelSm" color={colors.textFaint} numberOfLines={1}>{row.clientName}</AppText>
                      </View>
                      <View className="flex-row items-center" style={{ gap: 4 }}>
                        <CalendarDays size={11} color={colors.textFaint} />
                        <AppText variant="labelSm" color={colors.textFaint}>{row.inspectionDate}</AppText>
                      </View>
                    </View>
                  </View>
                  <ResultBadge result={row.result} />
                </View>
              </Pressable>
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
          <AppText variant="titleLg" style={{ marginBottom: 4 }}>{hasActiveFilters ? 'No reports match filters' : 'No reports yet'}</AppText>
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

      <OptionModal visible={showResultModal} title="Filter by result" options={RESULT_OPTIONS} value={resultFilter}
        onSelect={(v) => { setResultFilter(v); setShowResultModal(false); }} onClose={() => setShowResultModal(false)} />
      <OptionModal visible={showSortModal} title="Sort by" options={SORT_OPTIONS} value={sort}
        onSelect={(v) => { setSort(v); setShowSortModal(false); }} onClose={() => setShowSortModal(false)} />
    </ScrollView>
  );
}

// ─── Product Reports Tab ─────────────────────────────────────────────────────

function ProductReportsTab() {
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('updatedAt:desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput, 300);

  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

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
    setLoading(true);
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
      if (id === requestIdRef.current) setLoading(false);
    }
  }, [page, debouncedSearch, sortBy, sortOrder]);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  // Client-side status + date filters (within the current server page),
  // mirroring the web ProductReportsTab.
  const filteredProducts = useMemo(() => {
    let list = products;
    if (statusFilter === 'APPROVED') {
      list = list.filter((p) => p.approvalStatus === 'QC_APPROVED' || p.approvalStatus === 'APPROVED');
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
  const hasActiveFilters = Boolean(debouncedSearch || sort !== 'updatedAt:desc' || statusFilter || dateFrom || page !== 1);
  const clearFilters = () => { setSearchInput(''); setSort('updatedAt:desc'); setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1); };
  const sortLabel = PRODUCT_SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Latest first';
  const statusLabel = PRODUCT_STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || 'All results';

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Search */}
      <View className="mb-3 flex-row items-center bg-white border border-slate-300 rounded-xl px-4 py-2.5">
        <Search size={18} color="#94a3b8" />
        <TextInput
          placeholder="Search product, SKU, vendor..."
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

      {/* Date range filter */}
      <View className="mb-3">
        <DateRangeCalendar
          from={dateFrom}
          to={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          placeholder="Filter by date"
        />
      </View>

      {/* Status + Sort */}
      <View className="flex-row mb-3" style={{ columnGap: 8 }}>
        <TouchableOpacity onPress={() => setShowStatusModal(true)}
          className="flex-1 flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5"
        >
          <AppText variant="bodySm" color={colors.text} numberOfLines={1}>{statusLabel}</AppText>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSortModal(true)}
          className="flex-1 flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5"
        >
          <AppText variant="bodySm" color={colors.text} numberOfLines={1}>{sortLabel}</AppText>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View className="flex-row items-center justify-between mb-3">
        <AppText variant="labelSm" color={colors.textSecondary}>
          {loading && products.length === 0 ? '' : filteredProducts.length === 0 ? '0 reports' : `${filteredProducts.length} report${filteredProducts.length === 1 ? '' : 's'}`}
        </AppText>
        {hasActiveFilters ? (
          <TouchableOpacity onPress={clearFilters}>
            <AppText variant="labelSm" color={brand[600]} style={{ textDecorationLine: 'underline' }}>Clear filters</AppText>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Cards */}
      {loading && products.length === 0 ? (
        <View style={{ rowGap: 10 }}>
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
          <AppText variant="titleLg" style={{ marginBottom: 4 }}>{hasActiveFilters ? 'No matches' : 'No product reports'}</AppText>
          <AppText variant="bodySm" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            {hasActiveFilters ? 'Try adjusting your search or filters.' : 'QC approved products will appear here.'}
          </AppText>
        </View>
      ) : (
        <View style={{ rowGap: 10 }}>
          {filteredProducts.map((p: any) => (
            <Pressable
              key={p.id}
              onPress={() => router.push({ pathname: '/product-report/[id]' as any, params: { id: p.id } })}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              style={({ pressed }) => [{ padding: 14, minHeight: 44, backgroundColor: pressed ? '#f8fafc' : '#ffffff' }, elevation.card]}
            >
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <View className="w-11 h-11 bg-brand-50 rounded-xl items-center justify-center">
                  <Package size={18} color={brand[500]} strokeWidth={2} />
                </View>
                <View className="flex-1" style={{ gap: 3 }}>
                  <AppText variant="titleMd" numberOfLines={1}>{p.name}</AppText>
                  <AppText variant="bodySm" color={colors.textMuted} numberOfLines={1}>SKU: {p.baseSku}</AppText>
                  <AppText variant="labelSm" color={colors.textFaint} numberOfLines={1}>
                    {p.vendor?.companyName || '—'} · {p.category}
                  </AppText>
                </View>
                <StatusBadge status={p.approvalStatus} label={p.approvalStatus?.replace(/_/g, ' ')} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {pagination.totalPages > 1 && !isClientFiltered ? (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} disabled={loading} />
      ) : null}

      <OptionModal visible={showStatusModal} title="Filter by result" options={PRODUCT_STATUS_OPTIONS} value={statusFilter}
        onSelect={(v) => { setStatusFilter(v); setShowStatusModal(false); }} onClose={() => setShowStatusModal(false)} />
      <OptionModal visible={showSortModal} title="Sort by" options={PRODUCT_SORT_OPTIONS} value={sort}
        onSelect={(v) => { setSort(v); setShowSortModal(false); }} onClose={() => setShowSortModal(false)} />
    </ScrollView>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function ResultBadge({ result }: { result: string }) {
  if (result === 'PASSED') {
    return (
      <View className="flex-row items-center bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200" style={{ columnGap: 4 }}>
        <CheckCircle size={10} color="#059669" />
        <AppText variant="labelSm" color="#047857">Passed</AppText>
      </View>
    );
  }
  if (result === 'FAILED') {
    return (
      <View className="flex-row items-center bg-red-100 px-2.5 py-1 rounded-full border border-red-200" style={{ columnGap: 4 }}>
        <XCircle size={10} color="#dc2626" />
        <AppText variant="labelSm" color="#b91c1c">Failed</AppText>
      </View>
    );
  }
  return (
    <View className="bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
      <AppText variant="labelSm" color="#334155">{result || '—'}</AppText>
    </View>
  );
}

function OptionModal({ visible, title, options, value, onSelect, onClose }: {
  visible: boolean; title: string; options: { value: string; label: string }[];
  value: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose}
        className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
      >
        <View className="bg-white rounded-2xl w-11/12 max-w-sm overflow-hidden">
          <View className="px-5 py-4 border-b border-slate-100">
            <AppText variant="titleLg">{title}</AppText>
          </View>
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <TouchableOpacity key={opt.value} onPress={() => onSelect(opt.value)}
                className={`px-5 py-3.5 flex-row items-center justify-between border-b border-slate-100 ${active ? 'bg-brand-50' : ''}`}
              >
                <AppText variant="bodyMd" color={active ? brand[700] : colors.textSecondary} style={active ? { fontWeight: '700' } : undefined}>{opt.label}</AppText>
                {active ? <View className="w-2 h-2 rounded-full bg-brand-500" /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
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
