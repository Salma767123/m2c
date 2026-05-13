'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { userManagementService, Staff } from '@/services/userManagementService';
import { roleService, Role } from '@/services/roleService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import Dropdown from '@/components/UI/Dropdown';
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb';
import {
    ArrowLeft,
    Save,
    X,
    User,
    Mail,
    Phone,
    Shield,
    Lock,
    Loader2,
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

interface AddEditUserProps {
    isEdit?: boolean;
}

export default function AddEditUser({ isEdit = false }: AddEditUserProps) {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        roleId: '',
        password: '',
    });

    useEffect(() => {
        fetchRoles();
        if (isEdit && userId) {
            // For now, getStaff returns an array. We might need a getStaffById service.
            // But we can filter from the list if needed, or implement a single fetch.
            fetchStaffDetails();
        }
    }, [isEdit, userId]);

    const fetchRoles = async () => {
        try {
            const data = await roleService.getRoles();
            if (data.success) {
                setAvailableRoles(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch roles', error);
            showErrorToast('Failed to load roles');
        }
    };

    const fetchStaffDetails = async () => {
        setIsLoading(true);
        try {
            // Getting all staff and finding the one we need since getStaffById isn't there yet
            const staff = await userManagementService.getStaffById(userId);

            if (staff) {
                setFormData({
                    firstName: staff.firstName,
                    lastName: staff.lastName,
                    email: staff.email,
                    phone: staff.phone,
                    roleId: staff.roleId || '',
                    password: '', // Don't populate password
                });
            } else {
                showErrorToast('Staff member not found');
                router.push('/admin/dashboard/users');
            }
        } catch (error) {
            console.error('Failed to fetch staff details', error);
            showErrorToast('Failed to load staff details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleChange = (value: string | string[]) => {
        setFormData(prev => ({ ...prev, roleId: value as string }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.roleId) {
            showErrorToast('Please assign a role to the staff member');
            return;
        }

        setIsSaving(true);
        try {
            if (isEdit) {
                // We'll need to implement updateStaff in the service
                // For now, let's assume it exists or we'll add it soon
                await userManagementService.updateStaff(userId, formData);
                showSuccessToast('Staff details updated successfully');
            } else {
                await userManagementService.createStaff(formData);
                showSuccessToast('Staff member added successfully', 'Credentials have been emailed.');
            }
            router.push('/admin/dashboard/users');
        } catch (error: any) {
            showErrorToast(error.response?.data?.error || error.data?.error || error.message || 'Failed to save staff member');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Breadcrumb />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEdit ? 'Edit Staff Member' : 'Add New Staff Member'}
                        </h1>
                        <p className="text-gray-600">
                            {isEdit ? 'Update details for an existing staff account' : 'Create a new staff account and assign permissions'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Form Section */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <User className="h-5 w-5 text-gray-500" />
                                Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form id="staff-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">First Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                required
                                                type="text"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleInputChange}
                                                placeholder="e.g. John"
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Last Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                required
                                                type="text"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleInputChange}
                                                placeholder="e.g. Doe"
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                required
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="john.doe@example.com"
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                required
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="+1 (555) 000-0000"
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {!isEdit && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Password (Optional)
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder="Leave empty to auto-generate a password"
                                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 italic">
                                            A secure password will be auto-generated and emailed to the staff member. It's recommended to change it after first login.
                                        </p>
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Section */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Shield className="h-5 w-5 text-gray-500" />
                                Access & Role
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Dropdown
                                label="Assigned Role"
                                id="staffRole"
                                value={formData.roleId}
                                options={availableRoles.map(role => ({
                                    value: role.id,
                                    label: role.name
                                }))}
                                onChange={handleRoleChange}
                                placeholder="Select a role"
                            />

                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
                                    <p className="text-sm text-blue-700">
                                        The assigned role determines what sections of the dashboard this staff member can access and what actions they can perform.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col gap-3">
                                <Button
                                    type="submit"
                                    form="staff-form"
                                    disabled={isSaving}
                                    className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    {isEdit ? 'Update Staff Member' : 'Create Staff Member'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => router.back()}
                                    className="w-full"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
