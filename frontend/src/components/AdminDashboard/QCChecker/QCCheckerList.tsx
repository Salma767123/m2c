"use client";

import { useState, useEffect } from "react";
import { Search, Eye, Edit, Trash2, UserPlus, Mail, Phone, Calendar, RefreshCw, Send, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import { qcCheckerService, QCCheckerData } from "@/services/qcCheckerService";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { hasPermission } from "@/lib/auth";
import DeleteConfirmModal from "../../UI/DeleteConfirmModal";

const PAGE_SIZE = 10;

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

export default function QCCheckerList() {
  const [checkers, setCheckers] = useState<QCCheckerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState<{ type: 'delete' | 'resend'; id: string; label: string } | null>(null);

  // Fetch QC Checkers
  const fetchCheckers = async () => {
    setLoading(true);
    try {
      const params: { status?: string; search?: string } = {};
      if (filterStatus !== "all") params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;

      const result = await qcCheckerService.getAllQCCheckers(params);
      if (result.success) {
        setCheckers(result.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch QC checkers:", error);
      showErrorToast("Error", error.message || "Failed to fetch QC checkers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchCheckers();
  }, [filterStatus]);

  // Debounced search
  useEffect(() => {
    setCurrentPage(1);
    const timer = setTimeout(() => {
      fetchCheckers();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Delete handler
  const handleDeleteClick = (id: string, name: string) => {
    setConfirmModal({ type: 'delete', id, label: name });
  };

  const confirmDeleteAction = async () => {
    if (!confirmModal || confirmModal.type !== 'delete') return;
    setDeletingId(confirmModal.id);
    try {
      await qcCheckerService.deleteQCChecker(confirmModal.id);
      showSuccessToast("Deleted!", `QC Checker "${confirmModal.label}" has been deleted.`);
      fetchCheckers();
    } catch (error: any) {
      showErrorToast("Delete Failed", error.message || "Failed to delete QC checker");
    } finally {
      setDeletingId(null);
      setConfirmModal(null);
    }
  };

  // Resend credentials
  const handleResendClick = (id: string, email: string) => {
    setConfirmModal({ type: 'resend', id, label: email });
  };

  const confirmResendAction = async () => {
    if (!confirmModal || confirmModal.type !== 'resend') return;
    setResendingId(confirmModal.id);
    try {
      const result = await qcCheckerService.resendCredentials(confirmModal.id);
      showSuccessToast("Credentials Sent!", result.message || `New credentials sent to ${confirmModal.label}`);
    } catch (error: any) {
      showErrorToast("Failed", error.message || "Failed to resend credentials");
    } finally {
      setResendingId(null);
      setConfirmModal(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    const styles = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[normalizedStatus as keyof typeof styles] || styles.inactive}`}>
        {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
      </span>
    );
  };

  const totalPages = Math.max(1, Math.ceil(checkers.length / PAGE_SIZE));
  const paginatedCheckers = checkers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalActive = checkers.filter((c) => c.status === "ACTIVE").length;
  const totalInactive = checkers.filter((c) => c.status === "INACTIVE").length;
  const totalInspections = checkers.reduce((sum, c) => sum + (c.completedInspections || 0), 0);

  return (
    <div className="p-6">
      <Breadcrumb />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QC Checker Management</h1>
          <p className="text-gray-600 mt-1">Manage quality control checkers and their assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCheckers}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {hasPermission('create_qc_checkers') && (
            <Link
              href="/admin/dashboard/qc-checker/create"
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              Add QC Checker
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Checkers</div>
            <div className="text-2xl font-bold text-gray-900">{checkers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">{totalActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Inactive</div>
            <div className="text-2xl font-bold text-gray-600">{totalInactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Inspections</div>
            <div className="text-2xl font-bold text-blue-600">{totalInspections}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or checker ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent"
              />
            </div>
            <div className="w-full md:w-48">
              <Dropdown
                value={filterStatus}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                  { value: "SUSPENDED", label: "Suspended" },
                ]}
                onChange={(val) => setFilterStatus(val as string)}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checkers Table */}
      {!loading && checkers.length > 0 && (
        <div className="text-sm text-slate-600 mb-2">
          Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, checkers.length)} of {checkers.length}
        </div>
      )}
      <Card>
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Loading QC Checkers...</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Checker Details</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Vendors</TableHead>
                <TableHead>Inspections</TableHead>
                <TableHead>Joined Date</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCheckers.length > 0 ? (
                paginatedCheckers.map((checker) => (
                  <TableRow key={checker.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{checker.name}</div>
                        <div className="text-sm text-blue-600 font-mono">{checker.checkerId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="h-3 w-3 mr-1 text-gray-400" />
                          {checker.email}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="h-3 w-3 mr-1 text-gray-400" />
                          {checker.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(checker.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900">{checker.assignedVendors || 0}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-blue-600">{checker.completedInspections || 0}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                        {new Date(checker.joiningDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {checker.lastLoginAt
                          ? new Date(checker.lastLoginAt).toLocaleDateString()
                          : "Never"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {hasPermission('edit_qc_checkers') && (
                          <button
                            onClick={() => handleResendClick(checker.id, checker.email)}
                            disabled={resendingId === checker.id}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Resend Credentials"
                          >
                            <Send className={`h-4 w-4 ${resendingId === checker.id ? 'animate-pulse' : ''}`} />
                          </button>
                        )}
                        {hasPermission('delete_qc_checkers') && (
                          <button
                            onClick={() => handleDeleteClick(checker.id, checker.name)}
                            disabled={deletingId === checker.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Checker"
                          >
                            <Trash2 className={`h-4 w-4 ${deletingId === checker.id ? 'animate-pulse' : ''}`} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="p-12 text-center">
                      <p className="text-gray-500">No QC checkers found</p>
                      {hasPermission('create_qc_checkers') && (
                        <Link
                          href="/admin/dashboard/qc-checker/create"
                          className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <UserPlus className="h-4 w-4" />
                          Add your first QC Checker
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      <DeleteConfirmModal
        show={!!confirmModal}
        variant={confirmModal?.type === 'resend' ? 'warning' : 'danger'}
        title={confirmModal?.type === 'resend' ? 'Resend Credentials' : 'Delete QC Checker'}
        subtitle={confirmModal?.type === 'resend' ? 'This will reset the password' : 'This action cannot be undone'}
        itemName={confirmModal?.label}
        confirmLabel={confirmModal?.type === 'resend' ? 'Resend' : 'Delete Permanently'}
        loadingLabel={confirmModal?.type === 'resend' ? 'Sending...' : 'Deleting...'}
        loading={confirmModal?.type === 'resend' ? resendingId === confirmModal?.id : deletingId === confirmModal?.id}
        onConfirm={confirmModal?.type === 'resend' ? confirmResendAction : confirmDeleteAction}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
