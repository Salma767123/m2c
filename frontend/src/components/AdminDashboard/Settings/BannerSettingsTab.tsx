import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, X, Image, Trash2, GripVertical, Plus, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent } from '../../UI/Card';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { bannerService, BannerImage } from '@/services/bannerService';
import { hasPermission } from '@/lib/auth';

export default function BannerSettingsTab() {
    const canManage = hasPermission('manage_settings');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [banners, setBanners] = useState<BannerImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [newAltText, setNewAltText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAltText, setEditAltText] = useState('');
    const [editFile, setEditFile] = useState<File | null>(null);
    const [editFilePreview, setEditFilePreview] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            setInitialLoading(true);
            const response = await bannerService.getAllBanners();
            if (response.success && Array.isArray(response.data)) {
                setBanners(response.data);
            }
        } catch (error) {
            showErrorToast('Error', 'Failed to fetch banners');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showErrorToast('Invalid File', 'Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showErrorToast('File Too Large', 'Image size should be less than 5MB');
            return;
        }

        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showErrorToast('Invalid File', 'Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showErrorToast('File Too Large', 'Image size should be less than 5MB');
            return;
        }

        setEditFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setEditFilePreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const clearNewForm = () => {
        setSelectedFile(null);
        setFilePreview(null);
        setNewAltText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAddBanner = async () => {
        if (!selectedFile) {
            showErrorToast('Error', 'Please select an image');
            return;
        }

        try {
            setUploading(true);
            const response = await bannerService.addBanner(selectedFile, newAltText);
            if (response.success) {
                showSuccessToast('Success', 'Banner added successfully');
                clearNewForm();
                fetchBanners();
            }
        } catch (error) {
            showErrorToast('Error', 'Failed to add banner');
        } finally {
            setUploading(false);
        }
    };

    const handleToggleActive = async (banner: BannerImage) => {
        try {
            const response = await bannerService.updateBanner(banner.id, { isActive: !banner.isActive });
            if (response.success) {
                showSuccessToast('Success', `Banner ${banner.isActive ? 'hidden' : 'shown'} successfully`);
                fetchBanners();
            }
        } catch (error) {
            showErrorToast('Error', 'Failed to update banner');
        }
    };

    const startEditing = (banner: BannerImage) => {
        setEditingId(banner.id);
        setEditAltText(banner.altText || '');
        setEditFile(null);
        setEditFilePreview(null);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditAltText('');
        setEditFile(null);
        setEditFilePreview(null);
        if (editFileInputRef.current) editFileInputRef.current.value = '';
    };

    const handleUpdateBanner = async (id: string) => {
        try {
            setLoading(true);
            const response = await bannerService.updateBanner(id, { altText: editAltText }, editFile || undefined);
            if (response.success) {
                showSuccessToast('Success', 'Banner updated successfully');
                cancelEditing();
                fetchBanners();
            }
        } catch (error) {
            showErrorToast('Error', 'Failed to update banner');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBanner = async (id: string) => {
        try {
            setDeletingId(id);
            const response = await bannerService.deleteBanner(id);
            if (response.success) {
                showSuccessToast('Success', 'Banner deleted successfully');
                fetchBanners();
            }
        } catch (error) {
            showErrorToast('Error', 'Failed to delete banner');
        } finally {
            setDeletingId(null);
        }
    };

    const moveBanner = async (index: number, direction: 'up' | 'down') => {
        const newBanners = [...banners];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= newBanners.length) return;

        [newBanners[index], newBanners[swapIndex]] = [newBanners[swapIndex], newBanners[index]];
        const orderedIds = newBanners.map(b => b.id);

        try {
            const response = await bannerService.reorderBanners(orderedIds);
            if (response.success) {
                setBanners(newBanners.map((b, i) => ({ ...b, displayOrder: i })));
            }
        } catch (error) {
            showErrorToast('Error', 'Failed to reorder banners');
        }
    };

    if (initialLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        <span className="ml-3 text-gray-600">Loading banners...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Add New Banner */}
            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add New Banner
                    </h3>

                    <div className="space-y-4">
                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Banner Image *
                            </label>
                            <div className="flex items-start gap-4">
                                <div
                                    className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {filePreview ? (
                                        <div className="relative">
                                            <img
                                                src={filePreview}
                                                alt="Preview"
                                                className="max-h-48 mx-auto rounded-lg object-contain"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    clearNewForm();
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="py-6">
                                            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">
                                                Click to upload banner image
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                JPG, PNG, WebP up to 5MB. Recommended: 1920x750px
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Alt Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Alt Text (for accessibility)
                            </label>
                            <input
                                type="text"
                                value={newAltText}
                                onChange={(e) => setNewAltText(e.target.value)}
                                placeholder="Describe the banner image..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                            />
                        </div>

                        {/* Submit Button */}
                        {canManage && (
                            <button
                                onClick={handleAddBanner}
                                disabled={!selectedFile || uploading}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                            >
                                {uploading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" />
                                        Add Banner
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Existing Banners */}
            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Banner Images ({banners.length})
                    </h3>

                    {banners.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Image className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">No banners added yet.</p>
                            <p className="text-xs text-gray-400 mt-1">Add your first banner image above.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {banners.map((banner, index) => (
                                <div
                                    key={banner.id}
                                    className={`border rounded-lg p-4 transition-colors ${
                                        banner.isActive ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    {editingId === banner.id ? (
                                        /* Edit Mode */
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className="w-48 h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 border-dashed border-gray-300 hover:border-gray-400"
                                                    onClick={() => editFileInputRef.current?.click()}
                                                >
                                                    <img
                                                        src={editFilePreview || banner.imageUrl}
                                                        alt={banner.altText || 'Banner'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <input
                                                    ref={editFileInputRef}
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={handleEditFileSelect}
                                                    className="hidden"
                                                />
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={editAltText}
                                                        onChange={(e) => setEditAltText(e.target.value)}
                                                        placeholder="Alt text..."
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                                                    />
                                                    <p className="text-xs text-gray-400">Click the image to replace it</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateBanner(banner.id)}
                                                            disabled={loading}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
                                                        >
                                                            <Save className="h-3 w-3" />
                                                            {loading ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* View Mode */
                                        <div className="flex items-center gap-4">
                                            {/* Reorder Controls */}
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => moveBanner(index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Move up"
                                                >
                                                    <GripVertical className="h-4 w-4 rotate-180" />
                                                </button>
                                                <button
                                                    onClick={() => moveBanner(index, 'down')}
                                                    disabled={index === banners.length - 1}
                                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Move down"
                                                >
                                                    <GripVertical className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {/* Image Preview */}
                                            <div className="w-48 h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                <img
                                                    src={banner.imageUrl}
                                                    alt={banner.altText || 'Banner'}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>

                                            {/* Banner Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {banner.altText || 'No alt text'}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Order: {banner.displayOrder + 1} | {banner.isActive ? 'Active' : 'Hidden'}
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            {canManage && (
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleToggleActive(banner)}
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            banner.isActive
                                                                ? 'text-green-600 hover:bg-green-50'
                                                                : 'text-gray-400 hover:bg-gray-100'
                                                        }`}
                                                        title={banner.isActive ? 'Hide banner' : 'Show banner'}
                                                    >
                                                        {banner.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => startEditing(banner)}
                                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Edit banner"
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBanner(banner.id)}
                                                        disabled={deletingId === banner.id}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Delete banner"
                                                    >
                                                        {deletingId === banner.id ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
