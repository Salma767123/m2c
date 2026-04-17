'use client';

import { X, Tag, Percent, Calendar, TrendingUp, Info } from 'lucide-react';
import Dropdown from '@/components/UI/Dropdown';
import { Coupon } from '@/services/couponService';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  coupon?: Coupon | null;
  formData: Partial<Coupon>;
  setFormData: (data: Partial<Coupon>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const CouponModal = ({
  isOpen,
  onClose,
  mode,
  coupon,
  formData,
  setFormData,
  onSubmit
}: CouponModalProps) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (isActive: boolean | undefined, expiryDate: string | undefined) => {
    const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;

    if (isExpired) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          Expired
        </span>
      );
    }

    if (isActive) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          Active
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
        Inactive
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Create New Coupon' : mode === 'edit' ? 'Edit Coupon' : 'Coupon Details'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {mode === 'view' ? 'View coupon information' : 'Fill in the coupon details'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {mode === 'view' && coupon ? (
            // View Mode
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-900">Basic Information</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Coupon Code</label>
                        <div className="text-gray-900 font-mono text-lg font-bold">{coupon.code}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                        {getStatusBadge(coupon.isActive, coupon.expiryDate)}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                        <div className="text-gray-900 text-sm">{coupon.description || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center Column - Discount Details */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Percent className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-900">Discount Details</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Discount Type</label>
                        <div className="text-gray-900 capitalize">{coupon.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Discount Value</label>
                        <div className="text-gray-900 text-2xl font-bold">
                          {coupon.discountType === 'PERCENTAGE'
                            ? `${coupon.discountValue}%`
                            : `₹${coupon.discountValue}`}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Minimum Purchase</label>
                        <div className="text-gray-900">₹{coupon.minPurchaseAmount || 0}</div>
                      </div>
                      {coupon.maxDiscountAmount ? (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Maximum Discount</label>
                          <div className="text-gray-900">₹{coupon.maxDiscountAmount}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Right Column - Usage & Validity */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-900">Usage Statistics</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Usage Limit</label>
                        <div className="text-gray-900">{coupon.usageLimit || 'Unlimited'}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Used Count</label>
                        <div className="text-gray-900 text-2xl font-bold">{coupon.usedCount || 0}</div>
                      </div>
                      {coupon.usageLimit ? (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Usage Progress</label>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gray-900 h-3 rounded-full transition-all"
                              style={{ width: `${((coupon.usedCount || 0) / coupon.usageLimit) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {Math.round(((coupon.usedCount || 0) / coupon.usageLimit) * 100)}% used
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-900">Validity Period</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
                        <div className="text-gray-900">{formatDate(coupon.startDate)}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date</label>
                        <div className="text-gray-900">{formatDate(coupon.expiryDate)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            // Create/Edit Mode - Form Layout
            <form onSubmit={onSubmit}>
              <div className="space-y-6">
                {/* Top Row: Basic Information | Discount Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Basic Information */}
                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-900">Basic Information</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Coupon Code <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.code || ''}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono"
                            placeholder="e.g., FREESHIP3"
                            disabled={mode === 'edit'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Status <span className="text-red-500">*</span>
                          </label>
                          <Dropdown
                            value={formData.isActive ? 'active' : 'inactive'}
                            options={[
                              { value: 'active', label: 'Active' },
                              { value: 'inactive', label: 'Inactive' }
                            ]}
                            onChange={(value) => setFormData({ ...formData, isActive: value === 'active' })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                        <textarea
                          rows={4}
                          value={formData.description || ''}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                          placeholder="Brief description of the coupon"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Discount Details */}
                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Percent className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-900">Discount Details</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Discount Type <span className="text-red-500">*</span>
                          </label>
                          <Dropdown
                            value={formData.discountType || 'PERCENTAGE'}
                            options={[
                              { value: 'PERCENTAGE', label: 'Percentage' },
                              { value: 'FIXED_AMOUNT', label: 'Fixed Amount' }
                            ]}
                            onChange={(value) => setFormData({ ...formData, discountType: value as any })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Discount Value <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={formData.discountValue || ''}
                            onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder={formData.discountType === 'PERCENTAGE' ? '10' : '200'}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Min Purchase <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={formData.minPurchaseAmount || ''}
                            onChange={(e) => setFormData({ ...formData, minPurchaseAmount: Number(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder="500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Max Discount <span className="text-gray-500 text-xs">(Optional)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.maxDiscountAmount || ''}
                            onChange={(e) => setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder="100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Row: Usage Limit | Validity Period */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-900">Usage Limit</h3>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Usage Limit <span className="text-gray-500 text-xs">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.usageLimit || ''}
                        onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="1000"
                      />
                      <div className="mt-2 flex items-start gap-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Maximum number of times this coupon can be used globally</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-900">Validity Period</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.startDate?.split('T')[0] || ''}
                          onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value).toISOString() })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Expiry Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.expiryDate?.split('T')[0] || ''}
                          onChange={(e) => setFormData({ ...formData, expiryDate: new Date(e.target.value).toISOString() })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  {mode === 'create' ? 'Create Coupon' : 'Update Coupon'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer for View Mode */}
        {mode === 'view' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponModal;
