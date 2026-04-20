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
  Truck
} from 'lucide-react';
import Dropdown from '@/components/UI/Dropdown';
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
import { couponService, Coupon } from '@/services/couponService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { hasPermission } from '@/lib/auth';

const CouponManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showFreeShippingModal, setShowFreeShippingModal] = useState(false);

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
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    }

    if (coupon.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
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

    return matchesSearch && matchesStatus;
  });

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

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      try {
        const response = await couponService.deleteCoupon(id);
        if (response.success) {
          setCoupons(prev => prev.filter(c => c.id !== id));
          showSuccessToast('Success', 'Coupon deleted successfully');
        }
      } catch (error: any) {
        showErrorToast('Error', error.message || 'Failed to delete coupon');
      }
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
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Coupon Management</h1>
          <p className="text-gray-600">Create and manage discount coupons</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission(['edit_coupons', 'create_coupons']) && (
            <button
              onClick={() => setShowFreeShippingModal(true)}
              className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors flex items-center gap-2"
            >
              <Truck className="w-5 h-5" />
              Free Shipping Offers
            </button>
          )}
          {hasPermission('create_coupons') && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Coupon
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Coupons</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Tag className="w-6 h-6 text-gray-700" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Inactive</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{stats.inactive}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Expired</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.expired}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by coupon code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
              onChange={(value) => setStatusFilter(value as any)}
              placeholder="Filter by status"
            />
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Table>
            <TableHeader>
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
              {filteredCoupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    No coupons found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCoupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-gray-900">{coupon.code}</div>
                        <div className="text-sm text-gray-500">{coupon.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {coupon.discountType === 'PERCENTAGE' ? (
                          <Percent className="w-4 h-4 text-gray-500" />
                        ) : (
                          <span className="text-gray-500 font-semibold">₹</span>
                        )}
                        <span className="font-medium">
                          {coupon.discountType === 'PERCENTAGE'
                            ? `${coupon.discountValue}%`
                            : `${coupon.discountValue}`}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Min: ₹{coupon.minPurchaseAmount || 0}
                        {coupon.maxDiscountAmount && ` | Max: ₹${coupon.maxDiscountAmount}`}
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
                        <div className="font-medium text-gray-900">
                          {coupon.usedCount || 0} / {coupon.usageLimit || '∞'}
                        </div>
                        {coupon.usageLimit && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-gray-900 h-2 rounded-full"
                              style={{ width: `${((coupon.usedCount || 0) / coupon.usageLimit) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-gray-700">{formatDate(coupon.startDate)}</div>
                        <div className="text-gray-500">to {formatDate(coupon.expiryDate)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(coupon)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasPermission('view_coupons') && (
                          <button
                            onClick={() => handleView(coupon)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('edit_coupons') && (
                          <button
                            onClick={() => handleEdit(coupon)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('delete_coupons') && (
                          <button
                            onClick={() => handleDelete(coupon.id)}
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
    </div>
  );
};

export default CouponManagement;
