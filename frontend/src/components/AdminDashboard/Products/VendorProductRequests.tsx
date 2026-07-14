'use client'

import { useState, useEffect, useCallback } from 'react'
import { convertINRtoUSD } from '@/lib/currency'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/UI/Badge'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import DateRangeCalendar from '@/components/Shared/DateRangeCalendar'
import { Breadcrumb } from '../Breadcrumb/Breadcrumb'
import {
  Eye, Check, X, Search, Package, UserPlus, UserCog, CheckCircle,
  ChevronLeft, ChevronRight, Clock, ShoppingBag, AlertTriangle, XCircle,
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import { adminProductService } from '@/services/adminProductService'
import qcCheckerService from '@/services/qcCheckerService'
import { hasPermission } from '@/lib/auth'
import { formatCheckerName } from '@/lib/checkerUtils'

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
  approvalStatus: 'PENDING' | 'QC_APPROVED' | 'APPROVED' | 'REJECTED' | 'REINSPECTION'
  approvedAt?: string
  rejectionReason?: string
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
  images?: Array<{ url: string; isPrimary: boolean }>
  variants?: Array<{
    id: string
    size: string
    color: string
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
  qcApproved: number
  approved: number
  rejected: number
  reinspection: number
}

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

const getApprovalStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold">Pending QC</Badge>
    case 'QC_APPROVED':
      return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold">QC Approved</Badge>
    case 'APPROVED':
      return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">Approved</Badge>
    case 'REJECTED':
      return <Badge className="bg-red-50 text-red-700 border border-red-200 font-bold">Rejected</Badge>
    case 'REINSPECTION':
      return <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-bold">Re-Inspection</Badge>
    default:
      return <Badge className="bg-slate-100 text-slate-600 border border-slate-200 font-bold">{status}</Badge>
  }
}

export default function VendorProductRequests() {
  const router = useRouter()

  // ── Data state ────────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<VendorProductRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [qcCheckers, setQcCheckers] = useState<{ id: string; name: string }[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    total: 0, pending: 0, qcApproved: 0, approved: 0, rejected: 0, reinspection: 0,
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
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null)
  const [selectedQcChecker, setSelectedQcChecker] = useState<string>('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvingRequest, setApprovingRequest] = useState<VendorProductRequest | null>(null)

  // Approval pricing state
  const [adminPrice, setAdminPrice] = useState<string>('')
  const [originalPrice, setOriginalPrice] = useState<string>('')
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({})
  const [variantOriginalPrices, setVariantOriginalPrices] = useState<Record<string, string>>({})
  const [priceINR, setPriceINR] = useState('')
  const [priceUSD, setPriceUSD] = useState('')
  const [originalPriceINR, setOriginalPriceINR] = useState('')
  const [originalPriceUSD, setOriginalPriceUSD] = useState('')
  const [priceVisibility, setPriceVisibility] = useState<'IN_ONLY' | 'COM_ONLY' | 'BOTH'>('BOTH')
  const [variantPricesINR, setVariantPricesINR] = useState<Record<string, string>>({})
  const [variantPricesUSD, setVariantPricesUSD] = useState<Record<string, string>>({})
  const [variantOriginalPricesINR, setVariantOriginalPricesINR] = useState<Record<string, string>>({})
  const [variantOriginalPricesUSD, setVariantOriginalPricesUSD] = useState<Record<string, string>>({})
  const [variantVisibilities, setVariantVisibilities] = useState<Record<string, string>>({})

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
      const [all, pending, qcApproved, approved, rejected, reinspection] = await Promise.all([
        adminProductService.getAllProducts({ page: 1, limit: 1 }),
        adminProductService.getAllProducts({ page: 1, limit: 1, approvalStatus: 'PENDING' }),
        adminProductService.getAllProducts({ page: 1, limit: 1, approvalStatus: 'QC_APPROVED' }),
        adminProductService.getAllProducts({ page: 1, limit: 1, approvalStatus: 'APPROVED' }),
        adminProductService.getAllProducts({ page: 1, limit: 1, approvalStatus: 'REJECTED' }),
        adminProductService.getAllProducts({ page: 1, limit: 1, approvalStatus: 'REINSPECTION' }),
      ])
      setStatusCounts({
        total: all.data?.pagination?.totalCount ?? 0,
        pending: pending.data?.pagination?.totalCount ?? 0,
        qcApproved: qcApproved.data?.pagination?.totalCount ?? 0,
        approved: approved.data?.pagination?.totalCount ?? 0,
        rejected: rejected.data?.pagination?.totalCount ?? 0,
        reinspection: reinspection.data?.pagination?.totalCount ?? 0,
      })
    } catch { /* counts are informational */ }
  }, [])

  const loadQcCheckers = useCallback(async () => {
    try {
      const response = await qcCheckerService.getAllQCCheckers({ status: 'ACTIVE' })
      if (response.success && response.data) setQcCheckers(response.data)
    } catch (error) {
      console.error('Error fetching QC checkers:', error)
    }
  }, [])

  useEffect(() => { loadQcCheckers(); loadStatusCounts() }, [loadQcCheckers, loadStatusCounts])
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
    setApprovingRequest(request)
    setAdminPrice(request.basePrice.toString())
    setOriginalPrice(request.originalPrice?.toString() || '')
    if (request.variants && request.variants.length > 0) {
      const initialPrices: Record<string, string> = {}
      const initialOriginalPrices: Record<string, string> = {}
      request.variants.forEach(v => {
        initialPrices[v.id] = v.price.toString()
        initialOriginalPrices[v.id] = v.originalPrice?.toString() || ''
      })
      setVariantPrices(initialPrices)
      setVariantOriginalPrices(initialOriginalPrices)
    } else {
      setVariantPrices({}); setVariantOriginalPrices({})
    }
    setShowApprovalModal(true)
  }

  const handleApproveSubmit = async () => {
    if (!approvingRequest) return
    const hasVariants = approvingRequest.variants && approvingRequest.variants.length > 0
    if (!adminPrice || parseFloat(adminPrice) <= 0) {
      showErrorToast('Invalid Price', 'Please enter a valid admin selling price'); return
    }
    if (!originalPrice || parseFloat(originalPrice) <= 0) {
      showErrorToast('Invalid Price', 'Please enter a valid original price'); return
    }
    if (parseFloat(originalPrice) <= parseFloat(adminPrice)) {
      showErrorToast('Invalid Price', 'Original price must be greater than selling price'); return
    }
    if (hasVariants) {
      const invalidVariants = approvingRequest.variants!.filter(v => !variantPrices[v.id] || parseFloat(variantPrices[v.id]) <= 0)
      if (invalidVariants.length > 0) { showErrorToast('Invalid Prices', 'Please enter valid admin prices for all variants'); return }
      const invalidOriginalPrices = approvingRequest.variants!.filter(v => !variantOriginalPrices[v.id] || parseFloat(variantOriginalPrices[v.id]) <= 0)
      if (invalidOriginalPrices.length > 0) { showErrorToast('Invalid Prices', 'Please enter valid original prices for all variants'); return }
      const invalidDiscounts = approvingRequest.variants!.filter(v => parseFloat(variantOriginalPrices[v.id]) <= parseFloat(variantPrices[v.id]))
      if (invalidDiscounts.length > 0) { showErrorToast('Invalid Prices', 'Original price must be greater than admin price for all variants'); return }
    }
    try {
      const toNumMap = (m: Record<string, string>) =>
        Object.fromEntries(Object.entries(m).filter(([, v]) => v).map(([id, v]) => [id, parseFloat(v)]))
      const variantPricesNum = hasVariants ? Object.fromEntries(Object.entries(variantPrices).map(([id, price]) => [id, parseFloat(price)])) : undefined
      const variantOriginalPricesNum = hasVariants ? Object.fromEntries(Object.entries(variantOriginalPrices).filter(([, price]) => price && parseFloat(price) > 0).map(([id, price]) => [id, parseFloat(price)])) : undefined
      const multiCurrency = {
        priceINR: priceINR ? parseFloat(priceINR) : undefined,
        priceUSD: priceUSD ? parseFloat(priceUSD) : undefined,
        originalPriceINR: originalPriceINR ? parseFloat(originalPriceINR) : undefined,
        originalPriceUSD: originalPriceUSD ? parseFloat(originalPriceUSD) : undefined,
        priceVisibility,
        variantPricesINR: Object.keys(variantPricesINR).length > 0 ? toNumMap(variantPricesINR) : undefined,
        variantPricesUSD: Object.keys(variantPricesUSD).length > 0 ? toNumMap(variantPricesUSD) : undefined,
        variantOriginalPricesINR: Object.keys(variantOriginalPricesINR).length > 0 ? toNumMap(variantOriginalPricesINR) : undefined,
        variantOriginalPricesUSD: Object.keys(variantOriginalPricesUSD).length > 0 ? toNumMap(variantOriginalPricesUSD) : undefined,
        variantVisibilities: Object.keys(variantVisibilities).length > 0 ? variantVisibilities : undefined,
      }
      const response = await adminProductService.approveProduct(
        approvingRequest.id, parseFloat(adminPrice), variantPricesNum,
        originalPrice ? parseFloat(originalPrice) : undefined,
        variantOriginalPricesNum && Object.keys(variantOriginalPricesNum).length > 0 ? variantOriginalPricesNum : undefined,
        multiCurrency
      )
      if (response.success) {
        showSuccessToast('Product Approved', 'The vendor product has been approved successfully.')
        setShowApprovalModal(false); setApprovingRequest(null)
        setPriceINR(''); setPriceUSD(''); setOriginalPriceINR(''); setOriginalPriceUSD('')
        setPriceVisibility('BOTH'); setVariantPricesINR({}); setVariantPricesUSD({})
        setVariantOriginalPricesINR({}); setVariantOriginalPricesUSD({}); setVariantVisibilities({})
        loadRequests(pagination.currentPage); loadStatusCounts()
      }
    } catch (error: any) { showErrorToast('Approval Failed', error.message || 'Unable to approve product.') }
  }

  const handleRejectClick = (requestId: string) => { setRejectingRequestId(requestId); setShowRejectionModal(true) }

  const handleReject = async (reason: string) => {
    if (!rejectingRequestId) return
    try {
      const response = await adminProductService.rejectProduct(rejectingRequestId, reason.trim())
      if (response.success) {
        showSuccessToast('Product Rejected', 'The vendor has been notified of the rejection.')
        setShowRejectionModal(false); setRejectingRequestId(null)
        loadRequests(pagination.currentPage); loadStatusCounts()
      }
    } catch (error: any) { showErrorToast('Rejection Failed', error.message || 'Unable to reject product.') }
  }

  const handleAssignClick = (requestId: string) => {
    const req = requests.find(r => r.id === requestId)
    setAssigningRequestId(requestId); setSelectedQcChecker(req?.assignedQcId ?? ''); setShowAssignModal(true)
  }

  const handleAssignQC = async () => {
    if (!assigningRequestId || !selectedQcChecker) { showErrorToast('Validation Error', 'Please select a QC Checker'); return }
    const wasReassign = Boolean(requests.find(r => r.id === assigningRequestId)?.assignedQcId)
    try {
      const response = await adminProductService.assignQCChecker(assigningRequestId, selectedQcChecker)
      if (response.success) {
        showSuccessToast(
          wasReassign ? 'QC Checker Reassigned' : 'QC Checker Assigned',
          wasReassign ? 'The product has been reassigned to a new Quality Checker.' : 'The product has been assigned for inspection.'
        )
        setShowAssignModal(false); setAssigningRequestId(null); setSelectedQcChecker('')
        loadRequests(pagination.currentPage)
      }
    } catch (error: any) { showErrorToast(wasReassign ? 'Reassignment Failed' : 'Assignment Failed', error.message || 'Unable to assign QC Checker.') }
  }

  const handleViewDetails = (request: VendorProductRequest) => {
    const slug = request.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    router.push(`/admin/dashboard/products/vendor-requests/view/${slug}--${request.id}`)
  }

  // ── Metric cards ──────────────────────────────────────────────────────────
  const metricCards = [
    { key: 'all',         label: 'All Requests',   subtitle: 'Total submissions',     count: statusCounts.total,       Icon: ShoppingBag,    iconBg: 'bg-brand-50',    iconColor: 'text-brand-500',   countColor: 'text-slate-900',  activeClass: 'border-brand-400 bg-brand-50/50' },
    { key: 'PENDING',     label: 'Pending QC',     subtitle: 'Awaiting inspection',   count: statusCounts.pending,     Icon: Clock,          iconBg: 'bg-amber-50',    iconColor: 'text-amber-500',   countColor: 'text-amber-700',  activeClass: 'border-amber-400 bg-amber-50/60' },
    { key: 'QC_APPROVED', label: 'QC Approved',    subtitle: 'Ready for approval',    count: statusCounts.qcApproved,  Icon: CheckCircle,    iconBg: 'bg-blue-50',     iconColor: 'text-blue-500',    countColor: 'text-blue-700',   activeClass: 'border-blue-400 bg-blue-50/60' },
    { key: 'APPROVED',    label: 'Approved',        subtitle: 'Live on platform',      count: statusCounts.approved,    Icon: Package,        iconBg: 'bg-emerald-50',  iconColor: 'text-emerald-500', countColor: 'text-emerald-700', activeClass: 'border-emerald-400 bg-emerald-50/60' },
    { key: 'REJECTED',    label: 'Rejected',        subtitle: 'Declined requests',     count: statusCounts.rejected,    Icon: XCircle,        iconBg: 'bg-red-50',      iconColor: 'text-red-500',     countColor: 'text-red-700',    activeClass: 'border-red-400 bg-red-50/60' },
    { key: 'REINSPECTION',label: 'Re-Inspection',  subtitle: 'Needs re-review',       count: statusCounts.reinspection,Icon: AlertTriangle,  iconBg: 'bg-orange-50',   iconColor: 'text-orange-500',  countColor: 'text-orange-700', activeClass: 'border-orange-400 bg-orange-50/60' },
  ]

  const hasActiveFilters = statusFilter !== 'all' || searchTerm || dateFrom || dateTo
  const rangeStart = pagination.totalCount === 0 ? 0 : (pagination.currentPage - 1) * pagination.limit + 1
  const rangeEnd = Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <Breadcrumb />
      <div className="space-y-6 mt-4">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vendor Product Requests</h1>
            <p className="text-slate-500 mt-0.5">Review and manage product submissions from vendors.</p>
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
                    { value: 'QC_APPROVED',  label: 'QC Approved' },
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
                    <TableHead className="w-[19%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Product</TableHead>
                    <TableHead className="w-[8%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">SKU</TableHead>
                    <TableHead className="w-[9%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Category</TableHead>
                    <TableHead className="w-[7%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Variants</TableHead>
                    <TableHead className="w-[12%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">Vendor</TableHead>
                    <TableHead className="w-[13%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider">QC Checker</TableHead>
                    <TableHead className="w-[11%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider whitespace-nowrap">Insp. Status</TableHead>
                    <TableHead className="w-[9%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider whitespace-nowrap">Submitted</TableHead>
                    <TableHead className="w-[12%] font-bold !text-brand-500/60 h-11 py-3 px-3 text-[10px] uppercase tracking-wider text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow
                      key={request.id}
                      className="hover:bg-slate-50/60 transition-colors duration-150 border-b border-slate-100 last:border-0"
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
                        {request.subCategory && <div className="text-xs text-slate-400">{request.subCategory}</div>}
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
                        {getApprovalStatusBadge(request.approvalStatus)}
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
                          {(request.approvalStatus === 'PENDING' || request.approvalStatus === 'QC_APPROVED' || request.approvalStatus === 'REINSPECTION') && (
                            <>
                              {request.approvalStatus === 'QC_APPROVED' && hasPermission('vendor_product_requests:approve') && (
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
                                    title="Reassign QC Checker"
                                    onClick={() => handleAssignClick(request.id)}
                                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
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
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-slate-100">
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {pagination.totalCount === 0 ? '0 products' : `Showing ${rangeStart}–${rangeEnd} of ${pagination.totalCount} product${pagination.totalCount === 1 ? '' : 's'}`}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                      disabled={pagination.currentPage <= 1}
                      className="p-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {getPageRange(pagination.currentPage, pagination.totalPages).map((p, i) =>
                      p === '…' ? (
                        <span key={`e-${i}`} className="px-2 text-slate-400 text-sm">…</span>
                      ) : (
                        <button
                          key={`p-${p}`}
                          onClick={() => setPagination(prev => ({ ...prev, currentPage: p as number }))}
                          aria-current={p === pagination.currentPage ? 'page' : undefined}
                          className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === pagination.currentPage ? 'bg-brand-500 text-white shadow-xs shadow-brand-500/20' : 'text-slate-700 hover:bg-slate-100'}`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                      disabled={pagination.currentPage >= pagination.totalPages}
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
        {!loading && pagination.totalPages <= 1 && pagination.totalCount > 0 && (
          <p className="text-xs text-slate-400">
            Showing {requests.length} of {pagination.totalCount} product{pagination.totalCount === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {/* ══ Approval Modal ══════════════════════════════════════════════════ */}
      {showApprovalModal && approvingRequest && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Approve Product</h3>
              <button type="button" onClick={() => { setShowApprovalModal(false); setApprovingRequest(null) }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-sm font-semibold text-slate-900">{approvingRequest.name}</p>
              <p className="text-sm text-slate-600">{approvingRequest.vendor.companyName}</p>
              <p className="text-xs text-slate-400">Vendor Base Price: ₹{approvingRequest.basePrice}</p>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin Selling Price (₹) *</label>
                <p className="text-xs text-slate-500 mb-1.5">Vendor Base: ₹{approvingRequest.basePrice}</p>
                <input type="number" value={adminPrice || ''} onChange={(e) => setAdminPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none text-sm"
                  placeholder="Enter selling price" step="0.01" min="0" />
                <p className="text-xs text-slate-400 mt-1">Final price customers see.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Original Price (₹) *</label>
                <p className="text-xs text-slate-500 mb-1.5">For strikethrough discount</p>
                <input type="number" value={originalPrice || ''} onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none text-sm"
                  placeholder="Enter original price" step="0.01" min="0" />
                {originalPrice && parseFloat(originalPrice) > parseFloat(adminPrice) && (
                  <p className="text-xs text-emerald-600 mt-1">{Math.round(((parseFloat(originalPrice) - parseFloat(adminPrice)) / parseFloat(adminPrice)) * 100)}% off</p>
                )}
              </div>
            </div>

            <div className="mb-4 p-4 border border-blue-200 bg-blue-50 rounded-xl">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">Currency Pricing</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Selling Price (.in)</p>
                  <p className="text-lg font-bold text-slate-900">₹{adminPrice || '—'}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Selling Price (.com)</p>
                  <p className="text-lg font-bold text-slate-900">{adminPrice ? `$${convertINRtoUSD(parseFloat(adminPrice)).toFixed(2)}` : '—'}</p>
                  <p className="text-[10px] text-emerald-600">Auto-calculated from exchange rate</p>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-600 mb-2 mt-4 border-b border-blue-200 pb-1">Original Prices (MRP)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Original ₹ (MRP)</label>
                  <input id="base-original-inr" type="number" value={originalPriceINR || ''} onChange={(e) => setOriginalPriceINR(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm"
                    placeholder="MRP for .in domain" step="0.01" min="0" />
                  <p className="text-[10px] text-slate-400 mt-1">Strikethrough on .in</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Original $ (MRP)</label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-500">
                    {originalPriceINR ? `$${convertINRtoUSD(parseFloat(originalPriceINR)).toFixed(2)}` : 'Auto-calculated'}
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-1">Auto from exchange rate</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Visibility</label>
                  <select value={priceVisibility} onChange={(e) => setPriceVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-sm">
                    <option value="BOTH">Both (.in + .com)</option>
                    <option value="IN_ONLY">.in Only (India)</option>
                    <option value="COM_ONLY">.com Only (International)</option>
                  </select>
                </div>
              </div>
            </div>

            {approvingRequest.variants && approvingRequest.variants.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Set Prices for Each Variant</label>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {approvingRequest.variants.map((variant) => (
                    <div key={variant.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                      <div className="mb-2">
                        <p className="text-sm font-medium text-slate-900">{variant.size} – {variant.color}</p>
                        <p className="text-xs text-slate-500">Vendor Price: ₹{variant.price} · Stock: {variant.stock}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Admin Price (₹) *</label>
                          <input type="number" value={variantPrices[variant.id] || ''} onChange={(e) => setVariantPrices(prev => ({ ...prev, [variant.id]: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm"
                            placeholder="Selling price" step="0.01" min="0" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Original Price (₹) *</label>
                          <input type="number" value={variantOriginalPrices[variant.id] || ''} onChange={(e) => setVariantOriginalPrices(prev => ({ ...prev, [variant.id]: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm"
                            placeholder="Original price" step="0.01" min="0" />
                          {variantOriginalPrices[variant.id] && variantPrices[variant.id] && parseFloat(variantOriginalPrices[variant.id]) > parseFloat(variantPrices[variant.id]) && (
                            <p className="text-xs text-emerald-600 mt-1">{Math.round(((parseFloat(variantOriginalPrices[variant.id]) - parseFloat(variantPrices[variant.id])) / parseFloat(variantPrices[variant.id])) * 100)}% off</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => { setShowApprovalModal(false); setApprovingRequest(null) }}
                className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleApproveSubmit}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs">
                Approve Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Rejection Modal ══════════════════════════════════════════════════ */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Reject Product Request</h3>
              <button type="button" onClick={() => { setShowRejectionModal(false); setRejectingRequestId(null) }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Please provide a reason for rejecting this product request. The vendor will be notified.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rejection Reason</label>
              <textarea
                id="rejectionReason"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none text-sm resize-none"
                placeholder="Enter reason for rejection…"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowRejectionModal(false); setRejectingRequestId(null) }}
                className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="button"
                onClick={() => {
                  const reasonInput = document.getElementById('rejectionReason') as HTMLTextAreaElement
                  const reason = reasonInput.value.trim()
                  if (reason) { handleReject(reason) } else { showErrorToast('Validation Error', 'Please provide a rejection reason') }
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs">
                Reject Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Assign QC Checker Modal ══════════════════════════════════════════ */}
      {showAssignModal && (() => {
        const assigningRequest = requests.find(r => r.id === assigningRequestId)
        const currentQcId = assigningRequest?.assignedQcId ?? ''
        const isReassign = Boolean(currentQcId)
        const isUnchanged = isReassign && selectedQcChecker === currentQcId
        return (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">{isReassign ? 'Reassign QC Checker' : 'Assign QC Checker'}</h3>
                <button type="button" onClick={() => { setShowAssignModal(false); setAssigningRequestId(null); setSelectedQcChecker('') }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                {isReassign ? 'Select a different Quality Checker to take over inspection of this product.' : 'Select a Quality Checker to inspect this product before it can be approved.'}
              </p>
              {isReassign && assigningRequest?.assignedQc?.name && (
                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Currently assigned</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-slate-900">{assigningRequest.assignedQc.name}</span>
                    {assigningRequest.assignedQc.checkerId && (
                      <span className="text-xs font-mono text-slate-400">({assigningRequest.assignedQc.checkerId})</span>
                    )}
                  </div>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">QC Checker</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none text-sm"
                  value={selectedQcChecker}
                  onChange={(e) => setSelectedQcChecker(e.target.value)}
                >
                  <option value="">Select a QC Checker</option>
                  {qcCheckers.map(qc => (
                    <option key={qc.id} value={qc.id}>{formatCheckerName(qc)}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowAssignModal(false); setAssigningRequestId(null); setSelectedQcChecker('') }}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleAssignQC} disabled={!selectedQcChecker || isUnchanged}
                  title={isUnchanged ? 'Select a different QC Checker to reassign' : undefined}
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed">
                  {isReassign ? 'Reassign' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
