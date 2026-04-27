'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Edit, Trash2, ShoppingBag, ChevronLeft, ChevronRight, Package, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/UI/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table';
import Dropdown from '@/components/UI/Dropdown';
import BagTypeModal from './BagTypeModal';
import bagTypeService, { BagType } from '@/services/bagTypeService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { Breadcrumb } from '../Breadcrumb/Breadcrumb';

const PAGE_SIZE = 10;

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

export default function BagTypeManagement() {
  const [bagTypes, setBagTypes] = useState<BagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedBagType, setSelectedBagType] = useState<BagType | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bagTypeToDelete, setBagTypeToDelete] = useState<BagType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, totalBagsSold: 0, totalRevenue: 0, perBagType: [] as Array<{ bagTypeId: string; sold: number; revenue: number }> });

  const fetchBagTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await bagTypeService.getBagTypes({
        page: currentPage,
        limit: PAGE_SIZE,
        search: searchTerm || undefined,
        isActive: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (response.success) {
        setBagTypes(response.data);
        setPagination(response.pagination);
        if (response.stats) setStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to fetch bag types:', error);
      showErrorToast('Failed to load bag types');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    fetchBagTypes();
  }, [fetchBagTypes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleCreate = () => {
    setSelectedBagType(null);
    setModalMode('create');
    setShowModal(true);
  };

  const handleView = (bagType: BagType) => {
    setSelectedBagType(bagType);
    setModalMode('view');
    setShowModal(true);
  };

  const handleEdit = (bagType: BagType) => {
    setSelectedBagType(bagType);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDelete = (bagType: BagType) => {
    setBagTypeToDelete(bagType);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!bagTypeToDelete) return;
    try {
      setDeleting(true);
      const result = await bagTypeService.deleteBagType(bagTypeToDelete.id);
      if (!result.success) throw new Error(result.message || 'Delete failed');
      showSuccessToast('Bag type deleted permanently');
      setShowDeleteModal(false);
      setBagTypeToDelete(null);
      fetchBagTypes();
    } catch {
      showErrorToast('Failed to delete bag type');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!bagTypeToDelete) return;
    try {
      setDeleting(true);
      await bagTypeService.updateBagType(bagTypeToDelete.id, { isActive: false });
      showSuccessToast(`"${bagTypeToDelete.name}" deactivated — hidden from customers`);
      setShowDeleteModal(false);
      setBagTypeToDelete(null);
      fetchBagTypes();
    } catch {
      showErrorToast('Failed to deactivate bag type');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (data: Partial<BagType>) => {
    try {
      setSaving(true);
      if (modalMode === 'create') {
        await bagTypeService.createBagType(data);
        showSuccessToast('Bag type created');
      } else if (modalMode === 'edit' && selectedBagType) {
        await bagTypeService.updateBagType(selectedBagType.id, data);
        showSuccessToast('Bag type updated');
      }
      setShowModal(false);
      fetchBagTypes();
    } catch {
      showErrorToast(modalMode === 'create' ? 'Failed to create bag type' : 'Failed to update bag type');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = stats.active;
  const inactiveCount = stats.inactive;

  const rangeStart = pagination.total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, pagination.total);

  // Per-bag sales lookup for table
  const salesMap = new Map(stats.perBagType.map(s => [s.bagTypeId, { sold: s.sold, revenue: s.revenue }]));

  return (
    <div className="p-6">
      <Breadcrumb />
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bag Types</h1>
          <p className="text-gray-600 mt-1">Manage bag add-ons that customers can purchase with their orders</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Bag Type
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Inactive</div>
            <div className="text-2xl font-bold text-red-600">{inactiveCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Bags Sold</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalBagsSold}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="text-2xl font-bold text-purple-600">₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
              <input
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent"
              />
            </div>
            <div className="w-full md:w-48">
              <Dropdown
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'true', label: 'Active' },
                  { value: 'false', label: 'Inactive' },
                ]}
                onChange={val => setStatusFilter(val as string)}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600 mb-4">
        <span>
          {loading
            ? 'Loading bag types...'
            : pagination.total === 0
              ? '0 bag types'
              : `Showing ${rangeStart}–${rangeEnd} of ${pagination.total} bag type${pagination.total === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Sold</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : bagTypes.length > 0 ? (
              bagTypes.map(bagType => (
                <TableRow key={bagType.id}>
                  <TableCell>
                    {bagType.image ? (
                      <img src={bagType.image} alt={bagType.name} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{bagType.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500 max-w-[200px] truncate">{bagType.description || '—'}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-gray-900">₹{bagType.price.toFixed(2)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-blue-600">{salesMap.get(bagType.id)?.sold || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-purple-600">₹{(salesMap.get(bagType.id)?.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">{bagType.sortOrder}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${bagType.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {bagType.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleView(bagType)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleEdit(bagType)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(bagType)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="p-12 text-center">
                    <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No bag types found</p>
                    <p className="text-gray-400 text-sm mt-1">Create your first bag type to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm mt-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {getPageRange(currentPage, pagination.pages).map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button
                  key={`p-${p}`}
                  onClick={() => setCurrentPage(p as number)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
              disabled={currentPage >= pagination.pages}
              className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit/View Modal */}
      <BagTypeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        mode={modalMode}
        bagType={selectedBagType}
        onSubmit={handleSubmit}
        loading={saving}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && bagTypeToDelete && (() => {
        const hasSales = (salesMap.get(bagTypeToDelete.id)?.sold || 0) > 0;
        const soldCount = salesMap.get(bagTypeToDelete.id)?.sold || 0;
        const revenue = salesMap.get(bagTypeToDelete.id)?.revenue || 0;
        const isActive = bagTypeToDelete.isActive;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-full ${hasSales ? 'bg-amber-100' : 'bg-red-100'}`}>
                    <AlertCircle className={`w-6 h-6 ${hasSales ? 'text-amber-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {hasSales && isActive ? 'Deactivate or Delete?' : 'Delete Bag Type'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {hasSales ? 'This bag type has order history' : 'This action cannot be undone'}
                    </p>
                  </div>
                </div>

                {/* Bag preview */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    {bagTypeToDelete.image ? (
                      <img src={bagTypeToDelete.image} alt={bagTypeToDelete.name} className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{bagTypeToDelete.name}</p>
                      <p className="text-sm text-gray-500">₹{bagTypeToDelete.price.toFixed(2)}</p>
                    </div>
                    {hasSales && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-600">{soldCount} sold</p>
                        <p className="text-xs text-gray-500">₹{revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Warning for bags with sales */}
                {hasSales && isActive && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                    <p className="font-medium mb-1">Recommended: Deactivate instead</p>
                    <p className="text-xs text-amber-700">Deactivating hides this bag from customers but preserves sales history and reporting data. Deleting removes it permanently.</p>
                  </div>
                )}

                {hasSales && !isActive && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
                    <p className="text-xs">This bag type is already inactive. Deleting will permanently remove it. Existing order data will be preserved.</p>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  {/* Primary action: Deactivate (when has sales + active) */}
                  {hasSales && isActive && (
                    <button
                      onClick={confirmDeactivate}
                      disabled={deleting}
                      className="w-full px-4 py-2.5 bg-[#222222] text-white rounded-lg hover:bg-[#333333] transition-colors font-medium disabled:opacity-50"
                    >
                      {deleting ? 'Processing...' : 'Deactivate (Recommended)'}
                    </button>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowDeleteModal(false); setBagTypeToDelete(null); }}
                      disabled={deleting}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      disabled={deleting}
                      className={`flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 ${
                        hasSales && isActive
                          ? 'border border-red-300 text-red-600 hover:bg-red-50'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {deleting ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
