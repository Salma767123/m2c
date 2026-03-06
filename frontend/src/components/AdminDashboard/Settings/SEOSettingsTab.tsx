import React, { useState, useEffect, useRef } from 'react';
import { Save, Edit, Globe, Sparkles, CheckCircle, AlertCircle, Upload, X, Image } from 'lucide-react';
import { Card, CardContent } from '../../UI/Card';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { seoSettingsService, SEOSettings } from '@/services/seoSettingsService';

export default function SEOSettingsTab() {
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [allSettings, setAllSettings] = useState<SEOSettings[]>([]);
    const [editingPage, setEditingPage] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<SEOSettings>>({});
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const pageDisplayNames: Record<string, string> = {
        home: 'Home Page',
        about: 'About Us',
        products: 'Products',
        categories: 'Categories',
        contact: 'Contact Us',
        privacy: 'Privacy Policy',
        terms: 'Terms & Conditions',
        shipping: 'Shipping Info',
        returns: 'Returns Policy'
    };

    useEffect(() => {
        fetchAllSettings();
    }, []);

    const fetchAllSettings = async () => {
        try {
            setInitialLoading(true);
            const response = await seoSettingsService.getAllSettings();
            if (response.success && Array.isArray(response.data)) {
                setAllSettings(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch SEO settings', error);
            showErrorToast('Fetch Error', 'Failed to load SEO settings');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleEditClick = (page: string) => {
        const pageSettings = allSettings.find(s => s.page === page);
        setEditForm({
            metaTitle: pageSettings?.metaTitle || '',
            metaDescription: pageSettings?.metaDescription || '',
            metaKeywords: pageSettings?.metaKeywords || '',
            ogImage: pageSettings?.ogImage || ''
        });
        setImagePreview(pageSettings?.ogImage || null);
        setSelectedImage(null);
        setEditingPage(page);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showErrorToast('Invalid File', 'Please select an image file');
                return;
            }

            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                showErrorToast('File Too Large', 'Image size should be less than 5MB');
                return;
            }

            setSelectedImage(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setImagePreview(editForm.ogImage || null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!editingPage) return;
        
        try {
            setLoading(true);
            const response = await seoSettingsService.updateSettings(editingPage, editForm, selectedImage || undefined);
            if (response.success) {
                showSuccessToast('SEO Settings Updated', 'Page SEO settings have been saved successfully.');
                await fetchAllSettings();
                setEditingPage(null);
                setEditForm({});
                setSelectedImage(null);
                setImagePreview(null);
            }
        } catch (error: any) {
            showErrorToast('Update Failed', error.message || 'Failed to update SEO settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setEditingPage(null);
        setEditForm({});
        setSelectedImage(null);
        setImagePreview(null);
    };

    const isPageConfigured = (page: string) => {
        const pageSettings = allSettings.find(s => s.page === page);
        return pageSettings && (
            pageSettings.metaTitle || 
            pageSettings.metaDescription || 
            pageSettings.metaKeywords || 
            pageSettings.ogImage
        );
    };

    if (initialLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading SEO settings...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>SEO Management:</strong> Configure meta tags for each page to improve search engine visibility and social media sharing.
                </p>
            </div>

            {/* Page Management Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(pageDisplayNames).map(([page, displayName]) => (
                    <Card key={page} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-gray-600" />
                                    <h3 className="font-medium text-gray-900">{displayName}</h3>
                                </div>
                                <div className="flex items-center gap-1">
                                    {isPageConfigured(page) ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-orange-500" />
                                    )}
                                </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 mb-3">
                                {isPageConfigured(page) ? 'SEO configured' : 'Not configured'}
                            </p>
                            
                            <button
                                onClick={() => handleEditClick(page)}
                                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm transition-colors"
                            >
                                <Edit className="w-3 h-3" />
                                Configure SEO
                            </button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit Modal */}
            {editingPage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    SEO Settings - {pageDisplayNames[editingPage]}
                                </h2>
                                <button
                                    onClick={handleCancel}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Meta Title
                                </label>
                                <input
                                    type="text"
                                    name="metaTitle"
                                    value={editForm.metaTitle || ''}
                                    onChange={handleFormChange}
                                    placeholder="Enter page title for search engines"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Recommended: 50-60 characters</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Meta Description
                                </label>
                                <textarea
                                    name="metaDescription"
                                    rows={3}
                                    value={editForm.metaDescription || ''}
                                    onChange={handleFormChange}
                                    placeholder="Brief description of the page content"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Recommended: 150-160 characters</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Meta Keywords
                                </label>
                                <input
                                    type="text"
                                    name="metaKeywords"
                                    value={editForm.metaKeywords || ''}
                                    onChange={handleFormChange}
                                    placeholder="keyword1, keyword2, keyword3"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Open Graph Image
                                </label>
                                <div className="space-y-3">
                                    {/* Hidden file input */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                    />
                                    
                                    {/* Image Preview */}
                                    {imagePreview && (
                                        <div className="relative inline-block">
                                            <img
                                                src={imagePreview}
                                                alt="OG Image Preview"
                                                className="w-full max-w-md h-32 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                                            />
                                            {selectedImage && (
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveImage}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                                OG Image Preview
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Upload Area */}
                                    {!imagePreview && (
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                                        >
                                            <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-600 font-medium">Click to upload Open Graph image</p>
                                            <p className="text-sm text-gray-500 mt-1">JPG, PNG, WebP up to 5MB</p>
                                        </div>
                                    )}
                                    
                                    {/* Upload Button (when image exists) */}
                                    {imagePreview && (
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <Upload className="w-4 h-4" />
                                                Change Image
                                            </button>
                                            {selectedImage && (
                                                <span className="text-sm text-green-600 flex items-center gap-1">
                                                    <CheckCircle className="w-4 h-4" />
                                                    New image selected
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    
                                    <p className="text-xs text-gray-500">
                                        Recommended: 1200x630px for optimal social media sharing. Max file size: 5MB.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <button
                                    type="button"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Generate SEO with AI
                                </button>
                                <p className="text-xs text-blue-600 mt-1">
                                    Let AI help you create optimized SEO content for this page
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="h-4 w-4" />
                                {loading ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
