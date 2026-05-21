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
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Factory,
  Package,
  FileText,
} from 'lucide-react-native';
import { router } from 'expo-router';
import qcCheckerService from '../../../services/qcCheckerService';
import { useDebounce } from '../../../hooks/useDebounce';

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

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('factory');

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 pt-5 pb-3">
        <Text className="text-2xl font-extrabold text-slate-900 mb-1">Inspection Reports</Text>
        <Text className="text-slate-600 text-sm">Your completed quality control reports</Text>
      </View>

      {/* Tab Bar */}
      <View className="flex-row mx-4 mb-3 bg-slate-200 rounded-xl p-1">
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
                isActive ? 'bg-white' : ''
              }`}
              style={isActive ? {
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              } : undefined}
            >
              <Icon size={15} color={isActive ? '#0f172a' : '#64748b'} strokeWidth={2.25} />
              <Text className={`ml-1.5 text-sm font-bold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  }, [debouncedSearch, resultFilter, sort]);

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

  const hasActiveFilters = Boolean(debouncedSearch || resultFilter || sort !== DEFAULT_SORT || page !== 1);
  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);
  const clearFilters = () => { setSearchInput(''); setResultFilter(''); setSort(DEFAULT_SORT); setPage(1); };

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
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReports(); }} tintColor="#2563eb" colors={['#2563eb']} />}
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

      {/* Filter + Sort */}
      <View className="flex-row mb-3" style={{ columnGap: 8 }}>
        <TouchableOpacity onPress={() => setShowResultModal(true)}
          className="flex-1 flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5"
        >
          <Text className="text-sm text-slate-900" numberOfLines={1}>{resultLabel}</Text>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSortModal(true)}
          className="flex-1 flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5"
        >
          <Text className="text-sm text-slate-900" numberOfLines={1}>{sortLabel}</Text>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xs text-slate-600">
          {loading && inspections.length === 0 ? '' : pagination.total === 0 ? '0 reports' : `Showing ${rangeStart}–${rangeEnd} of ${pagination.total}`}
        </Text>
        {hasActiveFilters ? (
          <TouchableOpacity onPress={clearFilters}>
            <Text className="text-xs font-semibold text-blue-600 underline">Clear filters</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Error */}
      {error && !loading ? (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3">
          <Text className="text-sm text-red-700 mb-2">{error}</Text>
          <TouchableOpacity onPress={loadReports} className="bg-red-600 rounded-lg px-4 py-2 self-start flex-row items-center">
            <RefreshCw size={14} color="#ffffff" />
            <Text className="text-white font-semibold text-sm ml-2">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Skeleton */}
      {loading && inspections.length === 0 && !error ? (
        <View style={{ rowGap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1"><View className="h-3.5 bg-slate-200 rounded w-3/4 mb-2" /><View className="h-2.5 bg-slate-200 rounded w-1/2" /></View>
                <View className="h-5 w-16 bg-slate-200 rounded-full" />
              </View>
              <View className="flex-row mb-3" style={{ columnGap: 8 }}>
                <View className="flex-1 h-2.5 bg-slate-200 rounded" />
                <View className="flex-1 h-2.5 bg-slate-200 rounded" />
              </View>
              <View className="h-9 bg-slate-200 rounded-lg" />
            </View>
          ))}
        </View>
      ) : null}

      {/* Cards */}
      {!error && inspections.length > 0 ? (
        <View style={{ rowGap: 10 }}>
          {inspections.map((insp) => {
            const row = buildRow(insp);
            return (
              <View key={insp.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 mr-3">
                    <Text className="text-base font-bold text-slate-900 mb-0.5" numberOfLines={1}>{row.vendor}</Text>
                    <Text className="text-xs text-slate-500">{row.factoryName}</Text>
                  </View>
                  <ResultBadge result={row.result} />
                </View>
                <View className="flex-row flex-wrap mb-3 pb-3 border-b border-slate-100" style={{ columnGap: 16, rowGap: 4 }}>
                  <View>
                    <Text className="text-[10px] text-slate-400 font-bold uppercase">Client</Text>
                    <Text className="text-xs text-slate-700 font-medium">{row.clientName}</Text>
                  </View>
                  <View>
                    <Text className="text-[10px] text-slate-400 font-bold uppercase">Completed</Text>
                    <Text className="text-xs text-slate-700 font-medium">{row.inspectionDate}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/factory-report/[id]' as any, params: { id: insp.id } })}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-center bg-slate-100 rounded-lg py-2.5"
                >
                  <Eye size={14} color="#475569" />
                  <Text className="text-slate-700 font-semibold text-sm ml-2">View Report</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Empty */}
      {!loading && !error && inspections.length === 0 ? (
        <View className="py-12 items-center">
          <View className="w-20 h-20 rounded-2xl bg-slate-100 items-center justify-center mb-4">
            <Factory size={36} color="#94a3b8" />
          </View>
          <Text className="text-base font-bold text-slate-900 mb-1">{hasActiveFilters ? 'No reports match filters' : 'No reports yet'}</Text>
          <Text className="text-sm text-slate-500 text-center mb-4">
            {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Completed factory inspections will appear here.'}
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
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput, 300);

  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSortModal, setShowSortModal] = useState(false);

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    setPage(1);
  }, [debouncedSearch, sort]);

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

  const hasActiveFilters = Boolean(debouncedSearch || sort !== 'updatedAt:desc' || page !== 1);
  const clearFilters = () => { setSearchInput(''); setSort('updatedAt:desc'); setPage(1); };
  const sortLabel = PRODUCT_SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Latest first';

  const APPROVAL_STYLE: Record<string, { bg: string; text: string }> = {
    QC_APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-800' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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

      {/* Sort */}
      <View className="flex-row mb-3">
        <TouchableOpacity onPress={() => setShowSortModal(true)}
          className="flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5"
          style={{ width: '50%' }}
        >
          <Text className="text-sm text-slate-900" numberOfLines={1}>{sortLabel}</Text>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Cards */}
      {loading && products.length === 0 ? (
        <View style={{ rowGap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
              <View className="h-3.5 bg-slate-200 rounded w-3/4 mb-2" />
              <View className="h-2.5 bg-slate-200 rounded w-1/2 mb-3" />
              <View className="h-9 bg-slate-200 rounded-lg" />
            </View>
          ))}
        </View>
      ) : error ? (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4">
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      ) : products.length === 0 ? (
        <View className="py-12 items-center">
          <View className="w-20 h-20 rounded-2xl bg-slate-100 items-center justify-center mb-4">
            <Package size={36} color="#94a3b8" />
          </View>
          <Text className="text-base font-bold text-slate-900 mb-1">{hasActiveFilters ? 'No matches' : 'No product reports'}</Text>
          <Text className="text-sm text-slate-500 text-center">
            {hasActiveFilters ? 'Try adjusting your search.' : 'QC approved products will appear here.'}
          </Text>
        </View>
      ) : (
        <View style={{ rowGap: 10 }}>
          {products.map((p: any) => {
            const badge = APPROVAL_STYLE[p.approvalStatus] || { bg: 'bg-slate-100', text: 'text-slate-700' };
            return (
              <View key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-3">
                    <Text className="text-base font-bold text-slate-900 mb-0.5" numberOfLines={1}>{p.name}</Text>
                    <Text className="text-xs text-slate-500">SKU: {p.baseSku}</Text>
                  </View>
                  <View className={`px-2.5 py-1 rounded-full ${badge.bg}`}>
                    <Text className={`text-[10px] font-bold ${badge.text}`}>{p.approvalStatus?.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
                <Text className="text-xs text-slate-600 mb-3">
                  {p.vendor?.companyName || '—'} · {p.category}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/product-report/[id]' as any, params: { id: p.id } })}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-center bg-slate-100 rounded-lg py-2.5"
                >
                  <Eye size={14} color="#475569" />
                  <Text className="text-slate-700 font-semibold text-sm ml-2">View Report</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {pagination.totalPages > 1 ? (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} disabled={loading} />
      ) : null}

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
        <Text className="text-[10px] font-bold text-emerald-700">Passed</Text>
      </View>
    );
  }
  if (result === 'FAILED') {
    return (
      <View className="flex-row items-center bg-red-100 px-2.5 py-1 rounded-full border border-red-200" style={{ columnGap: 4 }}>
        <XCircle size={10} color="#dc2626" />
        <Text className="text-[10px] font-bold text-red-700">Failed</Text>
      </View>
    );
  }
  return (
    <View className="bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
      <Text className="text-[10px] font-bold text-slate-700">{result || '—'}</Text>
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
