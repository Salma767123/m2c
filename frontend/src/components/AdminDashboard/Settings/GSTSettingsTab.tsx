"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle, XCircle, Percent } from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { gstSettingsService, GSTSetting } from "@/services/gstSettingsService";

export default function GSTSettingsTab() {
    const [settings, setSettings] = useState<GSTSetting[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newPercentage, setNewPercentage] = useState("");
    const [newDescription, setNewDescription] = useState("");

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await gstSettingsService.getSettings();
            if (response.success) {
                setSettings(response.data);
            }
        } catch (error: any) {
            showErrorToast("Error", error.message || "Failed to fetch GST settings");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPercentage) {
            showErrorToast("Validation Error", "Please enter a percentage value");
            return;
        }

        try {
            setCreating(true);
            const response = await gstSettingsService.createSetting({
                percentage: parseFloat(newPercentage),
                description: newDescription,
                isActive: true
            });

            if (response.success) {
                showSuccessToast("Success", "GST setting created successfully");
                setNewPercentage("");
                setNewDescription("");
                fetchSettings();
            }
        } catch (error: any) {
            showErrorToast("Error", error.message || "Failed to create GST setting");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this GST setting?")) return;

        try {
            const response = await gstSettingsService.deleteSetting(id);
            if (response.success) {
                showSuccessToast("Success", "GST setting deleted successfully");
                setSettings(settings.filter(s => s.id !== id));
            }
        } catch (error: any) {
            showErrorToast("Error", error.message || "Failed to delete GST setting");
        }
    };

    const handleToggleActive = async (setting: GSTSetting) => {
        try {
            const response = await gstSettingsService.updateSetting(setting.id, {
                isActive: !setting.isActive
            });

            if (response.success) {
                showSuccessToast("Success", `GST setting ${!setting.isActive ? 'activated' : 'deactivated'} successfully`);
                setSettings(settings.map(s => s.id === setting.id ? { ...s, isActive: !s.isActive } : s));
            }
        } catch (error: any) {
            showErrorToast("Error", error.message || "Failed to update GST setting");
        }
    };

    return (
        <div className="space-y-6">
            {/* Create New GST Setting */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Percent className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Add New GST Rate</h3>
                    </div>

                    <form onSubmit={handleCreate} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Percentage (%) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newPercentage}
                                onChange={(e) => setNewPercentage(e.target.value)}
                                placeholder="e.g. 18"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex-[2]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <input
                                type="text"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="e.g. Standard Rate"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={creating || !newPercentage}
                            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {creating ? "Adding..." : "Add Rate"}
                        </button>
                    </form>
                </CardContent>
            </Card>

            {/* List Existing Settings */}
            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing GST Rates</h3>

                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading settings...</div>
                    ) : settings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            No GST rates found. Add one above.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="py-3 px-4 text-sm font-medium text-gray-500">Rate (%)</th>
                                        <th className="py-3 px-4 text-sm font-medium text-gray-500">Description</th>
                                        <th className="py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                                        <th className="py-3 px-4 text-sm font-medium text-gray-500 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {settings.map((setting) => (
                                        <tr key={setting.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 font-medium text-gray-900">{setting.percentage}%</td>
                                            <td className="py-3 px-4 text-gray-600">{setting.description || "-"}</td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => handleToggleActive(setting)}
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${setting.isActive
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                        }`}
                                                >
                                                    {setting.isActive ? (
                                                        <>
                                                            <CheckCircle className="w-3 h-3 mr-1" /> Active
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-3 h-3 mr-1" /> Inactive
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(setting.id)}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
