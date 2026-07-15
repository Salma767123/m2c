'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { userManagementService, Staff } from '@/services/userManagementService';
import { roleService, Role } from '@/services/roleService';
import { hasPermission } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/Table';
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb';
import { useRouter } from 'next/navigation';
import Dropdown from '@/components/UI/Dropdown';
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal';
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  Mail,
  Phone,
  Activity,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const PAGE_SIZE = 10;
const REFRESH_INTERVAL_MS = 30000;

function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 4) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('…');
  pages.push(total);
  return pages;
}

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<Staff[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Use a ref to always call the latest fetchStaff inside setInterval without resetting the interval
  const fetchStaffRef = useRef<() => void>(() => {});

  // Update the ref to the latest fetchStaff on every render
  useEffect(() => {
    fetchStaffRef.current = fetchStaff;
  });

  useEffect(() => {
    setCurrentPage(1);
    fetchStaff();
    fetchRoles();

    let timer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (timer) return;
      timer = setInterval(() => fetchStaffRef.current(), REFRESH_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchStaffRef.current();
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, roleFilter, statusFilter]);

  const fetchRoles = async () => {
    try {
      const data = await roleService.getRoles();
      if (data.success) {
        setAvailableRoles(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch roles', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const data = await userManagementService.getStaff({
        search: searchTerm,
        role: roleFilter === 'all' ? undefined : roleFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setUsers(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch staff', error);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'suspended') => {
    try {
      await userManagementService.updateStaffStatus(userId, newStatus);
      fetchStaff();
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const handleDeleteClick = (user: Staff) => {
    setDeleteTarget({ id: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await userManagementService.deleteStaff(deleteTarget.id);
      fetchStaff();
    } catch (error) {
      console.error('Failed to delete staff', error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleAddStaff = () => {
    router.push('/admin/dashboard/users/add');
  };

  const handleEditStaff = (userId: string) => {
    router.push(`/admin/dashboard/users/edit/${userId}`);
  };

  // Calculate stats from current data
  const totalUsers = users.length;
  const newThisMonth = users.filter(user => {
    const joinDate = new Date(user.joinDate);
    const now = new Date();
    return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
  }).length;
  const activeToday = users.filter(user => {
    const lastLogin = new Date(user.lastLogin);
    const today = new Date();
    return lastLogin.toDateString() === today.toDateString();
  }).length;
  const activeUsers = users.filter(user => user.status === 'active').length;
  const suspendedUsers = users.filter(user => user.status === 'suspended').length;
  const pendingUsers = users.filter(user => user.status === 'pending').length;

  // Filtering is now done server-side; keep local reference for table
  const filteredUsers = users;

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-50 text-green-700 border border-green-200">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-50 text-red-700 border border-red-200">Suspended</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">Pending</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">Unknown</Badge>;
    }
  };

  // Deterministic color picker — hashes the role name to a fixed palette so
  // every role (including future custom ones) gets a stable color with no
  // hardcoded "admin"/"manager" string matching.
  const ROLE_PALETTE = [
    'bg-purple-50 text-purple-700 border border-purple-200',
    'bg-blue-50 text-blue-700 border border-blue-200',
    'bg-green-50 text-green-700 border border-green-200',
    'bg-amber-50 text-amber-700 border border-amber-200',
    'bg-rose-50 text-rose-700 border border-rose-200',
    'bg-teal-50 text-teal-700 border border-teal-200',
    'bg-indigo-50 text-indigo-700 border border-indigo-200',
    'bg-orange-50 text-orange-700 border border-orange-200',
  ];
  const getRoleBadge = (role: string) => {
    if (!role) return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">—</Badge>;
    // Super Admin always gets the distinctive purple treatment (case-insensitive match)
    if (role.toLowerCase().trim() === 'super admin') {
      return <Badge className="bg-purple-50 text-purple-700 border border-purple-200">{role}</Badge>;
    }
    let hash = 0;
    for (let i = 0; i < role.length; i++) hash = (hash * 31 + role.charCodeAt(i)) >>> 0;
    const cls = ROLE_PALETTE[hash % ROLE_PALETTE.length];
    return <Badge className={cls}>{role}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-600">Manage internal staff and their access levels (Ready for Add Staff)</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission('staff_management:create') && (
            <Button
              onClick={handleAddStaff}
              className="bg-brand-500 hover:bg-brand-600 text-white shadow-sm px-6 py-2 rounded-lg font-semibold flex items-center transition-all hover:scale-105 active:scale-95"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              <span>Add Staff Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-slate-600">Internal staff members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{newThisMonth}</div>
            <p className="text-xs text-slate-600">Joined in the last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{activeToday}</div>
            <p className="text-xs text-slate-600">Currently online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
            <p className="text-xs text-slate-600">Verified accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{suspendedUsers}</div>
            <p className="text-xs text-slate-600">Restricted access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Shield className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingUsers}</div>
            <p className="text-xs text-slate-600">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Filter Users</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Search className="w-4 h-4 inline mr-2" />
                Search Users
              </label>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <Dropdown
                label="User Role"
                id="roleFilter"
                value={roleFilter}
                options={[
                  { value: 'all', label: 'All Roles' },
                  ...availableRoles.map(r => ({ value: r.id, label: r.name }))
                ]}
                onChange={(value: string | string[]) => setRoleFilter(value as string)}
                placeholder="Select role"
              />
            </div>

            <div>
              <Dropdown
                label="User Status"
                id="statusFilter"
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'suspended', label: 'Suspended' },
                  { value: 'pending', label: 'Pending' }
                ]}
                onChange={(value: string | string[]) => setStatusFilter(value as string)}
                placeholder="Select status"
              />
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-slate-500 mt-4 text-right">
              Auto-updates every 30s &middot; Last updated {lastUpdated.toLocaleTimeString("en-IN")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="text-slate-500">
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your search or filter criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-medium text-slate-600">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className={user.isEmailVerified ? 'text-green-600' : 'text-slate-600'}>
                            {user.email}
                          </span>
                          {user.isEmailVerified && <ShieldCheck className="h-3 w-3 text-green-500" />}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span className={user.isPhoneVerified ? 'text-green-600' : 'text-slate-600'}>
                            {user.phone}
                          </span>
                          {user.isPhoneVerified && <ShieldCheck className="h-3 w-3 text-green-500" />}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{user.totalOrders} orders</div>
                        {user.totalSpent > 0 && (
                          <div className="text-slate-500">${user.totalSpent.toFixed(2)}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600">
                        {new Date(user.lastLogin).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasPermission('staff_management:view') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-slate-100"
                            title="View User Details"
                            onClick={() => router.push(`/admin/dashboard/users/view/${user.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('staff_management:edit') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-slate-100"
                            title="Edit User"
                            onClick={() => handleEditStaff(user.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('staff_management:suspend') && user.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-yellow-100 text-yellow-600"
                            title="Suspend User"
                            onClick={() => handleStatusChange(user.id, 'suspended')}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : hasPermission('staff_management:suspend') ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-green-100 text-green-600"
                            title="Activate User"
                            onClick={() => handleStatusChange(user.id, 'active')}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {hasPermission('staff_management:delete') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-100 text-red-600"
                            title="Delete User"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        show={!!deleteTarget}
        title="Delete Staff Member"
        itemName={deleteTarget?.name || ''}
        itemDetail={deleteTarget?.email || ''}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}