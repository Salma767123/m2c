'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Edit, Trash2, ShoppingBag, ChevronLeft, ChevronRight, Package } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

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

  const handleDelete = async (bagType: BagType) => {
    if (!confirm(`Delete "${bagType.name}"? This cannot be undone.`)) return;
    try {
      const result = await bagTypeService.deleteBagType(bagType.id);
      if (!result.success) throw new Error(result.message || 'Delete failed');
      showSuccessToast('Bag type deleted');
      fetchBagTypes();
    } catch {
      showErrorToast('Failed to delete bag type');
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
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
                <TableCell colSpan={7}>
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

      {/* Modal */}
      <BagTypeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        mode={modalMode}
        bagType={selectedBagType}
        onSubmit={handleSubmit}
        loading={saving}
      />
    </div>
  );
}
