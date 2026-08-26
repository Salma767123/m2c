'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/UI/Badge'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import DateRangeCalendar from '@/components/Shared/DateRangeCalendar'
import ApproveProductModal, { type ApprovableProduct } from './ApproveProductModal'
import ProductRejectionModal from './ProductRejectionModal'
import PriceNegotiationModal from './PriceNegotiationModal'
import Pagination from '@/components/UI/Pagination'
import {
  Eye, Check, X, Search, Package, UserPlus, UserCog, CheckCircle,
  Clock, ShoppingBag, AlertTriangle, XCircle, Handshake,
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import { adminProductService } from '@/services/adminProductService'
import { hasPermission } from '@/lib/auth'

interface VendorProductRequest {
  id: string
  name: string
  description: string
  category: string
  subCategory?: string
  basePrice: number
  originalPrice?: number
  totalStock: number
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'
  approvalStatus: 'PENDING' | 'QC_SUBMITTED' | 'QC_APPROVED' | 'APPROVED' | 'REJECTED' | 'REINSPECTION' | 'NEGOTIATION'
  approvedAt?: string
  rejectionReason?: string
  // Negotiation economics — set the moment a negotiation is opened/agreed and
  // never cleared, so they double as a "this product had a negotiation" flag
  // that survives final approval/rejection.
  agreedPrice?: number | null
  basePriceOriginal?: number | null
  createdAt: string
  vendor: {
    id: string
    companyName: string
    ownerName: string
    businessEmail: string
  }
  assignedQcId?: string | null
  assignedQc?: {
    id: string
    checkerId?: string
    name?: string
    email?: string
    status?: string
  } | null
  // Booked QC window for this product (mirrors factory inspection scheduling). Used to
  // flag a MISSED/expired assignment in the admin list.
  qcAssignment?: {
    scheduledDate?: string | null
    scheduledTime?: string | null
    estimatedDuration?: string | null
    priority?: string | null
    clientName?: string | null
  } | null
  images?: Array<{ url: string; isPrimary: boolean }>
  variants?: Array<{
    id: string
    variantName?: string
    size: string
    color: string
    colorHex?: string
    price: number
    originalPrice?: number
    stock: number
  }>
  fabricType?: string
  material?: string
  baseSku: string
}

interface StatusCounts {
  total: number
  pending: number
  qcSubmitted: number
  qcApproved: number
  approved: number
  rejected: number
  reinspection: number
}

// True once a product QC assignment's booked window (scheduledDate + scheduledTime +
// estimatedDuration) has fully elapsed. Mirrors backend utils/inspectionSchedule and
// the factory list's isPastInspectionWindow — computed client-side because product
// inspections have no stored EXPIRED status.
function isPastInspectionWindow(
  scheduledDate?: string | null,
  scheduledTime?: string | null,
  estimatedDuration?: string | null,
): boolean {
  if (!scheduledDate) return false
  const [y, m, d] = scheduledDate.split('-').map((n) => parseInt(n, 10))
  if (!y || !m || !d) return false
  let hours = 0, minutes = 0
  const match = (scheduledTime || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (match) {
    hours = parseInt(match[1], 10)
    minutes = parseInt(match[2], 10)
    const mer = match[3]?.toUpperCase()
    if (mer === 'PM' && hours < 12) hours += 12
    if (mer === 'AM' && hours === 12) hours = 0
  }
  const start = new Date(y, m - 1, d, hours, minutes, 0, 0)
  const durStr = (estimatedDuration || '1 hour').toLowerCase()
  const durNum = parseFloat(durStr) || 1
  const durMs = durStr.includes('min') ? durNum * 60000 : durStr.includes('day') ? durNum * 86400000 : durNum * 3600000
  return Date.now() > start.getTime() + durMs
}

// A product inspection is "missed" when it is assigned + scheduled, the checker has NOT
// yet submitted (still PENDING/REINSPECTION), and the booked window has passed.
function isProductInspectionMissed(request: VendorProductRequest): boolean {
  if (!request.assignedQcId) return false
  if (request.approvalStatus !== 'PENDING' && request.approvalStatus !== 'REINSPECTION') return false
  const a = request.qcAssignment
  if (!a?.scheduledDate) return false
  return isPastInspectionWindow(a.scheduledDate, a.scheduledTime, a.estimatedDuration)
}

const getApprovalStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold">Pending QC</Badge>
    case 'QC_SUBMITTED':
      return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold">Pending Admin Review</Badge>
    case 'QC_APPROVED':
      return <Badge className="bg-green-50 text-green-700 border border-green-200 font-bold">QC Approved</Badge>
    case 'APPROVED':
      return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">Approved</Badge>
    case 'REJECTED':
      return <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold">Rejected</Badge>
    case 'REINSPECTION':
      return <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-bold">Re-Inspection</Badge>
    case 'NEGOTIATION':
      return <Badge className="bg-purple-50 text-purple-700 border border-purple-200 font-bold">Under Negotiation</Badge>
    default:
      return <Badge className="bg-slate-100 text-slate-600 border border-slate-200 font-bold">{status}</Badge>
  }
}

// A negotiation was raised on this product if either economics field is set —
// both persist after final approval/rejection, so we can still surface the
// (now read-only) history.
const hasNegotiationHistory = (r: { agreedPrice?: number | null; basePriceOriginal?: number | null }) =>
  r.agreedPrice != null || r.basePriceOriginal != null

export default function VendorProductRequests() {
  const router = useRouter()

  // ── Data state ────────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<VendorProductRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    total: 0, pending: 0, qcSubmitted: 0, qcApproved: 0, approved: 0, rejected: 0, reinspection: 0,
  })
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0, limit: 10 })

  // ── Filter state ──────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null)
  const [rejectLoading, setRejectLoading] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvingRequest, setApprovingRequest] = useState<VendorProductRequest | null>(null)
  // Product currently open in the price-negotiation modal.
  const [negotiateFor, setNegotiateFor] = useState<{ id: string; name: string } | null>(null)


  // ── Data loading ──────────────────────────────────────────────────────────
  const loadRequests = useCallback(async (page: number) => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page, limit: pagination.limit }
      if (statusFilter !== 'all') params.approvalStatus = statusFilter
      if (searchTerm.trim()) params.search = searchTerm.trim()
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo

      const response = await adminProductService.getAllProducts(params)
      if (response.success) {
        setRequests(response.data.products)
        setPagination(prev => ({
          ...prev,
          totalPages: response.data.pagination.totalPages,
          totalCount: response.data.pagination.totalCount,
        }))
      }
    } catch (error: any) {
      showErrorToast('Load Failed', error.message || 'Unable to load product requests')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchTerm, dateFrom, dateTo, pagination.limit])

  const loadStatusCounts = useCallback(async () => {
    try {
      const [all, pending, qcSubmitted, qcApproved, approved, rejected, reinspection] = await Promise.all([
        adminProductService.getAllProducts({ page: 1, limit: 1 }),
        adminProductService.getAllProducts({ page: 1, limit: 1, approvalStatus: 'PENDING' }),
        adminProductService.getAllProducts({ page: 1, limit: 1, approvalStatus: 'QC_SUBMITTED' }),
        adminProductService.getAllProducts({ page: 1, limit: 1, approvalStatus: 'QC_APPROVED' }),
        adminProductService.getAllProducts({ page: 1, limit: 1, approvalStatus: 'APPROVED' }),
        adminProductService.getAllProducts({ page: 1, limit: 1, approvalStatus: 'REJECTED' }),
        adminProductService.getAllProducts({ page: 1, limit: 1, approvalStatus: 'REINSPECTION' }),
      ])
      setStatusCounts({
        total: all.data?.pagination?.totalCount ?? 0,
        pending: pending.data?.pagination?.totalCount ?? 0,
        qcSubmitted: qcSubmitted.data?.pagination?.totalCount ?? 0,
        qcApproved: qcApproved.data?.pagination?.totalCount ?? 0,
        approved: approved.data?.pagination?.totalCount ?? 0,
        rejected: rejected.data?.pagination?.totalCount ?? 0,
        reinspection: reinspection.data?.pagination?.totalCount ?? 0,
      })
    } catch { /* counts are informational */ }
  }, [])

  useEffect(() => { loadStatusCounts() }, [loadStatusCounts])
  useEffect(() => { loadRequests(pagination.currentPage) }, [pagination.currentPage, loadRequests])

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }
  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from); setDateTo(to)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }
  const handleSearchSubmit = () => setPagination(prev => ({ ...prev, currentPage: 1 }))
  const handleClearFilters = () => {
    setStatusFilter('all'); setSearchTerm(''); setDateFrom(''); setDateTo('')
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  // ── Action handlers (business logic preserved) ────────────────────────────
  const handleApproveClick = (requestId: string) => {
    const request = requests.find(r => r.id === requestId)
    if (!request) return
    // The shared ApproveProductModal initialises its own pricing state.
    setApprovingRequest(request)
    setShowApprovalModal(true)
  }

  const handleRejectClick = (requestId: string) => { setRejectingRequestId(requestId); setShowRejectionModal(true) }

  const handleReject = async (reason: string) => {
    if (!rejectingRequestId) return
    setRejectLoading(true)
    try {
      const response = await adminProductService.rejectProduct(rejectingRequestId, reason.trim())
      if (response.success) {
        showSuccessToast('Product Rejected', 'The vendor has been notified of the rejection.')
        setShowRejectionModal(false); setRejectingRequestId(null)
        loadRequests(pagination.currentPage); loadStatusCounts()
      }
    } catch (error: any) {
      showErrorToast('Rejection Failed', error.message || 'Unable to reject product.')
    } finally {
      setRejectLoading(false)
    }
  }

  // Open the full assignment page (mirrors the factory "Create QC Assignment" page)
  // instead of the compact modal, so the admin can also set client/date/time/priority/
  // duration for the product inspection.
  const handleAssignClick = (requestId: string) => {
    router.push(`/admin/dashboard/products/vendor-requests/assign/${requestId}`)
  }

  const handleViewDetails = (request: VendorProductRequest) => {
    const slug = request.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    router.push(`/admin/dashboard/products/vendor-requests/view/${slug}--${request.id}`)
  }

  // ── Metric cards ──────────────────────────────────────────────────────────
  const metricCards = [
    { key: 'all',         label: 'All Requests',   subtitle: 'Total submissions',     count: statusCounts.total,       Icon: ShoppingBag,    iconBg: 'bg-brand-50',    iconColor: 'text-brand-500',   countColor: 'text-slate-900',  activeClass: 'border-brand-400 bg-brand-50/50' },
    { key: 'PENDING',     label: 'Pending QC',     subtitle: 'Awaiting inspection',   count: statusCounts.pending,     Icon: Clock,          iconBg: 'bg-amber-50',    iconColor: 'text-amber-500',   countColor: 'text-amber-700',  activeClass: 'border-amber-400 bg-amber-50/60' },
    { key: 'QC_SUBMITTED',label: 'Pending Review', subtitle: 'Awaiting your decision',count: statusCounts.qcSubmitted, Icon: Clock,          iconBg: 'bg-blue-50',     iconColor: 'text-blue-500',    countColor: 'text-blue-700',   activeClass: 'border-blue-400 bg-blue-50/60' },
    { key: 'APPROVED',    label: 'Approved',        subtitle: 'Live on platform',      count: statusCounts.approved,    Icon: Package,        iconBg: 'bg-emerald-50',  iconColor: 'text-emerald-500', countColor: 'text-emerald-700', activeClass: 'border-emerald-400 bg-emerald-50/60' },
    { key: 'REJECTED',    label: 'Rejected',        subtitle: 'Declined requests',     count: statusCounts.rejected,    Icon: XCircle,        iconBg: 'bg-red-50',      iconColor: 'text-red-500',     countColor: 'text-red-700',    activeClass: 'border-red-400 bg-red-50/60' },
    { key: 'REINSPECTION',label: 'Re-Inspection',  subtitle: 'Needs re-review',       count: statusCounts.reinspection,Icon: AlertTriangle,  iconBg: 'bg-orange-50',   iconColor: 'text-orange-500',  countColor: 'text-orange-700', activeClass: 'border-orange-400 bg-orange-50/60' },
  ]

  const hasActiveFilters = statusFilter !== 'all' || searchTerm || dateFrom || dateTo

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="space-y-4 mt-4">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Vendor Product Requests</h1>
            <p className="text-sm text-slate-500">Review and manage product submissions from vendors.</p>
          </div>
        </div>

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {metricCards.map(({ key, label, subtitle, count, Icon, iconBg, iconColor, countColor, activeClass }) => {
            const isActive = statusFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleStatusFilter(key)}
                className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${isActive ? activeClass : 'border-slate-200/80 hover:border-slate-300'}`}
              >
                <div className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                  <span className="text-sm font-medium text-slate-500">{label}</span>
                  <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace('50', '100') : iconBg} transition-transform duration-150 group-hover:scale-110`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <div className={`text-2xl font-bold ${countColor}`}>{count}</div>
                  <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Filter Toolbar ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by product name, vendor, or SKU…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none w-full transition-all bg-white text-sm"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <DateRangeCalendar from={dateFrom} to={dateTo} onChange={handleDateChange} placeholder="Submit Date" />
              <div className="w-44">
                <Dropdown
                  value={statusFilter}
                  options={[
                    { value: 'all',          label: 'All Statuses' },
                    { value: 'PENDING',      label: 'Pending QC' },
                    { value: 'QC_SUBMITTED', label: 'Pending Admin Review' },
                    { value: 'QC_APPROVED',  label: 'QC Approved' },
                    { value: 'NEGOTIATION',  label: 'Under Negotiation' },
                    { value: 'APPROVED',     label: 'Approved' },
                    { value: 'REJECTED',     label: 'Rejected' },
                    { value: 'REINSPECTION', label: 'Re-Inspection' },
                  ]}
                  onChange={(value) => handleStatusFilter(value as string)}
                  placeholder="All Statuses"
                />
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 px-3 py-2 rounded-xl"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No product requests found</p>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <>
              <Table className="table-fixed">
                <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50">
                  <TableRow className="!bg-brand-500/[0.06] hover:!bg-brand-500/[0.06]">
                    <TableHead className="w-[16%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Product</TableHead>
                    <TableHead className="w-[11%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">SKU</TableHead>
                    <TableHead className="w-[11%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Category</TableHead>
                    <TableHead className="w-[9%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Variants</TableHead>
                    <TableHead className="w-[16%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Vendor</TableHead>
                    <TableHead className="w-[11%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">QC Checker</TableHead>
                    <TableHead className="w-[10%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider whitespace-nowrap">Insp. Status</TableHead>
                    <TableHead className="w-[9%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider whitespace-nowrap">Submitted</TableHead>
                    <TableHead className="w-[7%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const missed = isProductInspectionMissed(request)
                    return (
                    <TableRow
                      key={request.id}
                      className={`transition-colors duration-150 border-b last:border-0 ${
                        missed
                          ? 'bg-red-50/60 hover:bg-red-50 border-red-100'
                          : 'hover:bg-slate-50/60 border-slate-100'
                      }`}
                    >
                      {/* Product: image + name + SKU below */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                            {request.images?.[0]?.url ? (
                              <img src={request.images[0].url} alt={request.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">{request.name}</div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">{request.baseSku}</div>
                          </div>
                        </div>
                      </TableCell>

                      {/* SKU */}
                      <TableCell className="py-3 px-3 align-middle">
                        <span className="text-xs font-mono text-slate-500 break-all">{request.baseSku}</span>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div className="text-sm text-slate-700">{request.category}</div>
                      </TableCell>

                      {/* Variants */}
                      <TableCell className="py-3 px-3 align-middle">
                        {request.variants && request.variants.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                            {request.variants.length} {request.variants.length === 1 ? 'Variant' : 'Variants'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>

                      {/* Vendor */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div className="font-semibold text-slate-900 text-sm leading-snug">{request.vendor.companyName}</div>
                        <div className="text-xs text-slate-500">{request.vendor.ownerName}</div>
                      </TableCell>

                      {/* QC Checker */}
                      <TableCell className="py-3 px-3 align-middle">
                        {request.assignedQc?.name ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="text-sm font-medium text-slate-900 truncate">{request.assignedQc.name}</span>
                          </div>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border border-slate-200 text-xs">Unassigned</Badge>
                        )}
                      </TableCell>

                      {/* Inspection Status */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div className="flex flex-col items-start gap-1">
                          {getApprovalStatusBadge(request.approvalStatus)}
                          {missed && (
                            <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold">Expired · Missed</Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Submitted */}
                      <TableCell className="py-3 px-3 align-middle">
                        <span className="text-xs text-slate-500 whitespace-nowrap">{new Date(request.createdAt).toLocaleDateString()}</span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          {hasPermission('vendor_product_requests:view') && (
                            <button
                              title="View Details"
                              onClick={() => handleViewDetails(request)}
                              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {/* Negotiation access — persists after approval/rejection.
                              While QC-approved / under negotiation it's the live
                              "Review & Negotiate" action; once finalised it stays as a
                              read-only "View Negotiation History" so nothing is hidden. */}
                          {(() => {
                            const canNegotiate = (request.approvalStatus === 'QC_SUBMITTED' || request.approvalStatus === 'QC_APPROVED' || request.approvalStatus === 'NEGOTIATION') && hasPermission('vendor_product_requests:approve')
                            const canViewHistory = (request.approvalStatus === 'APPROVED' || request.approvalStatus === 'REJECTED') && hasNegotiationHistory(request) && hasPermission('vendor_product_requests:view')
                            if (!canNegotiate && !canViewHistory) return null
                            return (
                              <button
                                title={canNegotiate ? 'Review & Negotiate Price' : 'View Negotiation History'}
                                onClick={() => setNegotiateFor({ id: request.id, name: request.name })}
                                className="p-2 rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                              >
                                <Handshake className="h-4 w-4" />
                              </button>
                            )
                          })()}
                          {(request.approvalStatus === 'PENDING' || request.approvalStatus === 'QC_SUBMITTED' || request.approvalStatus === 'QC_APPROVED' || request.approvalStatus === 'REINSPECTION' || request.approvalStatus === 'NEGOTIATION') && (
                            <>
                              {(request.approvalStatus === 'QC_SUBMITTED' || request.approvalStatus === 'QC_APPROVED' || request.approvalStatus === 'NEGOTIATION') && hasPermission('vendor_product_requests:approve') && (
                                <button
                                  title="Final Approve & Set Price"
                                  onClick={() => handleApproveClick(request.id)}
                                  className="p-2 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              {hasPermission('vendor_product_requests:approve') && (
                                <button
                                  title="Reject"
                                  onClick={() => handleRejectClick(request.id)}
                                  className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                              {(request.approvalStatus === 'PENDING' || request.approvalStatus === 'REINSPECTION') && hasPermission('vendor_product_requests:assign_qc') && (
                                request.assignedQcId ? (
                                  <button
                                    title={missed ? 'Inspection window missed — reassign with a new date/time' : 'Reassign QC Checker'}
                                    onClick={() => handleAssignClick(request.id)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      missed
                                        ? 'text-red-600 hover:text-red-700 hover:bg-red-50 ring-1 ring-red-200'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                  >
                                    <UserCog className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    title="Assign QC Checker"
                                    onClick={() => handleAssignClick(request.id)}
                                    className="p-2 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <Pagination
                page={pagination.currentPage}
                totalPages={pagination.totalPages}
                onChange={(p) => setPagination(prev => ({ ...prev, currentPage: p }))}
              />
            </>
          )}
        </div>

      </div>

      {/* ══ Price Negotiation Modal ═════════════════════════════════════════ */}
      {negotiateFor && (
        <PriceNegotiationModal
          productId={negotiateFor.id}
          productName={negotiateFor.name}
          onClose={() => setNegotiateFor(null)}
          onChanged={() => { loadRequests(pagination.currentPage); loadStatusCounts() }}
        />
      )}

      {/* ══ Approval Modal ══════════════════════════════════════════════════ */}
      <ApproveProductModal
        product={approvingRequest as unknown as ApprovableProduct}
        open={showApprovalModal}
        onClose={() => { setShowApprovalModal(false); setApprovingRequest(null) }}
        onApproved={() => { loadRequests(pagination.currentPage); loadStatusCounts() }}
      />


      {/* ══ Rejection Modal — shared product-rejection wizard ════════════════ */}
      {(() => {
        const rejectingRequest = requests.find(r => r.id === rejectingRequestId)
        return (
          <ProductRejectionModal
            isOpen={showRejectionModal}
            onClose={() => { setShowRejectionModal(false); setRejectingRequestId(null) }}
            onConfirm={handleReject}
            isLoading={rejectLoading}
            product={rejectingRequest ? {
              id: rejectingRequest.id,
              name: rejectingRequest.name,
              sku: rejectingRequest.baseSku,
              vendorName: rejectingRequest.vendor?.companyName,
            } : null}
          />
        )
      })()}

      {/* ══ Assign QC Checker Modal ══════════════════════════════════════════ */}
    </div>
  )
}
