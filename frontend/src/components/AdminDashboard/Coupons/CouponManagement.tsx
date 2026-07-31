'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Percent,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Truck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Dropdown from '@/components/UI/Dropdown';
import DateRangeCalendar, { fmtDate } from '@/components/Shared/DateRangeCalendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/Table';
import CouponModal from './CouponModal';
import FreeShippingModal from './FreeShippingModal';
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal';
import { couponService, Coupon } from '@/services/couponService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { hasPermission } from '@/lib/auth';

const PAGE_SIZE = 10;

function getPageRange(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '...'> = [1];
  if (current > 4) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('...');
  pages.push(total);
  return pages;
}

const CouponManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showFreeShippingModal, setShowFreeShippingModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; code: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const initialFormData: Partial<Coupon> = {
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    minPurchaseAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
    startDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    freeShipping: false,
    freeShippingOrderNumbers: []
  };

  const [formData, setFormData] = useState<Partial<Coupon>>(initialFormData);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponService.getCoupons();
      if (response.success && response.data) {
        // Backend returns { coupons: [], pagination: ... } or just [] depending on implementation
        // Adjusting based on typical service pattern, assuming response.data.coupons or response.data if it's an array
        const list = Array.isArray(response.data) ? response.data : (response.data.coupons || []);
        setCoupons(list);
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      showErrorToast('Error', 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (coupon: Coupon) => {
    const isExpired = new Date(coupon.expiryDate) < new Date();

    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    }

    if (coupon.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
        <XCircle className="w-3 h-3" />
        Inactive
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch =
      coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (coupon.description && coupon.description.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesStatus = true;
    const isExpired = new Date(coupon.expiryDate) < new Date();

    if (statusFilter === 'active') {
      matchesStatus = coupon.isActive && !isExpired;
    } else if (statusFilter === 'inactive') {
      matchesStatus = !coupon.isActive;
    } else if (statusFilter === 'expired') {
      matchesStatus = isExpired;
    }

    // Created-date range filter (YYYY-MM-DD strings compare lexicographically)
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const cd = coupon.createdAt ? fmtDate(new Date(coupon.createdAt)) : '';
      if (!cd) matchesDate = false;
      else if (dateFrom && cd < dateFrom) matchesDate = false;
      else if (dateTo && cd > dateTo) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredCoupons.length / PAGE_SIZE);
  const paginatedCoupons = filteredCoupons.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleCreate = () => {
    setModalMode('create');
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setModalMode('edit');
    setSelectedCoupon(coupon);
    setFormData({ ...coupon });
    setShowModal(true);
  };

  const handleView = (coupon: Coupon) => {
    setModalMode('view');
    setSelectedCoupon(coupon);
    setShowModal(true);
  };

  const handleDeleteClick = (coupon: Coupon) => {
    setDeleteTarget({ id: coupon.id, code: coupon.code });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const response = await couponService.deleteCoupon(deleteTarget.id);
      if (response.success) {
        setCoupons(prev => prev.filter(c => c.id !== deleteTarget.id));
        showSuccessToast('Success', 'Coupon deleted successfully');
      }
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to delete coupon');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        const response = await couponService.createCoupon(formData);
        if (response.success && response.data) {
          setCoupons(prev => [response.data, ...prev]);
          showSuccessToast('Success', 'Coupon created successfully');
          setShowModal(false);
        }
      } else if (modalMode === 'edit' && selectedCoupon) {
        const response = await couponService.updateCoupon(selectedCoupon.id, formData);
        if (response.success && response.data) {
          setCoupons(prev => prev.map(c => c.id === selectedCoupon.id ? response.data : c));
          showSuccessToast('Success', 'Coupon updated successfully');
          setShowModal(false);
        }
      }
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to save coupon');
    }
  };

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.isActive && new Date(c.expiryDate) >= new Date()).length,
    inactive: coupons.filter(c => !c.isActive).length,
    expired: coupons.filter(c => new Date(c.expiryDate) < new Date()).length
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Coupon Management</h1>
          <p className="text-slate-600">Create and manage discount coupons</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission(['coupons:edit', 'coupons:create']) && (
            <button
              onClick={() => setShowFreeShippingModal(true)}
              className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors flex items-center gap-2"
            >
              <Truck className="w-5 h-5" />
              Free Shipping Offers
            </button>
          )}
          {hasPermission('coupons:create') && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Coupon
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards — click a card to filter the table below by that status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { key: 'all',      label: 'Total Coupons', subtitle: 'All coupons',      value: stats.total,    Icon: Tag,         iconBg: 'bg-brand-50',   iconColor: 'text-brand-500',   countColor: 'text-slate-900',   activeClass: 'border-brand-400 bg-brand-50/50' },
          { key: 'active',   label: 'Active',        subtitle: 'Live & valid',     value: stats.active,   Icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', countColor: 'text-emerald-700', activeClass: 'border-emerald-400 bg-emerald-50/60' },
          { key: 'inactive', label: 'Inactive',      subtitle: 'Disabled',         value: stats.inactive, Icon: XCircle,     iconBg: 'bg-slate-100',  iconColor: 'text-slate-500',   countColor: 'text-slate-700',   activeClass: 'border-slate-400 bg-slate-100/60' },
          { key: 'expired',  label: 'Expired',       subtitle: 'Past validity',    value: stats.expired,  Icon: Clock,       iconBg: 'bg-red-50',     iconColor: 'text-red-500',     countColor: 'text-red-700',     activeClass: 'border-red-400 bg-red-50/60' },
        ].map(({ key, label, subtitle, value, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const isActive = statusFilter === key;
          const toggle = () => { setStatusFilter((prev) => (prev === key ? 'all' : key) as typeof statusFilter); setCurrentPage(1); };
          return (
            <button
              key={key}
              type="button"
              onClick={toggle}
              className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${isActive ? activeClass : 'border-slate-200/80 hover:border-slate-300'}`}
            >
              <div className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                <span className="text-sm font-medium text-slate-500">{label}</span>
                <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace('50', '100') : iconBg} transition-transform duration-150 group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className={`text-2xl font-bold ${countColor}`}>{value}</div>
                <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by coupon code or description..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
            />
          </div>

          <div className="shrink-0">
            <DateRangeCalendar
              from={dateFrom}
              to={dateTo}
              placeholder="Created Date"
              onChange={(f, t) => { setDateFrom(f); setDateTo(t); setCurrentPage(1); }}
            />
          </div>

          <div className="w-full md:w-48">
            <Dropdown
              value={statusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'expired', label: 'Expired' }
              ]}
              onChange={(value) => { setStatusFilter(value as any); setCurrentPage(1); }}
              placeholder="Filter by status"
            />
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
              <TableRow>
                <TableHead>Coupon Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCoupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    No coupons found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCoupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-slate-900">{coupon.code}</div>
                        <div className="text-sm text-slate-500">{coupon.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {coupon.discountType === 'PERCENTAGE' ? (
                          <Percent className="w-4 h-4 text-slate-500" />
                        ) : (
                          <span className="text-slate-500 font-semibold">₹</span>
                        )}
                        <span className="font-medium">
                          {coupon.discountType === 'PERCENTAGE'
                            ? `${coupon.discountValue}%`
                            : `${coupon.discountValue}`}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Min: ₹{coupon.minPurchaseAmount || 0}
                        {coupon.maxDiscountAmount ? ` | Max: ₹${coupon.maxDiscountAmount}` : ''}
                      </div>
                      {coupon.freeShipping && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-semibold rounded border border-green-200">
                            <Truck className="w-3 h-3" />
                            {coupon.freeShippingOrderNumbers && coupon.freeShippingOrderNumbers.length > 0
                              ? `Free Ship: ${coupon.freeShippingOrderNumbers.join(', ')} order(s)`
                              : 'Free Shipping'}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium text-slate-900">
                          {coupon.usedCount || 0} / {coupon.usageLimit || '∞'}
                        </div>
                        {coupon.usageLimit ? (
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-brand-500 h-2 rounded-full"
                              style={{ width: `${((coupon.usedCount || 0) / coupon.usageLimit) * 100}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-slate-700">{formatDate(coupon.startDate)}</div>
                        <div className="text-slate-500">to {formatDate(coupon.expiryDate)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(coupon)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasPermission('coupons:view') && (
                          <button
                            onClick={() => handleView(coupon)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('coupons:edit') && (
                          <button
                            onClick={() => handleEdit(coupon)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('coupons:delete') && (
                          <button
                            onClick={() => handleDeleteClick(coupon)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {!loading && filteredCoupons.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200">
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                  {getPageRange(currentPage, totalPages).map((p, i) => p === '...' ? (<span key={`e-${i}`} className="px-2 text-slate-400">...</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Coupon Modal */}
      <CouponModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        mode={modalMode}
        coupon={selectedCoupon}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
      />

      {/* Free Shipping Modal */}
      <FreeShippingModal
        isOpen={showFreeShippingModal}
        onClose={() => setShowFreeShippingModal(false)}
        onSaved={fetchCoupons}
      />

      <DeleteConfirmModal
        show={!!deleteTarget}
        title="Delete Coupon"
        itemName={deleteTarget?.code}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default CouponManagement;
