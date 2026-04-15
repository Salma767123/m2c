import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { router } from 'expo-router';

const PAGE_SIZE = 12;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const SORT_OPTIONS = [
  { value: 'submittedAt:desc', label: 'Newest first' },
  { value: 'submittedAt:asc', label: 'Oldest first' },
  { value: 'companyName:asc', label: 'Name A–Z' },
  { value: 'companyName:desc', label: 'Name Z–A' },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  UNDER_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  SUSPENDED: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
};

const INSPECTION_PRIORITY = ['IN_PROGRESS', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;

type VendorStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
const VALID_STATUSES: readonly VendorStatus[] = [
  'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED',
];
const toVendorStatus = (s: string | null | undefined): VendorStatus =>
  (VALID_STATUSES as readonly string[]).includes(s ?? '') ? (s as VendorStatus) : 'PENDING';

interface Vendor {
  id: string;
  name: string;
  location: string;
  submittedDate?: string;
  status: VendorStatus;
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

const transformVendor = (v: any): Vendor => ({
  id: v.id,
  name: v.companyName,
  location: formatLocation(v.factoryCity, v.factoryState),
  submittedDate: v.submittedAt
    ? new Date(v.submittedAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : undefined,
  status: toVendorStatus(v.status),
  inspectionStatus: pickInspectionStatus(v.inspections),
});

const formatStatus = (s: string) => s.replace(/_/g, ' ').toLowerCase();

export default function VendorsTab() {
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('submittedAt:desc');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchInput, 300);

  const [vendors, setVendors] = useState<Vendor[]>([]);
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
    return [by || 'submittedAt', (ord as 'asc' | 'desc') || 'desc'];
  }, [sort]);

  const requestIdRef = useRef(0);

  const loadVendors = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setError(null);
    if (!refreshing) setLoading(true);
    try {
      const res = await qcCheckerService.getAssignedVendors({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
      });
      if (requestId !== requestIdRef.current) return;
      if (res.success) {
        setVendors((res.data.vendors || []).map(transformVendor));
        setPagination(res.data.pagination);
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
  }, [page, debouncedSearch, status, sortBy, sortOrder, refreshing]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVendors();
  }, [loadVendors]);

  const hasActiveFilters = Boolean(debouncedSearch || status || sort !== 'submittedAt:desc' || page !== 1);
  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  const clearFilters = () => {
    setSearchInput(''); setStatus(''); setSort('submittedAt:desc'); setPage(1);
  };

  const handleViewDetails = (v: Vendor) => {
    router.push({ pathname: '/vendors/[id]' as any, params: { id: v.id, name: v.name } });
  };

  const handleStartInspection = (v: Vendor) => {
    router.push({ pathname: '/vendors/[id]/inspection' as any, params: { id: v.id, name: v.name } });
  };

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label || 'All statuses';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Newest first';

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
      <View className="mb-5 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-extrabold text-slate-900 mb-1">Vendor Management</Text>
          <Text className="text-slate-600 text-sm">Select a vendor to start quality inspection</Text>
        </View>
        <TouchableOpacity
          onPress={loadVendors}
          disabled={loading}
          accessibilityLabel="Refresh vendors"
          className="w-10 h-10 items-center justify-center rounded-xl bg-white border border-slate-200"
          style={{ opacity: loading ? 0.5 : 1 }}
        >
          <RefreshCw size={16} color="#475569" />
        </TouchableOpacity>
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
          {loading && vendors.length === 0
            ? 'Loading vendors...'
            : pagination.total === 0
              ? '0 vendors'
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
      {!error && vendors.length > 0 ? (
        <View style={{ rowGap: 12 }}>
          {vendors.map((v) => {
            const pill = STATUS_STYLE[v.status] || STATUS_STYLE.PENDING;
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
                    <Text className={`text-[10px] font-bold capitalize ${pill.text}`}>
                      {formatStatus(v.status)}
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
      {!loading && !error && vendors.length === 0 ? (
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
      {pagination.totalPages > 1 ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
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
