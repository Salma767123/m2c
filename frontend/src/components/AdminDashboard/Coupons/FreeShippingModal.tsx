'use client';

import { useState, useEffect } from 'react';
import { X, Truck, Info, Plus, Trash2, Package } from 'lucide-react';
import { couponService, FreeShippingOffer } from '@/services/couponService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { hasPermission } from '@/lib/auth';

const getOrdinalSuffix = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

interface FreeShippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const FreeShippingModal = ({ isOpen, onClose, onSaved }: FreeShippingModalProps) => {
  const canEdit = hasPermission('edit_coupons');
  const canCreate = hasPermission('create_coupons');
  const canDelete = hasPermission('delete_coupons');
  const [freeShippingOffers, setFreeShippingOffers] = useState<FreeShippingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form for creating/editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderNumbers, setOrderNumbers] = useState('');
  const [minOrderValue, setMinOrderValue] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isOpen) loadFreeShippingCoupons();
  }, [isOpen]);

  const loadFreeShippingCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponService.getFreeShippingOffers();
      if (response.success && response.data) {
        const list = Array.isArray(response.data) ? response.data : (response.data.offers || []);
        setFreeShippingOffers(list);
      }
    } catch {
      showErrorToast('Error', 'Failed to load free shipping offers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setOrderNumbers('');
    setMinOrderValue(0);
    setIsActive(true);
  };

  const startEdit = (offer: FreeShippingOffer) => {
    setEditingId(offer.id);
    setOrderNumbers((offer.orderNumbers || []).join(', '));
    setMinOrderValue(offer.minOrderValue || 0);
    setIsActive(offer.isActive);
  };

  const handleSave = async () => {
    const nums = orderNumbers
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0);

    setSaving(true);
    try {
      const data: Partial<FreeShippingOffer> = {
        minOrderValue,
        orderNumbers: nums,
        isActive,
      };

      if (editingId) {
        await couponService.updateFreeShippingOffer(editingId, data);
        showSuccessToast('Success', 'Free shipping offer updated');
      } else {
        await couponService.createFreeShippingOffer(data);
        showSuccessToast('Success', 'Free shipping offer created');
      }

      resetForm();
      loadFreeShippingCoupons();
      onSaved();
    } catch (error: unknown) {
      showErrorToast('Error', error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this free shipping offer?')) return;
    try {
      await couponService.deleteFreeShippingOffer(id);
      showSuccessToast('Success', 'Deleted');
      loadFreeShippingCoupons();
      onSaved();
      if (editingId === id) resetForm();
    } catch {
      showErrorToast('Error', 'Failed to delete');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Truck className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Free Shipping Offers</h2>
              <p className="text-sm text-gray-600">Set free shipping on specific order numbers</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Existing Free Shipping Coupons */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
              Active Offers ({freeShippingOffers.length})
            </h3>

            {loading ? (
              <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
            ) : freeShippingOffers.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No free shipping offers yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {freeShippingOffers.map((offer) => (
                  <div key={offer.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Free Shipping Offer</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          offer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {offer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {offer.orderNumbers && offer.orderNumbers.length > 0
                          ? `Free shipping on ${offer.orderNumbers.map(n => `${n}${getOrdinalSuffix(n)}`).join(', ')} order(s)`
                          : 'Free shipping on all orders'}
                        {offer.minOrderValue && offer.minOrderValue > 0 && (
                          <span className="ml-2 text-blue-600 font-medium">• Min: ₹{offer.minOrderValue}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      {canEdit && (
                        <button
                          onClick={() => startEdit(offer)}
                          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(offer.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 mb-6" />

          {/* Create / Edit Form */}
          <div className="bg-green-50 rounded-lg border border-green-200 p-5">
            <h3 className="text-sm font-bold text-green-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {editingId ? 'Edit Free Shipping Offer' : 'Create New Free Shipping Offer'}
            </h3>

            <div className="space-y-4">
              {/* Order Numbers */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Free Shipping on Which Orders?
                </label>
                <input
                  type="text"
                  value={orderNumbers}
                  onChange={(e) => setOrderNumbers(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  placeholder="e.g., 3, 5, 10 (comma-separated)"
                />
                <div className="mt-1.5 flex items-start gap-1.5 text-xs text-green-800 bg-green-100 p-2 rounded">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    {orderNumbers.split(',').filter(s => parseInt(s.trim()) > 0).length > 0
                      ? `Free shipping on ${orderNumbers.split(',').map(s => parseInt(s.trim())).filter(n => n > 0).map(n => `${n}${getOrdinalSuffix(n)}`).join(', ')} order(s). Change anytime.`
                      : 'Enter order numbers (e.g., 3, 5, 10). Leave empty for free shipping on any order.'}
                  </span>
                </div>
              </div>

              {/* Minimum Order Value */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Minimum Order Value <span className="text-gray-400 text-xs">($)</span>
                </label>
                <input
                  type="number"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  placeholder="e.g., 500"
                  min="0"
                  step="1"
                />
                <div className="mt-1.5 text-xs text-gray-600">
                  Minimum cart value required to qualify for free shipping. Set to 0 for no minimum.
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-green-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Actions */}
              {((editingId && canEdit) || (!editingId && canCreate)) && (
                <div className="flex gap-3 pt-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:bg-gray-400 text-sm font-medium transition-colors"
                  >
                    {saving ? 'Saving...' : editingId ? 'Update Offer' : 'Create Offer'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeShippingModal;
