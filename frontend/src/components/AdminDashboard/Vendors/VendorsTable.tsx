'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/UI/Table'
import { Badge } from '@/components/UI/Badge'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'
import Dropdown from '@/components/UI/Dropdown'
import DateRangeCalendar from '@/components/Shared/DateRangeCalendar'
import {
  Edit, Eye, CheckCircle, XCircle, Search, Plus,
  ChevronLeft, ChevronRight, RotateCcw,
  Building2, Clock, AlertTriangle,
} from 'lucide-react'
import VendorService, { VendorProfile, VendorFilters } from '@/services/vendorService'
import { formatDate } from '@/lib/utils'
import RejectionModal from './RejectionModal'
import SuspensionModal from './SuspensionModal'
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal'
import { toast } from '@/hooks/use-toast'
import { hasPermission } from '@/lib/auth'

function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: Array<number | '…'> = [1]
  if (current > 4) pages.push('…')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let p = start; p <= end; p++) pages.push(p)
  if (current < total - 3) pages.push('…')
  pages.push(total)
  return pages
}

const getStatusBadge = (status: string) => {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">Approved</Badge>
    case 'PENDING':
      return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold">Pending</Badge>
    case 'UNDER_REVIEW':
      return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold">Under Review</Badge>
    case 'SUSPENDED':
      return <Badge className="bg-slate-100 text-slate-600 border border-slate-200 font-bold">Suspended</Badge>
    case 'REJECTED':
      return <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold">Rejected</Badge>
    case 'APPROVAL_PENDING':
      return <Badge className="bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold">Approval Pending</Badge>
    case 'REJECTION_PENDING':
      return <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-bold">Rejection Pending</Badge>
    case 'REINSPECTION':
      return <Badge className="bg-purple-50 text-purple-700 border border-purple-200 font-bold">Re-Inspection</Badge>
    case 'SUBMITTED':
      return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold">Submitted</Badge>
    default:
      return <Badge className="bg-slate-100 text-slate-600 border border-slate-200 font-bold">Unknown</Badge>
  }
}

const getInspectionBadge = (vendorStatus: string, latestInspection?: VendorProfile['latestInspection']) => {
  if (!latestInspection) return null
  if (['APPROVED', 'REJECTED', 'SUSPENDED'].includes(vendorStatus)) return null
  const { status, result } = latestInspection
  switch (status) {
    case 'SUBMITTED':
      return result === 'FAILED'
        ? <Badge className="bg-red-50 text-red-700 border border-red-200">QC Failed - Awaiting Review</Badge>
        : <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">QC Passed - Awaiting Approval</Badge>
    case 'SCHEDULED':
      return <Badge className="bg-slate-50 text-slate-600 border border-slate-200">QC Scheduled</Badge>
    case 'IN_PROGRESS':
      return <Badge className="bg-blue-50 text-blue-700 border border-blue-200">QC In Progress</Badge>
    case 'UNDER_ADMIN_REVIEW':
      return <Badge className="bg-purple-50 text-purple-700 border border-purple-200">Under Admin Review</Badge>
    default:
      return null
  }
}

const getLocationString = (vendor: VendorProfile): string => {
  const parts = [vendor.businessCity, vendor.businessState, vendor.businessCountry].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Not specified'
}

const hasRating = (vendor: VendorProfile): boolean =>
  typeof vendor.rating === 'number' && (vendor.ratingCount ?? 0) > 0

interface StatusCounts {
  total: number
  pending: number
  underReview: number
  approved: number
  rejected: number
  suspended: number
}

interface ModalState {
  isOpen: boolean
  vendor: VendorProfile | null
}

const CLOSED_MODAL: ModalState = { isOpen: false, vendor: null }

export default function VendorsTable() {
  const [vendors, setVendors] = useState<VendorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<VendorFilters>({ page: 1, limit: 10 })
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0, suspended: 0,
  })
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Modals
  const [rejectionModal, setRejectionModal] = useState<ModalState>(CLOSED_MODAL)
  const [suspensionModal, setSuspensionModal] = useState<ModalState>(CLOSED_MODAL)
  const [approvalModal, setApprovalModal] = useState<ModalState>(CLOSED_MODAL)
  const [confirmApprovalModal, setConfirmApprovalModal] = useState<ModalState>(CLOSED_MODAL)
  const [cancelApprovalModal, setCancelApprovalModal] = useState<ModalState>(CLOSED_MODAL)
  const [confirmRejectionModal, setConfirmRejectionModal] = useState<ModalState>(CLOSED_MODAL)
  const [cancelRejectionModal, setCancelRejectionModal] = useState<ModalState>(CLOSED_MODAL)

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchVendors = async () => {
    try {
      setLoading(true)
      setError(null)
      const auth = VendorService.getStoredAuth ? VendorService.getStoredAuth() : null
      console.log('Auth check:', auth)
      const response = await VendorService.getAllVendors(filters)
      setVendors(response.vendors)
      setPagination(response.pagination)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch vendors'
      console.error('Fetch vendors error:', err)
      setError(msg)
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchStatusCounts = async () => {
    try {
      const [total, pending, underReview, approved, rejected, suspended] = await Promise.all([
        VendorService.getAllVendors({ limit: 1 }),
        VendorService.getAllVendors({ status: 'PENDING', limit: 1 }),
        VendorService.getAllVendors({ status: 'UNDER_REVIEW', limit: 1 }),
        VendorService.getAllVendors({ status: 'APPROVED', limit: 1 }),
        VendorService.getAllVendors({ status: 'REJECTED', limit: 1 }),
        VendorService.getAllVendors({ status: 'SUSPENDED', limit: 1 }),
      ])
      setStatusCounts({
        total: total.pagination.total,
        pending: pending.pagination.total,
        underReview: underReview.pagination.total,
        approved: approved.pagination.total,
        rejected: rejected.pagination.total,
        suspended: suspended.pagination.total,
      })
    } catch {
      // counts are informational — silently ignore
    }
  }

  useEffect(() => { fetchVendors() }, [filters])
  useEffect(() => { fetchStatusCounts() }, [])

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleSearch = () =>
    setFilters(prev => ({ ...prev, search: searchTerm || undefined, page: 1 }))

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setFilters(prev => ({ ...prev, status: status ? status as any : undefined, page: 1 }))
  }

  const handleMetricClick = (key: string) =>
    handleStatusFilter(statusFilter === key ? '' : key)

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
    setFilters(prev => ({
      ...prev,
      dateFrom: from || undefined,
      dateTo: to || undefined,
      page: 1,
    }))
  }

  const handlePageChange = (newPage: number) =>
    setFilters(prev => ({ ...prev, page: newPage }))

  // ── Action helpers ────────────────────────────────────────────────────────
  const refreshAll = () => { fetchVendors(); fetchStatusCounts() }

  const handleApproveVendor = (v: VendorProfile) => setApprovalModal({ isOpen: true, vendor: v })
  const handleApproveConfirm = async () => {
    if (!approvalModal.vendor) return
    try {
      setActionLoading(approvalModal.vendor.id)
      setApprovalModal(CLOSED_MODAL)
      await VendorService.approveVendor(approvalModal.vendor.id)
      toast({ title: 'Success', description: 'Vendor approved successfully' })
      refreshAll()
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to approve vendor', variant: 'destructive' })
    } finally { setActionLoading(null) }
  }

  const handleRejectVendor = (v: VendorProfile) => setRejectionModal({ isOpen: true, vendor: v })
  const handleRejectConfirm = async (reason: string) => {
    if (!rejectionModal.vendor) return
    try {
      setActionLoading(rejectionModal.vendor.id)
      await VendorService.rejectVendor(rejectionModal.vendor.id, reason)
      toast({ title: 'Success', description: 'Vendor rejected successfully' })
      setRejectionModal(CLOSED_MODAL)
      refreshAll()
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to reject vendor', variant: 'destructive' })
    } finally { setActionLoading(null) }
  }

  const handleSuspendVendor = (v: VendorProfile) => setSuspensionModal({ isOpen: true, vendor: v })
  const handleSuspendConfirm = async (reason: string) => {
    if (!suspensionModal.vendor) return
    try {
      setActionLoading(suspensionModal.vendor.id)
      await VendorService.suspendVendor(suspensionModal.vendor.id, reason)
      toast({ title: 'Success', description: 'Vendor suspended successfully' })
      setSuspensionModal(CLOSED_MODAL)
      refreshAll()
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to suspend vendor', variant: 'destructive' })
    } finally { setActionLoading(null) }
  }

  const handleConfirmApprovalConfirm = async () => {
    if (!confirmApprovalModal.vendor) return
    try {
      setActionLoading(confirmApprovalModal.vendor.id)
      setConfirmApprovalModal(CLOSED_MODAL)
      await VendorService.confirmApproval(confirmApprovalModal.vendor.id)
      toast({ title: 'Approval Confirmed', description: 'Vendor approved and credentials sent.' })
      refreshAll()
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to confirm approval', variant: 'destructive' })
    } finally { setActionLoading(null) }
  }

  const handleCancelApprovalConfirm = async () => {
    if (!cancelApprovalModal.vendor) return
    try {
      setActionLoading(cancelApprovalModal.vendor.id)
      setCancelApprovalModal(CLOSED_MODAL)
      await VendorService.cancelApproval(cancelApprovalModal.vendor.id)
      toast({ title: 'Approval Cancelled', description: 'Vendor restored to Pending.' })
      refreshAll()
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to cancel approval', variant: 'destructive' })
    } finally { setActionLoading(null) }
  }

  const handleConfirmRejectionConfirm = async () => {
    if (!confirmRejectionModal.vendor) return
    try {
      setActionLoading(confirmRejectionModal.vendor.id)
      setConfirmRejectionModal(CLOSED_MODAL)
      await VendorService.confirmRejection(confirmRejectionModal.vendor.id)
      toast({ title: 'Rejection Confirmed', description: 'Vendor has been rejected and notified.' })
      refreshAll()
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to confirm rejection', variant: 'destructive' })
    } finally { setActionLoading(null) }
  }

  const handleCancelRejectionConfirm = async () => {
    if (!cancelRejectionModal.vendor) return
    try {
      setActionLoading(cancelRejectionModal.vendor.id)
      setCancelRejectionModal(CLOSED_MODAL)
      await VendorService.cancelRejection(cancelRejectionModal.vendor.id)
      toast({ title: 'Rejection Cancelled', description: 'Vendor restored to Pending.' })
      refreshAll()
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to cancel rejection', variant: 'destructive' })
    } finally { setActionLoading(null) }
  }

  // ── Metric cards config ───────────────────────────────────────────────────
  const metricCards = [
    {
      key: '',
      label: 'Total Vendors',
      subtitle: 'Registered vendors',
      count: statusCounts.total,
      Icon: Building2,
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-500',
      countColor: 'text-slate-900',
      activeClass: 'border-brand-400 bg-brand-50/50',
    },
    {
      key: 'PENDING',
      label: 'Pending',
      subtitle: 'Awaiting review',
      count: statusCounts.pending,
      Icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      countColor: 'text-amber-700',
      activeClass: 'border-amber-400 bg-amber-50/60',
    },
    {
      key: 'UNDER_REVIEW',
      label: 'Under Review',
      subtitle: 'Being evaluated',
      count: statusCounts.underReview,
      Icon: Eye,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      countColor: 'text-blue-700',
      activeClass: 'border-blue-400 bg-blue-50/60',
    },
    {
      key: 'APPROVED',
      label: 'Approved',
      subtitle: 'Active vendors',
      count: statusCounts.approved,
      Icon: CheckCircle,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      countColor: 'text-emerald-700',
      activeClass: 'border-emerald-400 bg-emerald-50/60',
    },
    {
      key: 'REJECTED',
      label: 'Rejected',
      subtitle: 'Declined vendors',
      count: statusCounts.rejected,
      Icon: XCircle,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      countColor: 'text-red-700',
      activeClass: 'border-red-400 bg-red-50/60',
    },
    {
      key: 'SUSPENDED',
      label: 'Suspended',
      subtitle: 'Account suspended',
      count: statusCounts.suspended,
      Icon: AlertTriangle,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
      countColor: 'text-orange-700',
      activeClass: 'border-orange-400 bg-orange-50/60',
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── 1. Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vendors Management</h1>
        <p className="text-slate-500 mt-0.5">Manage registered vendors and their approval workflow.</p>
      </div>

      {/* ── 2. Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {metricCards.map(({ key, label, subtitle, count, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const isActive = statusFilter === key
          const pct = statusCounts.total > 0 && key !== ''
            ? Math.round((count / statusCounts.total) * 100)
            : null
          return (
            <button
              key={key}
              onClick={() => handleMetricClick(key)}
              className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${
                isActive ? activeClass : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                <span className="text-sm font-medium text-slate-500">{label}</span>
                <div className={`p-1.5 rounded-lg ${iconBg} transition-transform duration-150 group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className={`text-2xl font-bold ${countColor}`}>{count}</div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {pct !== null ? `${pct}% of total` : subtitle}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── 3. Filter Toolbar ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[160px] max-w-[260px] flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by company, GST, owner, email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none w-full transition-all bg-white text-sm"
            />
          </div>
          <div className="w-44 shrink-0">
            <Dropdown
              value={statusFilter}
              options={[
                { value: '', label: 'All Status' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'UNDER_REVIEW', label: 'Under Review' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'APPROVAL_PENDING', label: 'Approval Pending' },
                { value: 'REJECTION_PENDING', label: 'Rejection Pending' },
                { value: 'REINSPECTION', label: 'Re-Inspection' },
                { value: 'SUSPENDED', label: 'Suspended' },
              ]}
              placeholder="All Status"
              onChange={(value) => handleStatusFilter(value as string)}
            />
          </div>
          <DateRangeCalendar
            from={dateFrom}
            to={dateTo}
            onChange={handleDateChange}
            placeholder="Join Date"
          />
          {hasPermission('create_vendors') && (
            <Link href="/admin/dashboard/vendors/add" className="shrink-0 ml-auto">
              <button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors shadow-xs shadow-brand-500/10 text-sm whitespace-nowrap">
                <Plus className="h-4 w-4" />
                Add Vendor
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── 4. Vendors Table ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">

        {/* Error */}
        {error && (
          <div className="m-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No vendors found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-none">
              <Table>
                <TableHeader className="!bg-slate-50/80 [&_tr]:border-b [&_tr]:border-slate-100">
                  <TableRow className="!bg-slate-50/80 hover:!bg-slate-50/80">
                    <TableHead className="font-bold !text-brand-500/60 h-11 py-3 px-5 text-[10px] uppercase tracking-wider whitespace-nowrap">Vendor</TableHead>
                    <TableHead className="font-bold !text-brand-500/60 h-11 py-3 px-5 text-[10px] uppercase tracking-wider whitespace-nowrap">Location</TableHead>
                    <TableHead className="font-bold !text-brand-500/60 h-11 py-3 px-5 text-[10px] uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                    <TableHead className="font-bold !text-brand-500/60 h-11 py-3 px-5 text-[10px] uppercase tracking-wider whitespace-nowrap">Completion</TableHead>
                    <TableHead className="font-bold !text-brand-500/60 h-11 py-3 px-5 text-[10px] uppercase tracking-wider whitespace-nowrap">Rating</TableHead>
                    <TableHead className="font-bold !text-brand-500/60 h-11 py-3 px-5 text-[10px] uppercase tracking-wider whitespace-nowrap">Join Date</TableHead>
                    <TableHead className="font-bold !text-brand-500/60 h-11 py-3 px-5 text-[10px] uppercase tracking-wider whitespace-nowrap text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow
                      key={vendor.id}
                      className="hover:bg-slate-50/60 transition-colors duration-150 border-b border-slate-100 last:border-0"
                    >
                      {/* Vendor */}
                      <TableCell className="py-4 px-5">
                        <div className="flex flex-col gap-0.5 min-w-[160px]">
                          <div className="font-semibold text-slate-900 leading-snug">{vendor.companyName}</div>
                          {(vendor as any).gstNumber ? (
                            <div className="text-xs text-slate-500 font-mono">GST: {(vendor as any).gstNumber}</div>
                          ) : (
                            <div className="text-xs text-slate-400 italic">Unregistered</div>
                          )}
                          <div className="text-xs text-slate-400">{vendor.email}</div>
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell className="py-4 px-5 text-sm text-slate-600 whitespace-nowrap">
                        {getLocationString(vendor)}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4 px-5">
                        <div className="flex flex-col gap-1.5">
                          {getStatusBadge(vendor.status)}
                          {getInspectionBadge(vendor.status, vendor.latestInspection)}
                          {vendor.status === 'APPROVAL_PENDING' && vendor.approvalRequestedByName && (
                            <p className="text-xs text-cyan-600">by {vendor.approvalRequestedByName}</p>
                          )}
                          {vendor.status === 'REJECTION_PENDING' && vendor.rejectionRequestedByName && (
                            <p className="text-xs text-orange-600">by {vendor.rejectionRequestedByName}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Completion */}
                      <TableCell className="py-4 px-5">
                        {(() => {
                          const pct = vendor.completionPercentage ?? 0
                          const gradient = pct === 100
                            ? 'from-emerald-500 to-emerald-400'
                            : pct >= 50 ? 'from-blue-500 to-blue-400' : 'from-orange-500 to-amber-400'
                          const textColor = pct === 100
                            ? 'text-emerald-600'
                            : pct >= 50 ? 'text-blue-600' : 'text-orange-500'
                          return (
                            <div className="flex items-center gap-2.5 min-w-[90px]">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-linear-to-r ${gradient} transition-[width] duration-500`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold tabular-nums shrink-0 ${textColor}`}>{pct}%</span>
                            </div>
                          )
                        })()}
                      </TableCell>

                      {/* Rating */}
                      <TableCell className="py-4 px-5">
                        {hasRating(vendor) ? (
                          <div
                            className="flex items-center gap-1"
                            title={`Based on ${vendor.ratingCount} admin review${(vendor.ratingCount ?? 0) === 1 ? '' : 's'}`}
                          >
                            <span className="text-yellow-400 text-sm">★</span>
                            <span className="text-sm font-semibold text-slate-800">{vendor.rating?.toFixed(1)}</span>
                            <span className="text-xs text-slate-400">({vendor.ratingCount})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No reviews yet</span>
                        )}
                      </TableCell>

                      {/* Join Date */}
                      <TableCell className="py-4 px-5 text-sm text-slate-600 whitespace-nowrap">
                        {formatDate(vendor.createdAt)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-4 px-5">
                        <div className="flex items-center justify-end gap-1">
                          {hasPermission('view_vendors') && (
                            <Link href={`/admin/dashboard/vendors/view/${vendor.id}`}>
                              <button
                                title="View Details"
                                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                          )}
                          {hasPermission('edit_vendors') && (
                            <Link href={`/admin/dashboard/vendors/edit/${vendor.id}`}>
                              <button
                                title="Edit Vendor"
                                className="p-2 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </Link>
                          )}
                          {(vendor.status === 'PENDING' || vendor.status === 'UNDER_REVIEW') && hasPermission('edit_vendors') && (
                            <>
                              <button
                                title="Approve Vendor"
                                onClick={() => handleApproveVendor(vendor)}
                                disabled={actionLoading === vendor.id}
                                className="p-2 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === vendor.id
                                  ? <LoadingSpinner size="sm" />
                                  : <CheckCircle className="h-4 w-4" />}
                              </button>
                              <button
                                title="Reject Vendor"
                                onClick={() => handleRejectVendor(vendor)}
                                disabled={actionLoading === vendor.id}
                                className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {vendor.status === 'APPROVED' && hasPermission('edit_vendors') && (
                            <button
                              title="Suspend Vendor"
                              onClick={() => handleSuspendVendor(vendor)}
                              disabled={actionLoading === vendor.id}
                              className="p-2 rounded-lg text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {vendor.status === 'APPROVAL_PENDING' && (
                            <>
                              <button
                                title="Confirm Approval"
                                onClick={() => setConfirmApprovalModal({ isOpen: true, vendor })}
                                disabled={actionLoading === vendor.id}
                                className="p-2 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                title="Cancel Approval — Restore to Pending"
                                onClick={() => setCancelApprovalModal({ isOpen: true, vendor })}
                                disabled={actionLoading === vendor.id}
                                className="p-2 rounded-lg text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-50"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {vendor.status === 'REJECTION_PENDING' && (
                            <>
                              <button
                                title="Confirm Rejection"
                                onClick={() => setConfirmRejectionModal({ isOpen: true, vendor })}
                                disabled={actionLoading === vendor.id}
                                className="p-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                title="Cancel Rejection — Restore to Pending"
                                onClick={() => setCancelRejectionModal({ isOpen: true, vendor })}
                                disabled={actionLoading === vendor.id}
                                className="p-2 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-slate-100">
                <span className="text-xs text-slate-400 hidden sm:block">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {getPageRange(pagination.page, pagination.pages).map((p, i) =>
                    p === '…' ? (
                      <span key={`e-${i}`} className="px-2 text-slate-400 text-sm">…</span>
                    ) : (
                      <button
                        key={`p-${p}`}
                        onClick={() => handlePageChange(p as number)}
                        aria-current={p === pagination.page ? 'page' : undefined}
                        className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                          p === pagination.page
                            ? 'bg-brand-500 text-white shadow-xs shadow-brand-500/20'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
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

      {/* ══════════════════ Modals ══════════════════ */}

      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={() => setRejectionModal(CLOSED_MODAL)}
        onConfirm={handleRejectConfirm}
        vendor={rejectionModal.vendor ? {
          id: rejectionModal.vendor.id,
          companyName: rejectionModal.vendor.companyName,
          ownerName: rejectionModal.vendor.ownerName,
          email: rejectionModal.vendor.email,
        } : null}
        isLoading={actionLoading === rejectionModal.vendor?.id}
      />

      <SuspensionModal
        isOpen={suspensionModal.isOpen}
        onClose={() => setSuspensionModal(CLOSED_MODAL)}
        onConfirm={handleSuspendConfirm}
        vendor={suspensionModal.vendor ? {
          id: suspensionModal.vendor.id,
          companyName: suspensionModal.vendor.companyName,
          ownerName: suspensionModal.vendor.ownerName,
          email: suspensionModal.vendor.email,
          status: suspensionModal.vendor.status,
        } : null}
        isLoading={actionLoading === suspensionModal.vendor?.id}
      />

      <DeleteConfirmModal
        show={approvalModal.isOpen}
        variant="confirm"
        title="Confirm Vendor Approval"
        subtitle="Once approved, the vendor will be able to access the platform and proceed with the next steps."
        itemName={approvalModal.vendor?.companyName}
        itemDetail={approvalModal.vendor?.ownerName}
        confirmLabel="Approve"
        loadingLabel="Approving..."
        loading={actionLoading === approvalModal.vendor?.id}
        onConfirm={handleApproveConfirm}
        onCancel={() => setApprovalModal(CLOSED_MODAL)}
      />

      <DeleteConfirmModal
        show={confirmApprovalModal.isOpen}
        variant="confirm"
        title="Confirm Approval"
        subtitle="Credentials will be sent to the vendor upon confirmation."
        itemName={confirmApprovalModal.vendor?.companyName}
        itemDetail={confirmApprovalModal.vendor?.ownerName}
        confirmLabel="Confirm Approval"
        loadingLabel="Processing..."
        loading={actionLoading === confirmApprovalModal.vendor?.id}
        onConfirm={handleConfirmApprovalConfirm}
        onCancel={() => setConfirmApprovalModal(CLOSED_MODAL)}
      />

      <DeleteConfirmModal
        show={cancelApprovalModal.isOpen}
        variant="warning"
        title="Cancel Approval"
        subtitle="The vendor will be restored to Pending status."
        itemName={cancelApprovalModal.vendor?.companyName}
        itemDetail={cancelApprovalModal.vendor?.ownerName}
        confirmLabel="Cancel Approval"
        loadingLabel="Processing..."
        loading={actionLoading === cancelApprovalModal.vendor?.id}
        onConfirm={handleCancelApprovalConfirm}
        onCancel={() => setCancelApprovalModal(CLOSED_MODAL)}
      />

      <DeleteConfirmModal
        show={confirmRejectionModal.isOpen}
        variant="danger"
        title="Confirm Rejection"
        subtitle="A rejection email will be sent to the vendor."
        itemName={confirmRejectionModal.vendor?.companyName}
        itemDetail={confirmRejectionModal.vendor?.ownerName}
        confirmLabel="Confirm Rejection"
        loadingLabel="Processing..."
        loading={actionLoading === confirmRejectionModal.vendor?.id}
        onConfirm={handleConfirmRejectionConfirm}
        onCancel={() => setConfirmRejectionModal(CLOSED_MODAL)}
      />

      <DeleteConfirmModal
        show={cancelRejectionModal.isOpen}
        variant="confirm"
        title="Cancel Rejection"
        subtitle="The vendor will be restored to Pending status."
        itemName={cancelRejectionModal.vendor?.companyName}
        itemDetail={cancelRejectionModal.vendor?.ownerName}
        confirmLabel="Cancel Rejection"
        loadingLabel="Processing..."
        loading={actionLoading === cancelRejectionModal.vendor?.id}
        onConfirm={handleCancelRejectionConfirm}
        onCancel={() => setCancelRejectionModal(CLOSED_MODAL)}
      />
    </div>
  )
}
