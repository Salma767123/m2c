"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search, UserCheck, Building2, Mail, Phone, CheckCircle,
  Plus, Eye, FileText, ChevronLeft, ChevronRight,
  AlertTriangle, Clock, Users, X,
} from "lucide-react";
import { Badge } from "@/components/UI/Badge";
import { LoadingSpinner } from "@/components/UI/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/UI/Table";
import Dropdown from "@/components/UI/Dropdown";
import DateRangeCalendar, { fmtDate, parseDate } from "@/components/Shared/DateRangeCalendar";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";

import vendorService from "@/services/vendorService";
import qcCheckerService from "@/services/qcCheckerService";
import { formatCheckerName } from "@/lib/checkerUtils";

interface Vendor {
  id: string;
  vendorCode: string | null;
  companyName: string;
  gstNumber: string | null;
  ownerName: string;
  email: string;
  businessEmail: string | null;
  phone: string;
  status: string;
  assignedChecker: string | null;
  assignedCheckerName: string | null;
  inspectionStatus: string | null;
  inspectionResult: string | null;
  createdAt: string;
}

interface QCChecker {
  id: string;
  name: string;
  assignedVendors: number;
}

const ITEMS_PER_PAGE = 10;

function getPageRange(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | "…"> = [1];
  if (current > 4) pages.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push("…");
  pages.push(total);
  return pages;
}

const getStatusBadge = (status: string) => {
  switch (status.toUpperCase()) {
    case "APPROVED":
      return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">Approved</Badge>;
    case "PENDING":
      return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold">Pending</Badge>;
    case "UNDER_REVIEW":
      return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold">Under Review</Badge>;
    case "APPROVAL_PENDING":
      return <Badge className="bg-teal-50 text-teal-700 border border-teal-200 font-bold">Approval Pending</Badge>;
    case "REJECTION_PENDING":
      return <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-bold">Rejection Pending</Badge>;
    case "REJECTED":
      return <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold">Rejected</Badge>;
    case "REINSPECTION":
      return <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-bold">Re-Inspection</Badge>;
    case "SUSPENDED":
      return <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-bold">Suspended</Badge>;
    default:
      return <Badge className="bg-slate-100 text-slate-600 border border-slate-200 font-bold">{status}</Badge>;
  }
};

const getInspectionBadge = (vendorStatus: string, status: string | null, result: string | null) => {
  if (!status) return <span className="text-sm text-slate-400 italic">No Inspection</span>;
  // Once the vendor decision is finalized, the QC cycle that led to it is
  // concluded — reflect the outcome rather than a lingering inspection state
  // (an Approved vendor must never read "In Progress"). The vendor status is
  // authoritative here: APPROVED → passed, REJECTED/SUSPENDED → failed.
  // A genuinely cancelled inspection is left to fall through to its own label.
  if (["APPROVED", "REJECTED", "SUSPENDED"].includes(vendorStatus) && status !== "CANCELLED") {
    const failed = vendorStatus !== "APPROVED";
    return (
      <Badge className={failed ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}>
        {failed ? "Completed – Failed" : "Completed"}
      </Badge>
    );
  }
  const configs: Record<string, { label: string; className: string }> = {
    SCHEDULED:          { label: "Scheduled",           className: "bg-slate-100 text-slate-600 border border-slate-200" },
    IN_PROGRESS:        { label: "In Progress",          className: "bg-amber-50 text-amber-700 border border-amber-200" },
    SUBMITTED:          { label: result === "FAILED" ? "Awaiting Review · Fail" : result === "PASSED" ? "Awaiting Review · Pass" : "Awaiting Review",
                          className: result === "FAILED" ? "bg-red-50 text-red-700 border border-red-200" : result === "PASSED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200" },
    UNDER_ADMIN_REVIEW: { label: "Under Admin Review",   className: "bg-blue-50 text-blue-700 border border-blue-200" },
    COMPLETED:          { label: result === "FAILED" ? "Completed – Failed" : "Completed",
                          className: result === "FAILED" ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    REJECTED:           { label: "Rejected",             className: "bg-red-50 text-red-700 border border-red-200" },
    REINSPECTION:       { label: "Re-Inspection",        className: "bg-amber-50 text-amber-700 border border-amber-200" },
    CANCELLED:          { label: "Cancelled",            className: "bg-slate-100 text-slate-500 border border-slate-200" },
  };
  const cfg = configs[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border border-slate-200" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
};

export default function AssignQCChecker() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [qcCheckers, setQcCheckers] = useState<QCChecker[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: ITEMS_PER_PAGE, total: 0, pages: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [metricFilter, setMetricFilter] = useState<string>("all");
  const [filterVendorStatus, setFilterVendorStatus] = useState<string>("all");
  const [filterInspectionStatus, setFilterInspectionStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const mapVendors = (rawVendors: any[]): Vendor[] =>
    rawVendors.map((v: any) => ({
      id: v.id,
      vendorCode: v.vendorCode || null,
      companyName: v.companyName,
      gstNumber: v.gstNumber || null,
      ownerName: v.ownerName,
      email: v.email,
      businessEmail: v.businessEmail || v.email || null,
      phone: v.businessPhone,
      status: v.status,
      assignedChecker: v.assignedQcId || null,
      assignedCheckerName: v.assignedQc ? formatCheckerName(v.assignedQc) : null,
      inspectionStatus: v.latestInspection?.status || null,
      inspectionResult: v.latestInspection?.result || null,
      createdAt: v.createdAt || "",
    }));

  const fetchVendors = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const vendorFilters: {
        page: number;
        limit: number;
        status?: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
        search?: string;
        dateFrom?: string;
        dateTo?: string;
      } = { page, limit: ITEMS_PER_PAGE };

      if (filterVendorStatus !== "all") vendorFilters.status = filterVendorStatus as any;
      if (searchTerm.trim()) vendorFilters.search = searchTerm.trim();
      if (dateFrom) vendorFilters.dateFrom = dateFrom;
      if (dateTo) vendorFilters.dateTo = dateTo;

      const vendorListResponse = await vendorService.getAllVendors(vendorFilters);
      setVendors(mapVendors(vendorListResponse.vendors));
      setPagination(vendorListResponse.pagination);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
    } finally {
      setLoading(false);
    }
  }, [filterVendorStatus, searchTerm, dateFrom, dateTo]);

  const fetchCheckers = useCallback(async () => {
    try {
      const checkersResponse = await qcCheckerService.getAllQCCheckers();
      if (checkersResponse.success) setQcCheckers(checkersResponse.data);
    } catch (error) {
      console.error("Failed to fetch QC checkers:", error);
    }
  }, []);

  useEffect(() => { fetchCheckers(); }, [fetchCheckers]);
  useEffect(() => { fetchVendors(currentPage); }, [currentPage, fetchVendors]);

  const handleSearchSubmit = () => setCurrentPage(1);
  const handleVendorStatusChange = (value: string) => { setFilterVendorStatus(value); setCurrentPage(1); };
  const handleInspectionStatusChange = (value: string) => { setFilterInspectionStatus(value); };
  const handleDateChange = (from: string, to: string) => { setDateFrom(from); setDateTo(to); setCurrentPage(1); };
  const handleMetricClick = (key: string) => setMetricFilter(prev => prev === key ? "all" : key);

  // Client-side filters: metric cards + inspection status (combinable)
  const filteredVendors = vendors.filter((vendor) => {
    if (metricFilter === "assigned" && !vendor.assignedChecker) return false;
    if (metricFilter === "unassigned" && !!vendor.assignedChecker) return false;
    if (metricFilter === "awaiting" && vendor.inspectionStatus !== "SUBMITTED" && vendor.inspectionStatus !== "UNDER_ADMIN_REVIEW") return false;
    if (metricFilter === "assignable" && (!!vendor.assignedChecker || ["REJECTED", "SUSPENDED"].includes(vendor.status))) return false;
    if (filterInspectionStatus !== "all" && vendor.inspectionStatus !== filterInspectionStatus) return false;
    return true;
  });

  const totalAssigned = vendors.filter((v) => v.assignedChecker).length;
  const totalUnassigned = vendors.filter((v) => !v.assignedChecker).length;
  const totalAwaitingReview = vendors.filter(
    (v) => v.inspectionStatus === "SUBMITTED" || v.inspectionStatus === "UNDER_ADMIN_REVIEW"
  ).length;
  const totalAssignable = vendors.filter(
    (v) => !v.assignedChecker && !["REJECTED", "SUSPENDED"].includes(v.status)
  ).length;

  const rangeStart = filteredVendors.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, pagination.total);

  // ── Metric cards ─────────────────────────────────────────────────────────
  const metricCards = [
    {
      key: "all",
      label: "Total Vendors",
      subtitle: "Registered vendors",
      count: pagination.total,
      Icon: Building2,
      iconBg: "bg-brand-50",
      iconColor: "text-brand-500",
      countColor: "text-slate-900",
      activeClass: "border-brand-400 bg-brand-50/50",
    },
    {
      key: "assigned",
      label: "Assigned",
      subtitle: "Has QC checker",
      count: totalAssigned,
      Icon: UserCheck,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      countColor: "text-emerald-700",
      activeClass: "border-emerald-400 bg-emerald-50/60",
    },
    {
      key: "unassigned",
      label: "Unassigned",
      subtitle: "Needs assignment",
      count: totalUnassigned,
      Icon: AlertTriangle,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
      countColor: "text-orange-700",
      activeClass: "border-orange-400 bg-orange-50/60",
    },
    {
      key: "awaiting",
      label: "Awaiting Review",
      subtitle: "Report submitted",
      count: totalAwaitingReview,
      Icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      countColor: "text-amber-700",
      activeClass: "border-amber-400 bg-amber-50/60",
    },
    {
      key: "assignable",
      label: "QC Checkers",
      subtitle: `${qcCheckers.length} available · ${totalAssignable} can assign`,
      count: qcCheckers.length,
      Icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      countColor: "text-blue-700",
      activeClass: "border-blue-400 bg-blue-50/60",
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <Breadcrumb />
      <div className="space-y-6 mt-4">

        {/* ── 1. Page Header ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Assign QC Checker to Vendors</h1>
            <p className="text-slate-500 mt-0.5">Manage QC checker assignments for vendor quality control.</p>
          </div>
          <Link href="/admin/dashboard/vendors/assign-qc-checker/add" className="shrink-0">
            <button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors shadow-xs shadow-brand-500/10 text-sm whitespace-nowrap">
              <Plus className="h-4 w-4" />
              Create Assignment
            </button>
          </Link>
        </div>

        {/* ── 2. Metric Cards — all interactive ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {metricCards.map(({ key, label, subtitle, count, Icon, iconBg, iconColor, countColor, activeClass }) => {
            const isActive = metricFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleMetricClick(key)}
                className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${
                  isActive ? activeClass : "border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                  <span className="text-sm font-medium text-slate-500">{label}</span>
                  <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace("50", "100") : iconBg} transition-transform duration-150 group-hover:scale-110`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <div className={`text-2xl font-bold ${countColor}`}>{count}</div>
                  <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 3. Filter Toolbar ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 relative min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by company, owner, email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none w-full transition-all bg-white text-sm"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <DateRangeCalendar
                from={dateFrom}
                to={dateTo}
                onChange={handleDateChange}
                placeholder="Join Date"
              />
              <div className="w-40">
                <Dropdown
                  value={filterVendorStatus}
                  options={[
                    { value: "all", label: "All Statuses" },
                    { value: "APPROVED", label: "Approved" },
                    { value: "PENDING", label: "Pending" },
                    { value: "UNDER_REVIEW", label: "Under Review" },
                    { value: "REJECTED", label: "Rejected" },
                    { value: "SUSPENDED", label: "Suspended" },
                    { value: "REINSPECTION", label: "Re-Inspection" },
                  ]}
                  onChange={(val) => handleVendorStatusChange(val as string)}
                  placeholder="All Statuses"
                />
              </div>
              <div className="w-44">
                <Dropdown
                  value={filterInspectionStatus}
                  options={[
                    { value: "all", label: "All Inspections" },
                    { value: "SCHEDULED", label: "Scheduled" },
                    { value: "IN_PROGRESS", label: "In Progress" },
                    { value: "SUBMITTED", label: "Submitted" },
                    { value: "UNDER_ADMIN_REVIEW", label: "Under Admin Review" },
                    { value: "COMPLETED", label: "Completed" },
                    { value: "REINSPECTION", label: "Re-Inspection" },
                    { value: "REJECTED", label: "Rejected" },
                    { value: "CANCELLED", label: "Cancelled" },
                  ]}
                  onChange={(val) => handleInspectionStatusChange(val as string)}
                  placeholder="All Inspections"
                />
              </div>
              {(metricFilter !== "all" || filterVendorStatus !== "all" || filterInspectionStatus !== "all" || dateFrom || dateTo || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setMetricFilter("all");
                    setFilterVendorStatus("all");
                    setFilterInspectionStatus("all");
                    setDateFrom("");
                    setDateTo("");
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 px-3 py-2 rounded-xl"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. Table ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No vendors found</p>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search term</p>
            </div>
          ) : (
            <>
              <Table className="table-fixed">
                <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50">
                  <TableRow className="!bg-brand-500/[0.06] hover:!bg-brand-500/[0.06]">
                    <TableHead className="w-[21%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Vendor</TableHead>
                    <TableHead className="w-[12%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Contact Person</TableHead>
                    <TableHead className="w-[17%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Contact</TableHead>
                    <TableHead className="w-[10%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider text-center">Status</TableHead>
                    <TableHead className="w-[12%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Inspection</TableHead>
                    <TableHead className="w-[16%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Assigned Checker</TableHead>
                    <TableHead className="w-[12%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow
                      key={vendor.id}
                      className="hover:bg-slate-50/60 transition-colors duration-150 border-b border-slate-100 last:border-0"
                    >
                      {/* Vendor — Company Name + GST */}
                      <TableCell className="py-3 px-3 align-top">
                        <div className="flex flex-col gap-0.5">
                          <div className="font-semibold text-slate-900 leading-snug break-words">{vendor.companyName}</div>
                          {vendor.gstNumber ? (
                            <div className="text-xs text-slate-500 font-mono break-all">GST: {vendor.gstNumber}</div>
                          ) : (
                            <div className="text-xs text-slate-400 italic">Unregistered</div>
                          )}
                        </div>
                      </TableCell>

                      {/* Contact Person — owner name only */}
                      <TableCell className="py-3 px-3 align-top">
                        <div className="text-sm font-medium text-slate-700 break-words">{vendor.ownerName || "—"}</div>
                      </TableCell>

                      {/* Contact — phone + email */}
                      <TableCell className="py-3 px-3 align-top">
                        <div className="flex flex-col gap-0.5">
                          {vendor.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-700">
                              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="whitespace-nowrap">{vendor.phone}</span>
                            </div>
                          )}
                          {vendor.businessEmail && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="break-all">{vendor.businessEmail}</span>
                            </div>
                          )}
                          {!vendor.phone && !vendor.businessEmail && (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div className="flex justify-center">
                          {getStatusBadge(vendor.status)}
                        </div>
                      </TableCell>

                      {/* Inspection Status */}
                      <TableCell className="py-3 px-3 align-middle">
                        {getInspectionBadge(vendor.status, vendor.inspectionStatus, vendor.inspectionResult)}
                      </TableCell>

                      {/* Assigned QC Checker */}
                      <TableCell className="py-3 px-3 align-middle">
                        {vendor.assignedCheckerName ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span className="text-sm font-medium text-slate-900 break-words">{vendor.assignedCheckerName}</span>
                          </div>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border border-slate-200 text-xs">Unassigned</Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          {(() => {
                            const s = vendor.inspectionStatus;
                            const vs = vendor.status;
                            const vendorFinalized = ["APPROVED", "REJECTED", "SUSPENDED"].includes(vs);
                            // Report/Review already open the inspection detail page,
                            // so a separate eye icon on those rows is a duplicate link.
                            // Only show the eye when the primary action goes elsewhere
                            // (the Assign/Update form) yet an inspection exists to view.
                            if (s === "COMPLETED" || (vendorFinalized && s)) {
                              return (
                                <Link
                                  href={`/admin/dashboard/vendors/inspection/${vendor.id}`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Report
                                </Link>
                              );
                            }
                            if (s === "SUBMITTED" || s === "UNDER_ADMIN_REVIEW") {
                              return (
                                <Link
                                  href={`/admin/dashboard/vendors/inspection/${vendor.id}`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Review
                                </Link>
                              );
                            }
                            return (
                              <>
                                {s && (
                                  <Link
                                    href={`/admin/dashboard/vendors/inspection/${vendor.id}`}
                                    title="View Inspection Details"
                                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                )}
                                <Link
                                  href={`/admin/dashboard/vendors/assign-qc-checker/add?vendorId=${vendor.id}`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  {vendor.assignedChecker ? "Update" : "Assign"}
                                </Link>
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-slate-100">
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {pagination.total === 0
                      ? "0 vendors"
                      : `Showing ${rangeStart}–${rangeEnd} of ${pagination.total} vendor${pagination.total === 1 ? "" : "s"}`}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {getPageRange(currentPage, pagination.pages).map((p, i) =>
                      p === "…" ? (
                        <span key={`e-${i}`} className="px-2 text-slate-400 text-sm">…</span>
                      ) : (
                        <button
                          key={`p-${p}`}
                          onClick={() => setCurrentPage(p as number)}
                          aria-current={p === currentPage ? "page" : undefined}
                          className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                            p === currentPage
                              ? "bg-brand-500 text-white shadow-xs shadow-brand-500/20"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                      disabled={currentPage >= pagination.pages}
                      className="p-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Results summary when no pagination */}
        {!loading && pagination.pages <= 1 && pagination.total > 0 && (
          <p className="text-xs text-slate-400">
            Showing {filteredVendors.length} of {pagination.total} vendor{pagination.total === 1 ? "" : "s"}
            {metricFilter !== "all" ? ` (filtered)` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
