'use client';

import { useState } from 'react';
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
  Clock
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

interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'expired';
}

// Mock data
const mockCoupons: Coupon[] = [
  {
    id: '1',
    code: 'WELCOME10',
    description: 'Welcome discount for new customers',
    discountType: 'percentage',
    discountValue: 10,
    minPurchase: 500,
    maxDiscount: 100,
    usageLimit: 1000,
    usedCount: 245,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'active'
  },
  {
    id: '2',
    code: 'SUMMER25',
    description: 'Summer sale - 25% off',
    discountType: 'percentage',
    discountValue: 25,
    minPurchase: 1000,
    maxDiscount: 500,
    usageLimit: 500,
    usedCount: 432,
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    status: 'expired'
  },
  {
    id: '3',
    code: 'FLAT200',
    description: 'Flat ₹200 off on orders above ₹2000',
    discountType: 'fixed',
    discountValue: 200,
    minPurchase: 2000,
    usageLimit: 300,
    usedCount: 89,
    startDate: '2024-02-01',
    endDate: '2024-12-31',
    status: 'active'
  }
];

const CouponManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>(mockCoupons);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    minPurchase: 0,
    maxDiscount: 0,
    usageLimit: 0,
    startDate: '',
    endDate: '',
    status: 'active'
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3" />
            Inactive
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <Clock className="w-3 h-3" />
            Expired
          </span>
        );
      default:
        return null;
    }
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
      coupon.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || coupon.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      minPurchase: 0,
      maxDiscount: 0,
      usageLimit: 0,
      startDate: '',
      endDate: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setModalMode('edit');
    setSelectedCoupon(coupon);
    setFormData(coupon);
    setShowModal(true);
  };

  const handleView = (coupon: Coupon) => {
    setModalMode('view');
    setSelectedCoupon(coupon);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      setCoupons(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      const newCoupon: Coupon = {
        ...formData as Coupon,
        id: Date.now().toString(),
        usedCount: 0
      };
      setCoupons(prev => [...prev, newCoupon]);
    } else if (modalMode === 'edit' && selectedCoupon) {
      setCoupons(prev => prev.map(c => c.id === selectedCoupon.id ? { ...formData as Coupon, id: c.id } : c));
    }
    setShowModal(false);
  };

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.status === 'active').length,
    inactive: coupons.filter(c => c.status === 'inactive').length,
    expired: coupons.filter(c => c.status === 'expired').length
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Coupon Management</h1>
          <p className="text-gray-600">Create and manage discount coupons</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Coupon
        </button>
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
                      <Percent className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {coupon.discountType === 'percentage' 
                          ? `${coupon.discountValue}%` 
                          : `₹${coupon.discountValue}`}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Min: ₹{coupon.minPurchase}
                      {coupon.maxDiscount && ` | Max: ₹${coupon.maxDiscount}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {coupon.usedCount} / {coupon.usageLimit}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-gray-900 h-2 rounded-full" 
                          style={{ width: `${(coupon.usedCount / coupon.usageLimit) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="text-gray-700">{formatDate(coupon.startDate)}</div>
                      <div className="text-gray-500">to {formatDate(coupon.endDate)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(coupon.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(coupon)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(coupon)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
    </div>
  );
};

export default CouponManagement;
