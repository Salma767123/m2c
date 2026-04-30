'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Tag, Percent, Calendar, TrendingUp, Info, Upload, Megaphone, ChevronDown } from 'lucide-react';
import Dropdown from '@/components/UI/Dropdown';
import { Coupon } from '@/services/couponService';
import { categoryService } from '@/services/categoryService';

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
  const [popupImagePreview, setPopupImagePreview] = useState<string>('');
  const popupFileInputRef = useRef<HTMLInputElement>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Fetch categories for the dropdown
  useEffect(() => {
    if (isOpen) {
      setPopupImagePreview(formData.popupImage || '');
      categoryService.getAllCategories({ status: 'ACTIVE', includeSubcategories: 'true' }).then(res => {
        if (res.success && res.data) {
          setAvailableCategories(res.data.map(c => c.name));
        }
      }).catch(() => {});
    }
  }, [isOpen, formData.popupImage]);

  if (!isOpen) return null;

  const handlePopupImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData({ ...formData, popupImage: base64 });
      setPopupImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePopupImage = () => {
    setFormData({ ...formData, popupImage: '' });
    setPopupImagePreview('');
    if (popupFileInputRef.current) popupFileInputRef.current.value = '';
  };

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

              {/* Promotional Popup Info (View Mode) */}
              {coupon.showAsPopup && (
                <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Megaphone className="w-5 h-5 text-gray-700" />
                    <h3 className="font-semibold text-gray-900">Promotional Popup</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      Enabled
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {coupon.popupImage && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Popup Image</label>
                        <img src={coupon.popupImage} alt="Popup" className="w-full max-w-xs h-32 object-cover rounded-lg border border-gray-200" />
                      </div>
                    )}
                    <div className="space-y-3">
                      {coupon.popupTitle && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Popup Title</label>
                          <div className="text-gray-900 text-sm">{coupon.popupTitle}</div>
                        </div>
                      )}
                      {coupon.popupMessage && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Popup Message</label>
                          <div className="text-gray-900 text-sm">{coupon.popupMessage}</div>
                        </div>
                      )}
                      {coupon.applicableCategories && coupon.applicableCategories.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Applicable Categories</label>
                          <div className="flex flex-wrap gap-1">
                            {coupon.applicableCategories.map((cat, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

                {/* Promotional Popup Section */}
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-900">Promotional Popup</h3>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.showAsPopup || false}
                          onChange={(e) => setFormData({ ...formData, showAsPopup: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-gray-900 rounded-full peer peer-checked:bg-green-600 transition-colors"></div>
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                      </div>
                      <span className="text-sm text-gray-700">{formData.showAsPopup ? 'Enabled' : 'Disabled'}</span>
                    </label>
                  </div>

                  {formData.showAsPopup && (
                    <div className="space-y-4">
                      {/* Popup Image */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Popup Image <span className="text-xs font-normal text-gray-400">(optional)</span></label>
                        <p className="text-xs text-gray-500 mb-2">If not uploaded, the category image will be used automatically.</p>
                        <div>
                          {popupImagePreview ? (
                            <div className="relative inline-block">
                              <img src={popupImagePreview} alt="Popup Preview" className="w-full max-w-xs h-32 object-cover rounded-lg border border-gray-200" />
                              <button
                                type="button"
                                onClick={handleRemovePopupImage}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => popupFileInputRef.current?.click()}
                              className="w-full max-w-xs h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                            >
                              <Upload className="w-6 h-6" />
                              <span className="text-xs">Upload Popup Image</span>
                            </button>
                          )}
                          <input
                            ref={popupFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePopupImageChange}
                            className="hidden"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Popup Title */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Popup Title</label>
                          <input
                            type="text"
                            value={formData.popupTitle || ''}
                            onChange={(e) => setFormData({ ...formData, popupTitle: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder="e.g., Special Offer on Towels!"
                          />
                        </div>

                        {/* Applicable Categories */}
                        <div className="relative">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Applicable Categories
                          </label>
                          <button
                            type="button"
                            onClick={() => { setShowCategoryDropdown(prev => !prev); setCategorySearch(''); }}
                            className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors text-left"
                          >
                            <span className={`text-sm ${(formData.applicableCategories || []).length > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                              {(formData.applicableCategories || []).length > 0
                                ? (formData.applicableCategories || []).join(', ')
                                : 'Select categories'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          {showCategoryDropdown && (
                            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                              <div className="p-2 border-b border-gray-100">
                                <input
                                  type="text"
                                  value={categorySearch}
                                  onChange={(e) => setCategorySearch(e.target.value)}
                                  placeholder="Search categories..."
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {availableCategories
                                  .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                                  .map(cat => {
                                    const selected = (formData.applicableCategories || []).includes(cat);
                                    return (
                                      <label
                                        key={cat}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selected}
                                          onChange={() => {
                                            const current = formData.applicableCategories || [];
                                            setFormData({
                                              ...formData,
                                              applicableCategories: selected
                                                ? current.filter(c => c !== cat)
                                                : [...current, cat],
                                            });
                                          }}
                                          className="w-4 h-4 accent-gray-800 rounded"
                                        />
                                        <span className="text-sm text-gray-700">{cat}</span>
                                      </label>
                                    );
                                  })}
                                {availableCategories.filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                                  <p className="px-4 py-3 text-sm text-gray-400">No categories found</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Popup Message */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Popup Message</label>
                        <textarea
                          rows={3}
                          value={formData.popupMessage || ''}
                          onChange={(e) => setFormData({ ...formData, popupMessage: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                          placeholder="Message to display in the popup"
                        />
                      </div>

                      <div className="flex items-start gap-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>This popup will appear when customers visit the specified category or product pages. Each customer sees it once per session per category.</span>
                      </div>
                    </div>
                  )}
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
