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

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-800' },
  UNDER_ADMIN_REVIEW: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-800' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
  REINSPECTION: { label: 'Re-Inspection', className: 'bg-amber-100 text-amber-800' },
};

function getStatusBadge(status: string) {
  const config = STATUS_BADGE[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
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
  }, [activeTab, search]);

  const total = activeTab === 'factory' ? totalFactory : totalProduct;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Re-Inspection Review</h1>
          <p className="text-sm text-gray-500 mt-1">Review submitted and rejected inspections</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <IconClock size={16} />
              Total Pending
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalPendingReview}</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <IconBuilding size={16} />
              Factory Pending
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.factory.pendingReview}</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <IconPackage size={16} />
              Product Pending
            </div>
            <div className="text-2xl font-bold text-purple-600">{stats.product.pendingReview}</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <IconAlertTriangle size={16} />
              Re-Inspections
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {stats.factory.reinspection + stats.product.reinspection}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('factory')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'factory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <IconBuilding size={16} className="inline mr-1.5 -mt-0.5" />
            Factory Inspections
            {stats && stats.factory.pendingReview > 0 && (
              <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">{stats.factory.pendingReview}</Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('product')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'product'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <IconPackage size={16} className="inline mr-1.5 -mt-0.5" />
            Product Inspections
            {stats && stats.product.pendingReview > 0 && (
              <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs">{stats.product.pendingReview}</Badge>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${activeTab === 'factory' ? 'vendor' : 'product'} name...`}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <IconLoader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : activeTab === 'factory' ? (
            <FactoryTable
              inspections={factoryInspections}
              onViewDetails={id => router.push(`/admin/dashboard/reinspection-review/factory/${id}`)}
            />
          ) : (
            <ProductTable
              inspections={productInspections}
              onViewDetails={id => router.push(`/admin/dashboard/reinspection-review/product/${id}`)}
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-gray-500">
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
      <div className="py-16 text-center text-gray-500">
        <IconBuilding size={32} className="mx-auto mb-2 opacity-30" />
        <p>No factory inspections pending review</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
          <th className="px-4 py-3">Vendor</th>
          <th className="px-4 py-3">Checker</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Result</th>
          <th className="px-4 py-3">Cycle</th>
          <th className="px-4 py-3">Submitted</th>
          <th className="px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {inspections.map(ins => (
          <tr key={ins.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3">
              <div className="font-medium text-sm text-gray-900">{ins.vendor.companyName}</div>
              <div className="text-xs text-gray-500">
                {ins.vendor.businessCity && `${ins.vendor.businessCity}, ${ins.vendor.businessState}`}
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">{ins.checker.name}</td>
            <td className="px-4 py-3">{getStatusBadge(ins.status)}</td>
            <td className="px-4 py-3">
              {ins.result === 'PASSED' ? (
                <Badge className="bg-green-100 text-green-800">Passed</Badge>
              ) : ins.result === 'FAILED' ? (
                <Badge className="bg-red-100 text-red-800">Failed</Badge>
              ) : (
                <span className="text-gray-400 text-sm">—</span>
              )}
            </td>
            <td className="px-4 py-3">
              {ins.cycleNumber > 1 ? (
                <Badge className="bg-indigo-100 text-indigo-800">#{ins.cycleNumber}</Badge>
              ) : (
                <span className="text-gray-400 text-sm">#1</span>
              )}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(ins.submittedAt)}</td>
            <td className="px-4 py-3">
              <Button size="sm" variant="outline" onClick={() => onViewDetails(ins.id)}>
                <IconEye size={14} className="mr-1" />
                Review
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
      <div className="py-16 text-center text-gray-500">
        <IconPackage size={32} className="mx-auto mb-2 opacity-30" />
        <p>No product inspections pending review</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">
          <th className="px-4 py-3">Product</th>
          <th className="px-4 py-3">Vendor</th>
          <th className="px-4 py-3">QC Checker</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Cycle</th>
          <th className="px-4 py-3">Updated</th>
          <th className="px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {inspections.map(product => (
          <tr key={product.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3">
              <div className="font-medium text-sm text-gray-900">{product.name}</div>
              <div className="text-xs text-gray-500">SKU: {product.baseSku}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">{product.vendor.companyName}</td>
            <td className="px-4 py-3 text-sm text-gray-700">{product.assignedQc?.name || '—'}</td>
            <td className="px-4 py-3">{getStatusBadge(product.approvalStatus)}</td>
            <td className="px-4 py-3">
              {product.inspectionCycleNumber > 1 ? (
                <Badge className="bg-indigo-100 text-indigo-800">#{product.inspectionCycleNumber}</Badge>
              ) : (
                <span className="text-gray-400 text-sm">#1</span>
              )}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(product.updatedAt)}</td>
            <td className="px-4 py-3">
              <Button size="sm" variant="outline" onClick={() => onViewDetails(product.id)}>
                <IconEye size={14} className="mr-1" />
                Review
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
