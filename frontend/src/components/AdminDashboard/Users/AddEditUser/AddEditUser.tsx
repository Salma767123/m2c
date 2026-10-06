'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { userManagementService } from '@/services/userManagementService';
import { roleService, Role } from '@/services/roleService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import Dropdown from '@/components/UI/Dropdown';
import {
    ArrowLeft,
    Save,
    User,
    Mail,
    Phone,
    Shield,
    Lock,
    Loader2,
    AlertCircle,
    Eye,
    EyeOff,
    Camera,
    Trash2,
    Briefcase,
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

interface AddEditUserProps {
    isEdit?: boolean;
}

const TITLE_OPTIONS = ['Mr', 'Mrs', 'Ms', 'Dr', 'Mx'].map((t) => ({ value: t, label: t }));

// Common country dialing codes (India first — primary market).
const COUNTRY_CODES = [
    { value: '+91', label: '🇮🇳 +91' },
    { value: '+1', label: '🇺🇸 +1' },
    { value: '+44', label: '🇬🇧 +44' },
    { value: '+971', label: '🇦🇪 +971' },
    { value: '+65', label: '🇸🇬 +65' },
    { value: '+61', label: '🇦🇺 +61' },
    { value: '+60', label: '🇲🇾 +60' },
    { value: '+94', label: '🇱🇰 +94' },
    { value: '+966', label: '🇸🇦 +966' },
    { value: '+49', label: '🇩🇪 +49' },
];

const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3 MB

export default function AddEditUser({ isEdit = false }: AddEditUserProps) {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const [countryCode, setCountryCode] = useState('+91');
    const [photoPreview, setPhotoPreview] = useState<string>(''); // data URL or existing image URL
    const [photoChanged, setPhotoChanged] = useState(false);

    const [formData, setFormData] = useState({
        title: 'Mr',
        firstName: '',
        middleName: '',
        lastName: '',
        designation: '',
        email: '',
        phone: '', // local number (without country code)
        roleId: '',
        password: '',
    });

    useEffect(() => {
        fetchRoles();
        if (isEdit && userId) fetchStaffDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, userId]);

    const fetchRoles = async () => {
        try {
            const data = await roleService.getRoles();
            if (data.success) setAvailableRoles(data.data);
        } catch (error) {
            console.error('Failed to fetch roles', error);
            showErrorToast('Failed to load roles');
        }
    };

    const fetchStaffDetails = async () => {
        setIsLoading(true);
        try {
            const staff = await userManagementService.getStaffById(userId);
            if (staff) {
                // Split a stored phone like "+91 98765 43210" into code + local part.
                let code = '+91';
                let local = staff.phone || '';
                const m = (staff.phone || '').match(/^(\+\d{1,4})[\s-]?(.*)$/);
                if (m) { code = m[1]; local = m[2]; }
                setCountryCode(code);
                setFormData({
                    title: staff.title || 'Mr',
                    firstName: staff.firstName || '',
                    middleName: staff.middleName || '',
                    lastName: staff.lastName || '',
                    designation: staff.designation || '',
                    email: staff.email || '',
                    phone: local.trim(),
                    roleId: staff.roleId || '',
                    password: '',
                });
                if (staff.avatar) setPhotoPreview(staff.avatar);
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
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { showErrorToast('Invalid file', 'Please choose an image.'); return; }
        if (file.size > MAX_PHOTO_BYTES) { showErrorToast('Too large', 'Profile photo must be under 3 MB.'); return; }
        const reader = new FileReader();
        reader.onload = () => { setPhotoPreview(reader.result as string); setPhotoChanged(true); };
        reader.readAsDataURL(file);
    };

    const removePhoto = () => {
        setPhotoPreview('');
        setPhotoChanged(true);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            showErrorToast('Please enter the first and last name');
            return;
        }
        if (!formData.roleId) {
            showErrorToast('Please assign a role to the staff member');
            return;
        }

        const payload: Record<string, unknown> = {
            title: formData.title,
            firstName: formData.firstName.trim(),
            middleName: formData.middleName.trim(),
            lastName: formData.lastName.trim(),
            designation: formData.designation.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() ? `${countryCode} ${formData.phone.trim()}` : '',
            roleId: formData.roleId,
        };
        if (!isEdit) payload.password = formData.password;
        // Only send `image` when it actually changed (data URL to upload, or '' to clear).
        if (photoChanged) payload.image = photoPreview.startsWith('data:') ? photoPreview : '';

        setIsSaving(true);
        try {
            if (isEdit) {
                await userManagementService.updateStaff(userId, payload);
                showSuccessToast('Staff details updated successfully');
            } else {
                await userManagementService.createStaff(payload);
                showSuccessToast('Staff member added successfully', 'Credentials have been emailed.');
            }
            router.push('/admin/dashboard/users');
        } catch (error: any) {
            showErrorToast(error.response?.data?.error || error.data?.error || error.message || 'Failed to save staff member');
        } finally {
            setIsSaving(false);
        }
    };

    const initials = `${formData.firstName?.[0] || ''}${formData.lastName?.[0] || ''}`.toUpperCase() || 'U';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
        );
    }

    const inputCls = 'w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 outline-none transition';
    const plainInputCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 outline-none transition';

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isEdit ? 'Edit Staff Member' : 'Add New Staff Member'}
                    </h1>
                    <p className="text-sm text-slate-500">
                        {isEdit ? 'Update details for an existing staff account' : 'Create a new staff account and assign permissions'}
                    </p>
                </div>
            </div>

            <form id="staff-form" onSubmit={handleSubmit}>
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Form Section */}
                    <div className="space-y-6 lg:col-span-2">
                        <Card className="rounded-2xl border-slate-200">
                            <CardHeader className="border-b border-slate-100">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-500"><User className="h-4 w-4" /></span>
                                    Personal Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                {/* Profile photo */}
                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xl font-bold text-slate-400">
                                            {photoPreview ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
                                            ) : (
                                                <span>{initials}</span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fileRef.current?.click()}
                                            className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-white shadow hover:bg-brand-600"
                                            title="Upload photo"
                                        >
                                            <Camera className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">Profile Photo</p>
                                        <p className="text-xs text-slate-400">JPG or PNG, up to 3 MB.</p>
                                        <div className="mt-2 flex gap-2">
                                            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                                Upload
                                            </button>
                                            {photoPreview && (
                                                <button type="button" onClick={removePhoto} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                                                    <Trash2 className="h-3.5 w-3.5" /> Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                                </div>

                                {/* Title + First + Middle + Last */}
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Title</label>
                                        <Dropdown value={formData.title} options={TITLE_OPTIONS} onChange={(v) => setFormData((p) => ({ ...p, title: v as string }))} buttonClassName="py-2.5 text-sm rounded-xl" />
                                    </div>
                                    <div className="col-span-1 space-y-1.5 sm:col-span-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">First Name</label>
                                            <input required type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="John" className={plainInputCls} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Middle Name</label>
                                            <input type="text" name="middleName" value={formData.middleName} onChange={handleInputChange} placeholder="(optional)" className={plainInputCls} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Last Name</label>
                                            <input required type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Doe" className={plainInputCls} />
                                        </div>
                                    </div>
                                </div>

                                {/* Designation */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Designation</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input type="text" name="designation" value={formData.designation} onChange={handleInputChange} placeholder="e.g. Operations Manager" className={inputCls} />
                                    </div>
                                </div>

                                {/* Email + Phone */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input required type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="john.doe@example.com" className={inputCls} disabled={isEdit} />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Phone Number</label>
                                        <div className="flex gap-2">
                                            <div className="w-28 shrink-0">
                                                <Dropdown value={countryCode} options={COUNTRY_CODES} onChange={(v) => setCountryCode(v as string)} buttonClassName="py-2.5 text-sm rounded-xl" />
                                            </div>
                                            <div className="relative flex-1">
                                                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="98765 43210" className={inputCls} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Password (create only) */}
                                {!isEdit && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Password (Optional)</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange} placeholder="Leave empty to auto-generate a password" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs italic text-slate-500">A secure password will be auto-generated and emailed to the staff member. It's recommended to change it after first login.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Section */}
                    <div className="space-y-6">
                        <Card className="rounded-2xl border-slate-200">
                            <CardHeader className="border-b border-slate-100">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-500"><Shield className="h-4 w-4" /></span>
                                    Access & Role
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 pt-6">
                                <Dropdown
                                    label="Assigned Role"
                                    id="staffRole"
                                    value={formData.roleId}
                                    options={availableRoles.map((role) => ({ value: role.id, label: role.name }))}
                                    onChange={(v) => setFormData((p) => ({ ...p, roleId: v as string }))}
                                    placeholder="Select a role"
                                    buttonClassName="py-2.5 text-sm rounded-xl"
                                />

                                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                    <div className="flex gap-3">
                                        <AlertCircle className="h-5 w-5 shrink-0 text-blue-500" />
                                        <p className="text-sm text-blue-700">The assigned role determines what sections of the dashboard this staff member can access and what actions they can perform.</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-1">
                                    <Button type="submit" form="staff-form" disabled={isSaving} className="w-full bg-brand-500 text-white hover:bg-brand-600">
                                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        {isEdit ? 'Update Staff Member' : 'Create Staff Member'}
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={() => router.back()} className="w-full">Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
