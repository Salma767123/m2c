import React, { useState, useEffect } from 'react';
import { Save, Search, Share2, BarChart2, Globe, Server, Hash } from 'lucide-react';
import { Card, CardContent } from '../../UI/Card';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { seoSettingsService, SEOSettings } from '@/services/seoSettingsService';

export default function SEOSettingsTab() {
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [settings, setSettings] = useState<SEOSettings>({
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        twitterCard: 'summary_large_image',
        twitterTitle: '',
        twitterDescription: '',
        twitterImage: '',
        googleAnalyticsId: '',
        facebookPixelId: '',
        robotsTxt: 'User-agent: *\nAllow: /',
        sitemapUrl: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setInitialLoading(true);
            const response = await seoSettingsService.getSettings();
            if (response.success && response.data) {
                setSettings({
                    ...settings,
                    ...response.data
                });
            }
        } catch (error) {
            console.error('Failed to fetch SEO settings', error);
            showErrorToast('Fetch Error', 'Failed to load SEO settings');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await seoSettingsService.updateSettings(settings);
            if (response.success) {
                showSuccessToast('SEO Settings Updated', 'Your settings have been saved successfully.');
            }
        } catch (error: any) {
            showErrorToast('Update Failed', error.message || 'Failed to update SEO settings.');
        } finally {
            setLoading(false);
        }
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
                    <strong>Tip:</strong> These settings control how your application is represented in search engines and social media networks. Make sure the information is accurate and engaging.
                </p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">

                {/* Global SEO Settings */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Search className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Global Settings</h3>
                                <p className="text-sm text-gray-500">Default meta tags for the site.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Default Meta Title</label>
                                <input
                                    type="text"
                                    name="metaTitle"
                                    value={settings.metaTitle || ''}
                                    onChange={handleChange}
                                    placeholder="E.g., M2C Marketplace - Discover B2B Excellence"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Default Meta Description</label>
                                <textarea
                                    name="metaDescription"
                                    rows={3}
                                    value={settings.metaDescription || ''}
                                    onChange={handleChange}
                                    placeholder="Enter a brief description of your site..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Meta Keywords</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        name="metaKeywords"
                                        value={settings.metaKeywords || ''}
                                        onChange={handleChange}
                                        placeholder="b2b, marketplace, wholesale, bulk"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Social Media (Open Graph) */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Share2 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Social Media (Open Graph)</h3>
                                <p className="text-sm text-gray-500">Control how links preview on Facebook, WhatsApp, etc.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">OG Title</label>
                                <input
                                    type="text"
                                    name="ogTitle"
                                    value={settings.ogTitle || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">OG Description</label>
                                <textarea
                                    name="ogDescription"
                                    rows={3}
                                    value={settings.ogDescription || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">OG Image URL</label>
                                <input
                                    type="url"
                                    name="ogImage"
                                    value={settings.ogImage || ''}
                                    onChange={handleChange}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Twitter Cards */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Globe className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Twitter Settings</h3>
                                <p className="text-sm text-gray-500">Configures Twitter cards for links shared on Twitter.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Card Type</label>
                                <select
                                    name="twitterCard"
                                    value={settings.twitterCard || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                >
                                    <option value="summary">Summary</option>
                                    <option value="summary_large_image">Summary with Large Image</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Title</label>
                                <input
                                    type="text"
                                    name="twitterTitle"
                                    value={settings.twitterTitle || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Description</label>
                                <textarea
                                    name="twitterDescription"
                                    rows={2}
                                    value={settings.twitterDescription || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Image URL</label>
                                <input
                                    type="url"
                                    name="twitterImage"
                                    value={settings.twitterImage || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Analytics & Tracking */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <BarChart2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Analytics & Tracking</h3>
                                <p className="text-sm text-gray-500">Connect Google Analytics & Facebook Pixel</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Google Analytics Tracking ID</label>
                                <input
                                    type="text"
                                    name="googleAnalyticsId"
                                    value={settings.googleAnalyticsId || ''}
                                    onChange={handleChange}
                                    placeholder="G-XXXXXXXXXX"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Facebook Pixel ID</label>
                                <input
                                    type="text"
                                    name="facebookPixelId"
                                    value={settings.facebookPixelId || ''}
                                    onChange={handleChange}
                                    placeholder="123456789012345"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Advanced Settings */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Server className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Advanced SEO</h3>
                                <p className="text-sm text-gray-500">Configure robots.txt and sitemap</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Robots.txt Content</label>
                                <textarea
                                    name="robotsTxt"
                                    rows={4}
                                    value={settings.robotsTxt || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sitemap URL</label>
                                <input
                                    type="url"
                                    name="sitemapUrl"
                                    value={settings.sitemapUrl || ''}
                                    onChange={handleChange}
                                    placeholder="https://example.com/sitemap.xml"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="h-4 w-4" />
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
