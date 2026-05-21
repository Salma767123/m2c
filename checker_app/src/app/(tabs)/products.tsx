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
} from 'react-native';
import {
  Search,
  Eye,
  FileText,
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { useDebounce } from '../../hooks/useDebounce';
import { router } from 'expo-router';

const PAGE_SIZE = 12;
const DEFAULT_SORT = 'createdAt:desc';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
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

const APPROVAL_STYLE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-800' },
  REINSPECTION: { bg: 'bg-orange-100', text: 'text-orange-800' },
  QC_APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-800' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  REINSPECTION: 'Reinspection',
  QC_APPROVED: 'Approved by QC',
  APPROVED: 'Approved by Admin',
  REJECTED: 'Rejected',
  UNDER_REVIEW: 'Under Review',
};

const formatStatus = (status: string) =>
  STATUS_LABELS[status] || status.replace(/_/g, ' ');

interface Product {
  id: string;
  name: string;
  baseSku: string;
  category: string;
  basePrice: number;
  totalStock: number;
  status: string;
  approvalStatus: string;
  images?: Array<{ url: string; isPrimary: boolean }>;
  vendor: { companyName: string; ownerName: string };
}

export default function ProductsTab() {
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput, 300);

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
  }, [debouncedSearch, status, sort]);

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

  const hasActiveFilters = Boolean(debouncedSearch || status || sort !== DEFAULT_SORT || page !== 1);
  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);
  const clearFilters = () => { setSearchInput(''); setStatus(''); setSort(DEFAULT_SORT); setPage(1); };

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label || 'All statuses';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Newest first';

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
        <Text className="text-2xl font-extrabold text-slate-900 mb-1">Assigned Products</Text>
        <Text className="text-slate-600 text-sm">Review and inspect vendor products</Text>
      </View>

      {/* Search */}
      <View className="mb-3 flex-row items-center bg-white border border-slate-300 rounded-xl px-4 py-2.5">
        <Search size={18} color="#94a3b8" />
        <TextInput
          placeholder="Search product, SKU, category, vendor..."
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
      <View className="flex-row mb-4" style={{ columnGap: 8 }}>
        <TouchableOpacity
          onPress={() => setShowStatusModal(true)}
          className="flex-1 flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5"
        >
          <Text className="text-sm text-slate-900" numberOfLines={1}>{statusLabel}</Text>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowSortModal(true)}
          className="flex-1 flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5"
        >
          <Text className="text-sm text-slate-900" numberOfLines={1}>{sortLabel}</Text>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Summary + Clear */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xs text-slate-600">
          {loading && products.length === 0
            ? ''
            : pagination.total === 0
              ? '0 products'
              : `Showing ${rangeStart}–${rangeEnd} of ${pagination.total}`}
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
            onPress={loadProducts}
            className="bg-red-600 rounded-lg px-4 py-2 flex-row items-center justify-center self-start"
          >
            <RefreshCw size={14} color="#ffffff" />
            <Text className="text-white font-semibold text-sm ml-2">Retry</Text>
          </TouchableOpacity>
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
                <View className="flex-1 h-9 bg-slate-200 rounded-lg" />
                <View className="flex-1 h-9 bg-slate-200 rounded-lg" />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Product cards */}
      {!error && products.length > 0 ? (
        <View style={{ rowGap: 12 }}>
          {products.map((p) => {
            const badge = APPROVAL_STYLE[p.approvalStatus] || { bg: 'bg-slate-100', text: 'text-slate-800' };
            const canInspect = p.approvalStatus === 'PENDING' || p.approvalStatus === 'REINSPECTION';
            const primaryImage = p.images?.find((img) => img.isPrimary) || p.images?.[0];
            return (
              <View key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <View className="flex-row items-start mb-3" style={{ columnGap: 10 }}>
                  <View className="w-14 h-14 rounded-xl bg-slate-100 items-center justify-center overflow-hidden">
                    {primaryImage?.url ? (
                      <Image
                        source={{ uri: primaryImage.url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Package size={22} color="#94a3b8" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-slate-900 text-base mb-0.5" numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text className="text-xs text-slate-500">SKU: {p.baseSku}</Text>
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
                    className="flex-1 flex-row items-center justify-center bg-slate-100 rounded-lg py-2.5"
                  >
                    <Eye size={14} color="#475569" />
                    <Text className="text-slate-700 font-semibold text-sm ml-2">View</Text>
                  </TouchableOpacity>
                  {canInspect ? (
                    <TouchableOpacity
                      onPress={() => handleStartInspection(p)}
                      activeOpacity={0.85}
                      className="flex-1 flex-row items-center justify-center bg-blue-600 rounded-lg py-2.5"
                    >
                      <FileText size={14} color="#ffffff" />
                      <Text className="text-white font-semibold text-sm ml-2">Inspect</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Empty */}
      {!loading && !error && products.length === 0 ? (
        <View className="py-12 items-center">
          <View className="w-20 h-20 rounded-2xl bg-slate-100 items-center justify-center mb-4">
            <AlertCircle size={36} color="#94a3b8" strokeWidth={1.75} />
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
            <TouchableOpacity onPress={clearFilters} className="bg-blue-600 rounded-lg px-4 py-2.5">
              <Text className="text-white font-semibold text-sm">Clear filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Pagination */}
      {pagination.totalPages > 1 ? (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} disabled={loading} />
      ) : null}

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
    </ScrollView>
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
                className={`px-5 py-3.5 flex-row items-center justify-between border-b border-slate-100 ${active ? 'bg-blue-50' : ''}`}
              >
                <Text className={`text-sm ${active ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>{opt.label}</Text>
                {active ? <View className="w-2 h-2 rounded-full bg-blue-600" /> : null}
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
              p === page ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
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
