'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import reinspectionService, {
  FactoryInspectionReview,
  ProductInspectionReview,
  ReviewDashboardStats,
} from '@/services/reinspectionService';
import { Badge } from '@/components/UI/Badge';
import { Button } from '@/components/UI/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table';
import { Card, CardContent } from '@/components/UI/Card';
import Dropdown from '@/components/UI/Dropdown';
import DateRangeCalendar, { fmtDate } from '@/components/Shared/DateRangeCalendar';
import {
  IconBuilding,
  IconPackage,
  IconClock,
  IconAlertTriangle,
  IconRefresh,
  IconSearch,
  IconLoader2,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { formatCheckerName } from '@/lib/checkerUtils';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  SUBMITTED: { label: 'Submitted', className: 'bg-brand-50 text-brand-700 border border-brand-200' },
  UNDER_ADMIN_REVIEW: { label: 'Under Review', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700 border border-red-200' },
  REINSPECTION: { label: 'Re-Inspection', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

function getStatusBadge(status: string) {
  const config = STATUS_BADGE[status] || { label: status, className: 'bg-slate-50 text-slate-700 border border-slate-200' };
  return <Badge className={config.className}>{config.label}</Badge>;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ReinspectionReviewDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'factory' | 'product'>('factory');
  const [stats, setStats] = useState<ReviewDashboardStats | null>(null);
  const [factoryInspections, setFactoryInspections] = useState<FactoryInspectionReview[]>([]);
  const [productInspections, setProductInspections] = useState<ProductInspectionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalFactory, setTotalFactory] = useState(0);
  const [totalProduct, setTotalProduct] = useState(0);
  const limit = 12;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, inspectionsRes] = await Promise.all([
        reinspectionService.getStats(),
        reinspectionService.getInspectionsForReview({
          page,
          limit,
          type: activeTab,
          search: search || undefined,
        }),
      ]);

      setStats(statsRes.stats);

      if (activeTab === 'factory') {
        setFactoryInspections(inspectionsRes.factory);
        setTotalFactory(inspectionsRes.pagination.factoryTotal || 0);
      } else {
        setProductInspections(inspectionsRes.product);
        setTotalProduct(inspectionsRes.pagination.productTotal || 0);
      }
    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, statusFilter, dateFrom, dateTo]);

  // Status vocab differs per tab, so reset the status filter on tab switch.
  useEffect(() => {
    setStatusFilter('all');
  }, [activeTab]);

  // Client-side status + date filtering (search is handled server-side).
  const inDateRange = (dateStr: string | null) => {
    if (!dateFrom && !dateTo) return true;
    if (!dateStr) return false;
    const d = fmtDate(new Date(dateStr));
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  };
  const filteredFactory = factoryInspections.filter(
    (ins) => (statusFilter === 'all' || ins.status === statusFilter) && inDateRange(ins.submittedAt)
  );
  const filteredProduct = productInspections.filter(
    (p) => (statusFilter === 'all' || p.approvalStatus === statusFilter) && inDateRange(p.updatedAt)
  );

  const statusOptions = activeTab === 'factory'
    ? [
        { value: 'all', label: 'All Statuses' },
        { value: 'SUBMITTED', label: 'Submitted' },
        { value: 'UNDER_ADMIN_REVIEW', label: 'Under Review' },
        { value: 'REJECTED', label: 'Rejected' },
        { value: 'REINSPECTION', label: 'Re-Inspection' },
      ]
    : [
        { value: 'all', label: 'All Statuses' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'QC_APPROVED', label: 'QC Approved' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'REJECTED', label: 'Rejected' },
        { value: 'REINSPECTION', label: 'Re-Inspection' },
      ];

  const total = activeTab === 'factory' ? totalFactory : totalProduct;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Re-Inspection Review</h1>
          <p className="text-sm text-slate-500 mt-1">Review submitted and rejected inspections</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards — the Factory/Product cards jump to that tab */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Pending',   subtitle: 'Awaiting review', value: stats.totalPendingReview,                              Icon: IconClock,         iconBg: 'bg-brand-50',   iconColor: 'text-brand-500',   countColor: 'text-slate-900',  tab: null,        activeClass: '' },
            { label: 'Factory Pending', subtitle: 'Factory queue',   value: stats.factory.pendingReview,                           Icon: IconBuilding,      iconBg: 'bg-blue-50',    iconColor: 'text-blue-500',    countColor: 'text-blue-700',   tab: 'factory',   activeClass: 'border-blue-400 bg-blue-50/60' },
            { label: 'Product Pending', subtitle: 'Product queue',   value: stats.product.pendingReview,                           Icon: IconPackage,       iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500',  countColor: 'text-indigo-700', tab: 'product',   activeClass: 'border-indigo-400 bg-indigo-50/60' },
            { label: 'Re-Inspections',  subtitle: 'Sent back',       value: stats.factory.reinspection + stats.product.reinspection, Icon: IconAlertTriangle, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', countColor: 'text-amber-700', tab: null,        activeClass: '' },
          ].map(({ label, subtitle, value, Icon, iconBg, iconColor, countColor, tab, activeClass }) => {
            const clickable = tab !== null;
            const isActive = clickable && activeTab === tab;
            const body = (
              <>
                <div className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                  <span className="text-sm font-medium text-slate-500">{label}</span>
                  <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace('50', '100') : iconBg} transition-transform duration-150 ${clickable ? 'group-hover:scale-110' : ''}`}>
                    <Icon size={16} className={iconColor} />
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <div className={`text-2xl font-bold ${countColor}`}>{value}</div>
                  <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                </div>
              </>
            );
            return clickable ? (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(tab as 'factory' | 'product')}
                className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${isActive ? activeClass : 'border-slate-200/80 hover:border-slate-300'}`}
              >
                {body}
              </button>
            ) : (
              <div key={label} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                {body}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('factory')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'factory' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <IconBuilding size={16} />
            Factory Inspections
            {stats && stats.factory.pendingReview > 0 && (
              <Badge className="bg-brand-50 text-brand-700 border border-brand-200 text-xs">{stats.factory.pendingReview}</Badge>
            )}
          </div>
          {activeTab === 'factory' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />}
        </button>
        <button
          onClick={() => setActiveTab('product')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'product' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <IconPackage size={16} />
            Product Inspections
            {stats && stats.product.pendingReview > 0 && (
              <Badge className="bg-brand-50 text-brand-700 border border-brand-200 text-xs">{stats.product.pendingReview}</Badge>
            )}
          </div>
          {activeTab === 'product' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />}
        </button>
      </div>

      {/* Filter bar + table */}
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-start">
          <div className="relative">
            <IconSearch size={16} className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search by ${activeTab === 'factory' ? 'vendor' : 'product'} name...`}
              className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent transition-all bg-white shadow-sm text-sm"
            />
          </div>
          <DateRangeCalendar
            from={dateFrom}
            to={dateTo}
            placeholder={activeTab === 'factory' ? 'Submitted Date' : 'Updated Date'}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          />
          <div className="min-w-[150px]">
            <Dropdown
              value={statusFilter}
              onChange={(v) => setStatusFilter(Array.isArray(v) ? v[0] ?? 'all' : v)}
              options={statusOptions}
              placeholder="All Statuses"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <IconLoader2 size={24} className="animate-spin text-slate-400" />
                </div>
              ) : activeTab === 'factory' ? (
                <FactoryTable
                  inspections={filteredFactory}
                  onViewDetails={id => router.push(`/admin/dashboard/reinspection-review/factory/${id}`)}
                />
              ) : (
                <ProductTable
                  inspections={filteredProduct}
                  onViewDetails={id => router.push(`/admin/dashboard/reinspection-review/product/${id}`)}
                />
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <span className="text-sm text-slate-500">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                    <IconChevronLeft size={14} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                    <IconChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FactoryTable({
  inspections,
  onViewDetails,
}: {
  inspections: FactoryInspectionReview[];
  onViewDetails: (id: string) => void;
}) {
  if (inspections.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500">
        <IconBuilding size={32} className="mx-auto mb-2 opacity-30" />
        <p>No factory inspections pending review</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
        <TableRow>
          <TableHead>Vendor</TableHead>
          <TableHead>Checker</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Result</TableHead>
          <TableHead>Cycle</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inspections.map(ins => (
          <TableRow key={ins.id}>
            <TableCell>
              <div className="font-medium text-slate-900">{ins.vendor.companyName}</div>
              <div className="text-xs text-slate-500">
                {ins.vendor.businessCity && `${ins.vendor.businessCity}, ${ins.vendor.businessState}`}
              </div>
            </TableCell>
            <TableCell className="text-sm text-slate-700">{formatCheckerName(ins.checker)}</TableCell>
            <TableCell>{getStatusBadge(ins.status)}</TableCell>
            <TableCell>
              {ins.result === 'PASSED' ? (
                <Badge className="bg-green-50 text-green-700 border border-green-200">Passed</Badge>
              ) : ins.result === 'FAILED' ? (
                <Badge className="bg-red-50 text-red-700 border border-red-200">Failed</Badge>
              ) : (
                <span className="text-slate-400 text-sm">—</span>
              )}
            </TableCell>
            <TableCell>
              {ins.cycleNumber > 1 ? (
                <Badge className="bg-brand-50 text-brand-700 border border-brand-200">#{ins.cycleNumber}</Badge>
              ) : (
                <span className="text-slate-400 text-sm">#1</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-slate-500">{formatDate(ins.submittedAt)}</TableCell>
            <TableCell>
              <Button size="sm" variant="outline" onClick={() => onViewDetails(ins.id)}>
                <IconEye size={14} className="mr-1" />
                Review
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ProductTable({
  inspections,
  onViewDetails,
}: {
  inspections: ProductInspectionReview[];
  onViewDetails: (id: string) => void;
}) {
  if (inspections.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500">
        <IconPackage size={32} className="mx-auto mb-2 opacity-30" />
        <p>No product inspections pending review</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>QC Checker</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Cycle</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inspections.map(product => (
          <TableRow key={product.id}>
            <TableCell>
              <div className="font-medium text-slate-900">{product.name}</div>
              <div className="text-xs text-slate-500">SKU: {product.baseSku}</div>
            </TableCell>
            <TableCell className="text-sm text-slate-700">{product.vendor.companyName}</TableCell>
            <TableCell className="text-sm text-slate-700">{product.assignedQc?.name || '—'}</TableCell>
            <TableCell>{getStatusBadge(product.approvalStatus)}</TableCell>
            <TableCell>
              {product.inspectionCycleNumber > 1 ? (
                <Badge className="bg-brand-50 text-brand-700 border border-brand-200">#{product.inspectionCycleNumber}</Badge>
              ) : (
                <span className="text-slate-400 text-sm">#1</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-slate-500">{formatDate(product.updatedAt)}</TableCell>
            <TableCell>
              <Button size="sm" variant="outline" onClick={() => onViewDetails(product.id)}>
                <IconEye size={14} className="mr-1" />
                Review
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
