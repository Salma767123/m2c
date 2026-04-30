"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, UserCheck, Building2, Mail, Phone, CheckCircle, Plus, Eye, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";

interface Vendor {
  id: string;
  vendorCode: string | null;
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  status: string;
  assignedChecker: string | null;
  assignedCheckerName: string | null;
  inspectionStatus: string | null;
}

interface QCChecker {
  id: string;
  name: string;
  assignedVendors: number;
}

import vendorService from '@/services/vendorService';
import qcCheckerService from '@/services/qcCheckerService';

const ITEMS_PER_PAGE = 10;

export default function AssignQCChecker() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [qcCheckers, setQcCheckers] = useState<QCChecker[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: ITEMS_PER_PAGE, total: 0, pages: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterVendorStatus, setFilterVendorStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const mapVendors = (rawVendors: any[]): Vendor[] =>
    rawVendors.map((v: any) => ({
      id: v.id,
      vendorCode: v.vendorCode || null,
      companyName: v.companyName,
      ownerName: v.ownerName,
      email: v.email,
      phone: v.businessPhone,
      status: v.status,
      assignedChecker: v.assignedQcId || null,
      assignedCheckerName: v.assignedQc?.name || null,
      inspectionStatus: v.latestInspection?.status || null,
    }));

  const fetchVendors = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const vendorFilters: { page: number; limit: number; status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'; search?: string } = {
        page,
        limit: ITEMS_PER_PAGE,
      };
      if (filterVendorStatus !== "all") {
        vendorFilters.status = filterVendorStatus as any;
      }
      if (searchTerm.trim()) {
        vendorFilters.search = searchTerm.trim();
      }

      const vendorListResponse = await vendorService.getAllVendors(vendorFilters);
      setVendors(mapVendors(vendorListResponse.vendors));
      setPagination(vendorListResponse.pagination);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  }, [filterVendorStatus, searchTerm]);

  const fetchCheckers = useCallback(async () => {
    try {
      const checkersResponse = await qcCheckerService.getAllQCCheckers();
      if (checkersResponse.success) {
        setQcCheckers(checkersResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch QC checkers:', error);
    }
  }, []);

  useEffect(() => {
    fetchCheckers();
  }, [fetchCheckers]);

  useEffect(() => {
    fetchVendors(currentPage);
  }, [currentPage, fetchVendors]);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSearchSubmit = () => {
    setCurrentPage(1);
  };

  const handleFilterStatusChange = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handleVendorStatusChange = (value: string) => {
    setFilterVendorStatus(value);
    setCurrentPage(1);
  };

  // Client-side filter for assignment status (not in API)
  const filteredVendors = vendors.filter((vendor) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "assigned") return !!vendor.assignedChecker;
    if (filterStatus === "unassigned") return !vendor.assignedChecker;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      APPROVED: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      UNDER_REVIEW: "bg-blue-100 text-blue-800",
      REJECTED: "bg-red-100 text-red-800",
      REINSPECTION: "bg-amber-100 text-amber-800",
      SUSPENDED: "bg-gray-100 text-gray-800",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  const totalAssigned = filteredVendors.filter((v) => v.assignedChecker).length;
  const totalUnassigned = filteredVendors.filter((v) => !v.assignedChecker).length;

  // Pagination helpers (matches QC Reports style)
  const getPageRange = (current: number, total: number): Array<number | '…'> => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: Array<number | '…'> = [1];
    if (current > 4) pages.push('…');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let p = start; p <= end; p++) pages.push(p);
    if (current < total - 3) pages.push('…');
    pages.push(total);
    return pages;
  };

  const rangeStart = pagination.total === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, pagination.total);

  return (
    <div className="p-6">
      <Breadcrumb />
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assign QC Checker to Vendors</h1>
          <p className="text-gray-600 mt-1">Manage QC checker assignments for vendor quality control</p>
        </div>
        <Link
          href="/admin/dashboard/vendors/assign-qc-checker/add"
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Assignment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Vendors</div>
            <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Assigned</div>
            <div className="text-2xl font-bold text-green-600">{totalAssigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Unassigned</div>
            <div className="text-2xl font-bold text-orange-600">{totalUnassigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Available Checkers</div>
            <div className="text-2xl font-bold text-blue-600">{qcCheckers.length}</div>
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
                placeholder="Search by company name, owner, email, or vendor code..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-48">
                <Dropdown
                  value={filterStatus}
                  options={[
                    { value: "all", label: "All Vendors" },
                    { value: "assigned", label: "Assigned" },
                    { value: "unassigned", label: "Unassigned" },
                  ]}
                  onChange={(val) => handleFilterStatusChange(val as string)}
                  placeholder="Filter by assignment"
                />
              </div>
              <div className="w-full sm:w-48">
                <Dropdown
                  value={filterVendorStatus}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "APPROVED", label: "Approved" },
                    { value: "PENDING", label: "Pending" },
                    { value: "UNDER_REVIEW", label: "Under Review" },
                    { value: "REJECTED", label: "Rejected" },
                    { value: "REINSPECTION", label: "Re-Inspection" },
                  ]}
                  onChange={(val) => handleVendorStatusChange(val as string)}
                  placeholder="Filter by status"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600 mb-4">
        <span>
          {loading
            ? 'Loading vendors...'
            : pagination.total === 0
              ? '0 vendors'
              : `Showing ${rangeStart}–${rangeEnd} of ${pagination.total} vendor${pagination.total === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Vendors Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Details</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned QC Checker</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredVendors.length > 0 ? (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{vendor.companyName}</div>
                        <div className="text-sm text-gray-500">{vendor.ownerName}</div>
                        {vendor.vendorCode && (
                          <div className="text-xs font-mono text-gray-400 mt-0.5">{vendor.vendorCode}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="h-3 w-3 mr-1 text-gray-400" />
                        {vendor.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-3 w-3 mr-1 text-gray-400" />
                        {vendor.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                  <TableCell>
                    {vendor.assignedCheckerName ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {vendor.assignedCheckerName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/dashboard/vendors/inspection/${vendor.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Inspection Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {vendor.inspectionStatus === "COMPLETED" ? (
                        <Link
                          href={`/admin/dashboard/vendors/inspection/${vendor.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          View Report
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/dashboard/vendors/assign-qc-checker/add?vendorId=${vendor.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <UserCheck className="h-4 w-4" />
                          {vendor.assignedChecker ? "Update" : "Assign"}
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="p-12 text-center">
                    <p className="text-gray-500">No vendors found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm mt-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {getPageRange(currentPage, pagination.pages).map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button
                  key={`p-${p}`}
                  onClick={() => setCurrentPage(p as number)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={currentPage >= pagination.pages}
              className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
