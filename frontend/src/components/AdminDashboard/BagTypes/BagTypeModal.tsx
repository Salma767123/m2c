'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { BagType } from '@/services/bagTypeService';

interface BagTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  bagType: BagType | null;
  onSubmit: (data: Partial<BagType>) => void;
  loading?: boolean;
}

export default function BagTypeModal({ isOpen, onClose, mode, bagType, onSubmit, loading }: BagTypeModalProps) {
  const [formData, setFormData] = useState<Partial<BagType>>({
    name: '',
    description: '',
    price: 0,
    image: '',
    isActive: true,
    sortOrder: 0,
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form data when bagType or mode changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: bagType?.name || '',
        description: bagType?.description || '',
        price: bagType?.price || 0,
        image: bagType?.image || '',
        isActive: bagType?.isActive ?? true,
        sortOrder: bagType?.sortOrder ?? 0,
      });
      setImagePreview(bagType?.image || '');
    }
  }, [bagType, mode, isOpen]);

  if (!isOpen) return null;

  const isViewMode = mode === 'view';
  const title = mode === 'create' ? 'Create Bag Type' : mode === 'edit' ? 'Edit Bag Type' : 'Bag Type Details';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData(prev => ({ ...prev, image: base64 }));
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: '' }));
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            {isViewMode ? (
              <p className="text-gray-900 font-medium">{formData.name}</p>
            ) : (
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder="e.g. Cotton Bag"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            {isViewMode ? (
              <p className="text-gray-600">{formData.description || 'No description'}</p>
            ) : (
              <textarea
                value={formData.description || ''}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Brief description of this bag type"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent resize-none"
              />
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
            {isViewMode ? (
              <p className="text-gray-900 font-bold text-lg">₹{formData.price?.toFixed(2)}</p>
            ) : (
              <input
                type="number"
                value={formData.price}
                onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent"
              />
            )}
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            {isViewMode ? (
              imagePreview ? (
                <img src={imagePreview} alt={formData.name} className="w-32 h-32 object-cover rounded-lg border border-gray-200" />
              ) : (
                <p className="text-gray-400 text-sm">No image</p>
              )
            ) : (
              <div>
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-xs">Upload</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Sort Order + Active */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              {isViewMode ? (
                <p className="text-gray-900">{formData.sortOrder}</p>
              ) : (
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={e => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              {isViewMode ? (
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${formData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </span>
              ) : (
                <label className="flex items-center gap-3 mt-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#222222] rounded-full peer peer-checked:bg-green-600 transition-colors"></div>
                    <div className="absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                  </div>
                  <span className="text-sm text-gray-700">{formData.isActive ? 'Active' : 'Inactive'}</span>
                </label>
              )}
            </div>
          </div>

          {/* Footer */}
          {!isViewMode && (
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name?.trim() || formData.price === undefined || formData.price < 0}
                className="px-5 py-2.5 bg-[#222222] text-white rounded-lg hover:bg-[#333333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
              </button>
            </div>
          )}

          {isViewMode && (
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
