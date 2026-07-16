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
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  Search,
  Eye,
  FileText,
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Package,
  CheckCircle,
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { useDebounce } from '../../hooks/useDebounce';
import { router, useLocalSearchParams } from 'expo-router';
import DateRangeCalendar, { fmtDate } from '../../components/General/DateRangeCalendar';
import { AppText, Button } from '@/components/UI';
import { brand, colors, elevation } from '@/constants/design';

// Enable LayoutAnimation on Android so the filter section collapses smoothly.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PAGE_SIZE = 12;
const DEFAULT_SORT = 'createdAt:desc';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REINSPECTION', label: 'Reinspection' },
  { value: 'QC_APPROVED', label: 'Approved by QC' },
  { value: 'APPROVED', label: 'Approved by Admin' },
  { value: 'REJECTED', label: 'Rejected' },
];

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'basePrice:asc', label: 'Price low–high' },
  { value: 'basePrice:desc', label: 'Price high–low' },
];

// Semantic product-status badge colours (mirror web ProductList). These are
// status colours, not UI chrome, so they stay as-is (incl. QC_APPROVED blue).
const APPROVAL_STYLE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-800' },
  REINSPECTION: { bg: 'bg-purple-100', text: 'text-purple-800' },
  QC_APPROVED: { bg: 'bg-brand-100', text: 'text-brand-700' },
  APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  REINSPECTION: 'Reinspection',
  QC_APPROVED: 'Approved by QC',
  APPROVED: 'Approved by Admin',
  REJECTED: 'Rejected',
};

// Fall back to the raw enum key (mirrors web: no vendor-only UNDER_REVIEW label).
const formatStatus = (status: string) => STATUS_LABELS[status] || status;

interface Product {
  id: string;
  name: string;
  baseSku: string;
  category: string;
  basePrice: number;
  totalStock: number;
  status: string;
  approvalStatus: string;
  createdAt?: string;
  images?: Array<{ url: string; isPrimary: boolean }>;
  vendor: { companyName: string; ownerName: string };
}

export default function ProductsTab() {
  // Incoming filter params from dashboard KPI navigation.
  const incoming = useLocalSearchParams<{
    status?: string;
    sort?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>();

  const [searchInput, setSearchInput] = useState(incoming.search ?? '');
  const [status, setStatus] = useState(incoming.status ?? '');
  const [sort, setSort] = useState(incoming.sort ?? DEFAULT_SORT);
  const [dateFrom, setDateFrom] = useState(incoming.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(incoming.dateTo ?? '');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Apply incoming params when they change (deep-link from dashboard).
  useEffect(() => {
    if (incoming.status !== undefined) setStatus(incoming.status ?? '');
    if (incoming.sort !== undefined) setSort(incoming.sort ?? DEFAULT_SORT);
    if (incoming.search !== undefined) setSearchInput(incoming.search ?? '');
    if (incoming.dateFrom !== undefined) setDateFrom(incoming.dateFrom ?? '');
    if (incoming.dateTo !== undefined) setDateTo(incoming.dateTo ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming.status, incoming.sort, incoming.search, incoming.dateFrom, incoming.dateTo]);

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    setPage(1);
  }, [debouncedSearch, status, sort, dateFrom, dateTo]);

  const [sortBy, sortOrder] = useMemo(() => {
    const [by, ord] = sort.split(':');
    return [by || 'createdAt', (ord as 'asc' | 'desc') || 'desc'];
  }, [sort]);

  const requestIdRef = useRef(0);

  const loadProducts = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setError(null);
    if (!refreshing) setLoading(true);
    try {
      const res = await qcCheckerService.getAssignedProducts({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
      });
      if (requestId !== requestIdRef.current) return;
      if (res.success) {
        const raw: any = res.data;
        setProducts(Array.isArray(raw) ? raw : (raw?.products || []));
        if (raw?.pagination) setPagination(raw.pagination);
      }
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setError(err?.message || 'Failed to fetch products');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, debouncedSearch, status, sortBy, sortOrder, refreshing]);

  // Refetch whenever the screen comes into focus (e.g. user returns from
  // a product inspection submit) so the list never shows stale status.
  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts();
  }, [loadProducts]);

  // Client-side date-range filter on createdAt (mirrors web Products).
  const filteredProducts = useMemo(() => {
    if (!dateFrom) return products;
    return products.filter((p) => {
      if (!p.createdAt) return false;
      const d = new Date(p.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      const raw = fmtDate(d);
      if (dateTo) return raw >= dateFrom && raw <= dateTo;
      return raw === dateFrom;
    });
  }, [products, dateFrom, dateTo]);

  const hasActiveFilters = Boolean(
    debouncedSearch || status || dateFrom || dateTo || sort !== DEFAULT_SORT || page !== 1,
  );
  const clearFilters = () => {
    setSearchInput(''); setStatus(''); setSort(DEFAULT_SORT); setDateFrom(''); setDateTo(''); setPage(1);
  };

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label || 'All statuses';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Newest first';

  // Collapsible filter section — toggled by the arrow button next to the title.
  const [showFilters, setShowFilters] = useState(false);
  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilters((v) => !v);
  };

  const handleView = (p: Product) => {
    router.push({ pathname: '/products/[id]' as any, params: { id: p.id, name: p.name } });
  };

  const handleStartInspection = (p: Product) => {
    router.push({
      pathname: '/product-inspection' as any,
      params: { productId: p.id, productName: p.name, vendorName: p.vendor.companyName },
    });
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Sticky title + filter toggle arrow */}
      <View className="px-4 pt-4 pb-2 bg-gray-50 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-slate-900 mb-1">Assigned Products</Text>
          <Text className="text-slate-600 text-sm">Review and approve or reject vendor products</Text>
        </View>
        <TouchableOpacity
          onPress={toggleFilters}
          accessibilityRole="button"
          accessibilityLabel={showFilters ? 'Hide filters' : 'Show filters'}
          className="w-9 h-9 rounded-full bg-white border border-slate-200 items-center justify-center mt-1"
          style={elevation.card}
        >
          {showFilters ? <ChevronUp size={18} color="#475569" /> : <ChevronDown size={18} color="#475569" />}
        </TouchableOpacity>
      </View>

      {/* Collapsible search + filters */}
      {showFilters ? (
        <View className="px-4 pt-1 pb-3 bg-gray-50 border-b border-slate-200">
        {/* Search */}
        <View className="mb-3 flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3">
          <Search size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search by product, SKU, category, or vendor..."
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

        {/* Filter + Sort */}
        <View className="flex-row mb-3" style={{ columnGap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowStatusModal(true)}
            className="flex-1 flex-row items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3"
          >
            <Text className="text-sm text-slate-900" numberOfLines={1}>{statusLabel}</Text>
            <ChevronDown size={16} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowSortModal(true)}
            className="flex-1 flex-row items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3"
          >
            <Text className="text-sm text-slate-900" numberOfLines={1}>{sortLabel}</Text>
            <ChevronDown size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Date range */}
        <View className="mb-3">
          <DateRangeCalendar
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
            placeholder="Filter by date"
          />
        </View>

        {/* Clear filters (product-count summary intentionally omitted, mirroring web) */}
        {hasActiveFilters ? (
          <View className="flex-row items-center justify-end">
            <TouchableOpacity onPress={clearFilters}>
              <Text className="text-xs font-semibold text-brand-600 underline">Clear filters</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand[500]} colors={[brand[500]]} />
        }
      >
        {/* Error */}
        {error && !loading ? (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <View className="flex-row items-start mb-3">
              <AlertCircle size={18} color="#dc2626" />
              <Text className="text-sm text-red-700 ml-2 flex-1">{error}</Text>
            </View>
            <Button label="Retry" onPress={loadProducts} icon={RefreshCw} variant="primary" />
          </View>
        ) : null}

        {/* Skeleton */}
        {loading && products.length === 0 && !error ? (
          <View style={{ rowGap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
                <View className="flex-row items-center mb-3">
                  <View className="w-14 h-14 rounded-xl bg-slate-200" />
                  <View className="flex-1 ml-3">
                    <View className="h-3.5 bg-slate-200 rounded w-3/4 mb-2" />
                    <View className="h-2.5 bg-slate-200 rounded w-1/2" />
                  </View>
                  <View className="h-5 w-16 bg-slate-200 rounded-full" />
                </View>
                <View className="h-2.5 bg-slate-200 rounded w-2/3 mb-3" />
                <View className="flex-row" style={{ columnGap: 8 }}>
                  <View className="flex-1 h-11 bg-slate-200 rounded-lg" />
                  <View className="flex-1 h-11 bg-slate-200 rounded-lg" />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Product cards */}
        {!error && filteredProducts.length > 0 ? (
          <View style={{ rowGap: 12 }}>
            {filteredProducts.map((p) => {
              const badge = APPROVAL_STYLE[p.approvalStatus] || { bg: 'bg-slate-100', text: 'text-slate-800' };
              const canInspect = p.approvalStatus === 'PENDING' || p.approvalStatus === 'REINSPECTION';
              const primaryImage = p.images?.find((img) => img.isPrimary) || p.images?.[0];
              return (
                <View
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4"
                  style={{ shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
                >
                  <View className="flex-row items-start mb-3" style={{ columnGap: 10 }}>
                    <View
                      className={`w-14 h-14 rounded-xl items-center justify-center overflow-hidden ${
                        primaryImage?.url ? 'bg-slate-100' : 'bg-brand-50'
                      }`}
                    >
                      {primaryImage?.url ? (
                        <Image
                          source={{ uri: primaryImage.url }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Package size={22} color={brand[500]} strokeWidth={2.25} />
                      )}
                    </View>
                    <View className="flex-1">
                      <AppText variant="titleLg" color={colors.text} numberOfLines={2}>
                        {p.name}
                      </AppText>
                      <Text className="text-xs text-slate-500 mt-0.5">SKU: {p.baseSku}</Text>
                    </View>
                    <View className={`px-2.5 py-1 rounded-full ${badge.bg}`}>
                      <Text className={`text-[10px] font-bold ${badge.text}`}>
                        {formatStatus(p.approvalStatus)}
                      </Text>
                    </View>
                  </View>

                  <View className="mb-3" style={{ rowGap: 4 }}>
                    <Text className="text-xs text-slate-600">
                      <Text className="font-semibold">{p.vendor.companyName}</Text>
                      {p.vendor.ownerName ? ` · ${p.vendor.ownerName}` : ''}
                    </Text>
                    <Text className="text-xs text-slate-500">{p.category}</Text>
                  </View>

                  <View className="flex-row" style={{ columnGap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleView(p)}
                      activeOpacity={0.8}
                      accessibilityLabel="View Details"
                      className="w-12 items-center justify-center bg-slate-100 rounded-lg py-2.5"
                    >
                      <Eye size={16} color="#475569" />
                    </TouchableOpacity>
                    {canInspect ? (
                      <TouchableOpacity
                        onPress={() => handleStartInspection(p)}
                        activeOpacity={0.85}
                        className="flex-1 flex-row items-center justify-center bg-brand-500 rounded-lg py-2.5"
                      >
                        <ArrowRight size={14} color="#ffffff" />
                        <Text className="ml-1.5 text-sm font-bold text-white">Start Inspect</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Empty */}
        {!loading && !error && filteredProducts.length === 0 ? (
          <View className="py-12 items-center">
            <View className="w-20 h-20 rounded-2xl bg-slate-100 items-center justify-center mb-4">
              <Package size={36} color="#94a3b8" strokeWidth={1.75} />
            </View>
            <Text className="text-base font-bold text-slate-900 mb-1 text-center">
              {hasActiveFilters ? 'No products match your filters' : 'No assigned products'}
            </Text>
            <Text className="text-sm text-slate-500 text-center mb-4">
              {hasActiveFilters
                ? 'Try adjusting or clearing your filters.'
                : 'Products assigned to you will appear here.'}
            </Text>
            {hasActiveFilters ? (
              <Button label="Clear filters" onPress={clearFilters} variant="primary" />
            ) : null}
          </View>
        ) : null}

        {/* Pagination — server-side; hidden while a client-side date filter narrows the set */}
        {!dateFrom && pagination.totalPages > 1 ? (
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} disabled={loading} />
        ) : null}
      </ScrollView>

      {/* Modals */}
      <OptionModal
        visible={showStatusModal}
        title="Filter by status"
        options={STATUS_OPTIONS}
        value={status}
        onSelect={(v) => { setStatus(v); setShowStatusModal(false); }}
        onClose={() => setShowStatusModal(false)}
      />
      <OptionModal
        visible={showSortModal}
        title="Sort by"
        options={SORT_OPTIONS}
        value={sort}
        onSelect={(v) => { setSort(v); setShowSortModal(false); }}
        onClose={() => setShowSortModal(false)}
      />
    </View>
  );
}

// ── Shared components (same as vendors) ──────────────────────────────────────

function OptionModal({
  visible, title, options, value, onSelect, onClose,
}: {
  visible: boolean; title: string;
  options: { value: string; label: string }[];
  value: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose}
        className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
      >
        <View className="bg-white rounded-2xl w-11/12 max-w-sm overflow-hidden">
          <View className="px-5 py-4 border-b border-slate-100">
            <Text className="text-base font-bold text-slate-900">{title}</Text>
          </View>
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <TouchableOpacity key={opt.value} onPress={() => onSelect(opt.value)}
                className={`px-5 py-3.5 flex-row items-center justify-between border-b border-slate-100 ${active ? 'bg-brand-50' : ''}`}
              >
                <Text className={`text-sm ${active ? 'text-brand-700 font-bold' : 'text-slate-700'}`}>{opt.label}</Text>
                {active ? <CheckCircle size={16} color={brand[500]} /> : null}
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
        <Text className="text-xs font-semibold text-slate-700 ml-1">Prev</Text>
      </TouchableOpacity>
      {pages.map((p, i) =>
        p === '…' ? (
          <Text key={`el-${i}`} className="px-2 text-slate-400">…</Text>
        ) : (
          <TouchableOpacity key={p} onPress={() => onChange(p)} disabled={disabled}
            className={`min-w-9 px-3 py-2 rounded-lg border ${
              p === page ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-200'
            }`} style={{ opacity: disabled ? 0.4 : 1 }}
          >
            <Text className={`text-xs font-bold text-center ${p === page ? 'text-white' : 'text-slate-700'}`}>{p}</Text>
          </TouchableOpacity>
        ),
      )}
      <TouchableOpacity onPress={() => onChange(page + 1)} disabled={disabled || page >= totalPages}
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
  if (current > 4) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('…');
  pages.push(total);
  return pages;
}
