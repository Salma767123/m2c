'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { userManagementService, Staff } from '@/services/userManagementService';
import { hasPermission } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Shield,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  Key,
} from 'lucide-react';

export default function StaffView() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        const data = await userManagementService.getStaffById(userId);
        setStaff(data);
      } catch (error) {
        console.error('Failed to fetch staff member', error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchStaff();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-3 text-gray-600">Loading staff details...</span>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="text-center py-16">
        <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium text-gray-900">Staff member not found</p>
        <p className="text-sm text-gray-500 mt-1">This account may have been deleted or the link is invalid.</p>
        <Button
          onClick={() => router.push('/admin/dashboard/users/user-management')}
          className="mt-6 bg-gray-900 hover:bg-gray-800 text-white"
        >
          Back to User Management
        </Button>
      </div>
    );
  }

  const fullName = `${staff.firstName} ${staff.lastName}`.trim();
  const initials = `${staff.firstName?.charAt(0) ?? ''}${staff.lastName?.charAt(0) ?? ''}`.toUpperCase();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 px-3 py-1">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800 px-3 py-1">Suspended</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 px-3 py-1">{status}</Badge>;
    }
  };

  // Deterministic role badge color — same palette as UserManagement.tsx
  const ROLE_PALETTE = [
    'bg-purple-100 text-purple-800',
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-amber-100 text-amber-800',
    'bg-rose-100 text-rose-800',
    'bg-teal-100 text-teal-800',
    'bg-indigo-100 text-indigo-800',
    'bg-orange-100 text-orange-800',
  ];
  const getRoleBadge = (role: string) => {
    if (!role) return <Badge className="bg-gray-100 text-gray-800">—</Badge>;
    if (role.toLowerCase().trim() === 'super admin') {
      return <Badge className="bg-purple-100 text-purple-800">{role}</Badge>;
    }
    let hash = 0;
    for (let i = 0; i < role.length; i++) hash = (hash * 31 + role.charCodeAt(i)) >>> 0;
    const cls = ROLE_PALETTE[hash % ROLE_PALETTE.length];
    return <Badge className={cls}>{role}</Badge>;
  };

  // Format permission key into a readable label: "view_products" → "View Products"
  const formatPermission = (perm: string) =>
    perm
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const hasAddress =
    staff.address &&
    staff.address.addressLine1 &&
    staff.address.addressLine1 !== 'N/A';

  return (
    <div className="space-y-6">
      <Breadcrumb />

      {/* Page Header */}
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
            <h1 className="text-2xl font-bold text-gray-900">Staff Details</h1>
            <p className="text-sm text-gray-600">Read-only view of staff profile and permissions</p>
          </div>
        </div>

        {hasPermission('edit_users') && (
          <Button
            onClick={() => router.push(`/admin/dashboard/users/edit/${userId}`)}
            className="bg-gray-900 hover:bg-gray-800 text-white flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Staff
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Profile Card ── */}
        <Card className="lg:col-span-1 border border-gray-200">
          <CardContent className="p-6">
            {/* Avatar + Name */}
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                {staff.avatar ? (
                  <img
                    src={staff.avatar}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">{initials}</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
              <div className="mt-2">{getRoleBadge(staff.role)}</div>
              <div className="mt-2">{getStatusBadge(staff.status)}</div>
            </div>

            {/* Contact & Meta */}
            <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900 break-all">{staff.email}</p>
                </div>
                {staff.isEmailVerified ? (
                  <ShieldCheck className="h-4 w-4 text-green-500 shrink-0 mt-0.5" aria-label="Verified" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" aria-label="Not verified" />
                )}
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{staff.phone || 'N/A'}</p>
                </div>
                {staff.isPhoneVerified ? (
                  <ShieldCheck className="h-4 w-4 text-green-500 shrink-0 mt-0.5" aria-label="Verified" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" aria-label="Not verified" />
                )}
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Joined</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(staff.joinDate).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Last Login</p>
                  <p className="text-sm font-medium text-gray-900">
                    {staff.lastLogin
                      ? new Date(staff.lastLogin).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Summary */}
            <div className="mt-6 border-t border-gray-200 pt-6 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Verification
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Email verified</span>
                {staff.isEmailVerified ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-300" />
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Phone verified</span>
                {staff.isPhoneVerified ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-300" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Right Column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Role & Access Card */}
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-600" />
                Role & Access
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Assigned Role</p>
                  <div className="text-base font-semibold">{getRoleBadge(staff.role)}</div>
                </div>
              </div>

              {staff.permissions && staff.permissions.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Key className="h-3.5 w-3.5" />
                    Permissions ({staff.permissions.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {staff.permissions.map((perm) => (
                      <div
                        key={perm}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <span className="text-xs text-gray-700 font-medium">
                          {formatPermission(perm)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                  <p className="text-sm text-yellow-700">
                    No permissions assigned to this role. The staff member may not be able to access any sections.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Card */}
          {hasAddress && (
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                  <p className="text-sm text-gray-800">{staff.address.addressLine1}</p>
                  {staff.address.addressLine2 && (
                    <p className="text-sm text-gray-800">{staff.address.addressLine2}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {[staff.address.city, staff.address.state, staff.address.zipCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {staff.address.country && staff.address.country !== 'N/A' && (
                    <p className="text-sm text-gray-600">{staff.address.country}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Summary Card */}
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-gray-600" />
                Account Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="text-gray-500">Full Name</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{fullName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Role</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{staff.role || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Account Status</dt>
                  <dd className="mt-0.5">{getStatusBadge(staff.status)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Permissions</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">
                    {staff.permissions?.length ?? 0} granted
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Member Since</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">
                    {new Date(staff.joinDate).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Last Active</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">
                    {staff.lastLogin
                      ? new Date(staff.lastLogin).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Never'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
