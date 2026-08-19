"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Package, CheckCircle, XCircle,
  Search, X, RotateCw,
} from "lucide-react"
import DateRangeCalendar, { fmtDate } from "@/components/Shared/DateRangeCalendar"
import Pagination from "@/components/UI/Pagination"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/UI/Table"
import { Badge } from "@/components/UI/Badge"
import Dropdown from "@/components/UI/Dropdown"
import qcCheckerService from "@/services/qcCheckerService"
import { useDebounce } from "@/hooks/useDebounce"

const PAGE_SIZE = 12
const DEFAULT_SORT = "updatedAt:desc"
// Reserve vertical space for a full page so pagination/layout doesn't jump when result count shrinks.
const TABLE_MIN_HEIGHT_PX = PAGE_SIZE * 65

const SORT_OPTIONS = [
  { value: "updatedAt:desc", label: "Latest first" },
  { value: "updatedAt:asc", label: "Oldest first" },
]

const STATUS_OPTIONS = [
  { value: "", label: "All results" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
]

interface ProductReportSummary {
  id: string
  name: string
  baseSku?: string
  category?: string
  approvalStatus?: string
  rejectionReason?: string
  createdAt?: string
  updatedAt?: string
  /** QC's inspection-submission time (Completed On); legacy rows backfilled from
   *  the QC_SUBMITTED audit entry server-side. */
  lastReviewedAt?: string | null
  /** Admin's QC assignment snapshot — assignedAt is the Assigned date;
   *  scheduledDate is the fallback for legacy assignments. */
  qcAssignment?: { assignedAt?: string | null; scheduledDate?: string | null } | null
  vendor?: { companyName?: string; vendorCode?: string }
  images?: { url: string }[]
}

export default function ProductReportsTab() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialSearch = searchParams.get("psearch") ?? ""
  const initialSort = searchParams.get("psort") ?? DEFAULT_SORT
  const initialStatus = searchParams.get("pstatus") ?? ""
  const initialFrom = searchParams.get("pdateFrom") ?? ""
  const initialTo = searchParams.get("pdateTo") ?? ""
  const initialPage = Math.max(parseInt(searchParams.get("ppage") || "1", 10) || 1, 1)

  const [searchInput, setSearchInput] = useState(initialSearch)
  const [sort, setSort] = useState(initialSort)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [dateFrom, setDateFrom] = useState(initialFrom)
  const [dateTo, setDateTo] = useState(initialTo)
  const [page, setPage] = useState(initialPage)

  const debouncedSearch = useDebounce(searchInput, 300)

  const [products, setProducts] = useState<ProductReportSummary[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestIdRef = useRef(0)

  // Reset page on search change (skip first render)
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    setPage(1)
  }, [debouncedSearch, statusFilter, dateFrom, dateTo])

  const [sortBy, sortOrder] = useMemo(() => {
    const [by, ord] = sort.split(":")
    return [by || "updatedAt", (ord as "asc" | "desc") || "desc"]
  }, [sort])

  // URL sync — use prefixed params to avoid collision with factory tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Preserve tab param
    params.set("tab", "product")
    // Clean product params then set
    params.delete("psearch"); params.delete("psort"); params.delete("pstatus"); params.delete("pdateFrom"); params.delete("pdateTo"); params.delete("ppage")
    if (debouncedSearch) params.set("psearch", debouncedSearch)
    if (sort !== DEFAULT_SORT) params.set("psort", sort)
    if (statusFilter) params.set("pstatus", statusFilter)
    if (dateFrom) params.set("pdateFrom", dateFrom)
    if (dateTo) params.set("pdateTo", dateTo)
    if (page !== 1) params.set("ppage", String(page))
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : "?tab=product", { scroll: false })
  }, [debouncedSearch, sort, statusFilter, dateFrom, dateTo, page, router])

  const fetchReports = useCallback(async () => {
    const id = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await qcCheckerService.getProductReports({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
      })
      if (id !== requestIdRef.current) return
      if (res.success) {
        setProducts(res.data.products)
        setPagination(res.data.pagination)
      }
    } catch (err) {
      if (id !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : "Failed to load product reports")
    } finally {
      if (id === requestIdRef.current) setLoading(false)
    }
  }, [page, debouncedSearch, sortBy, sortOrder])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleClearFilters = () => {
    setSearchInput("")
    setSort(DEFAULT_SORT)
    setStatusFilter("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  // Client-side status + date filters (filtered within the current server page).
  const filteredProducts = useMemo(() => {
    let list = products
    if (statusFilter === "APPROVED") {
      list = list.filter((p) => p.approvalStatus === "QC_APPROVED" || p.approvalStatus === "APPROVED")
    } else if (statusFilter === "REJECTED") {
      list = list.filter((p) => p.approvalStatus === "REJECTED")
    }
    if (dateFrom) {
      list = list.filter((p) => {
        if (!p.updatedAt) return false
        const d = new Date(p.updatedAt)
        if (Number.isNaN(d.getTime())) return false
        const raw = fmtDate(d)
        if (dateTo) return raw >= dateFrom && raw <= dateTo
        return raw === dateFrom
      })
    }
    return list
  }, [products, statusFilter, dateFrom, dateTo])

  const isClientFiltered = Boolean(statusFilter || dateFrom)
  const hasActiveFilters = Boolean(debouncedSearch || sort !== DEFAULT_SORT || statusFilter || dateFrom || page !== 1)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "QC_SUBMITTED":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Submitted</Badge>
      case "QC_APPROVED":
      case "APPROVED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{status === "QC_APPROVED" ? "Approved by QC" : "Approved by Admin"}</Badge>
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700">{status || "—"}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] items-center">
        <div className="relative">
          <label htmlFor="product-report-search" className="sr-only">Search product reports</label>
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            id="product-report-search"
            type="text"
            placeholder="Search by product, or vendor..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-12 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all bg-white shadow-xs"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="min-w-45">
          <DateRangeCalendar
            from={dateFrom}
            to={dateTo}
            onChange={(from, to) => { setDateFrom(from); setDateTo(to) }}
            placeholder="Filter by date"
          />
        </div>
        <div className="min-w-45">
          <Dropdown
            id="product-report-status"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(v) => { setStatusFilter(v as string); setPage(1) }}
            placeholder="All results"
            buttonClassName="py-3 rounded-xl"
          />
        </div>
        <div className="min-w-45">
          <Dropdown
            id="product-report-sort"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(v) => { setSort(v as string); setPage(1) }}
            buttonClassName="py-3 rounded-xl"
          />
        </div>
      </div>

      {/* Results summary */}
      {/* Clear-filters action (report count summary intentionally omitted) */}
      {hasActiveFilters && (
        <div className="flex items-center justify-end gap-4 flex-wrap text-sm">
          <button
            onClick={handleClearFilters}
            className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
          <span>{error}</span>
          <button
            onClick={fetchReports}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden" style={{ minHeight: TABLE_MIN_HEIGHT_PX }}>
        {loading && products.length === 0 ? (
          <div className="animate-pulse">
            <div className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-slate-100">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-4 bg-slate-200 rounded w-16" />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-4 px-6 py-5 border-b border-slate-50 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-200 rounded-lg shrink-0" />
                  <div className="h-4 bg-slate-200 rounded w-24" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-28" />
                <div className="h-4 bg-slate-100 rounded w-16" />
                <div className="h-6 bg-slate-100 rounded-md w-16" />
                <div className="h-4 bg-slate-100 rounded w-20" />
                <div className="h-6 bg-slate-200 rounded-full w-20" />
                <div className="h-7 bg-slate-100 rounded-lg w-24" />
              </div>
            ))}
          </div>
        ) : !loading && !error && filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="p-4 bg-slate-100 rounded-2xl">
              <Package className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">
              {hasActiveFilters ? "No reports match your filters" : "No product reports yet"}
            </h3>
            <p className="text-slate-500 text-sm">
              {hasActiveFilters
                ? "Try adjusting your search or sort."
                : "Completed product inspections will appear here."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-2 px-4 py-2 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 active:bg-brand-700 transition-colors shadow-xs shadow-brand-500/10"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50">
              <TableRow className="!bg-brand-500/[0.06] hover:!bg-brand-500/[0.06]">
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Product</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Vendor</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Vendor ID</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Category</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Assigned</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Completed On</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow
                  key={product.id}
                  className="hover:bg-slate-50/40"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.images?.[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          onError={(e) => { e.currentTarget.style.display = "none" }}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                          <Package className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <span className="font-medium text-slate-900 line-clamp-1">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {product.vendor?.companyName || "—"}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm font-mono">
                    {product.vendor?.vendorCode || "—"}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">{product.category || "—"}</TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {(() => {
                      const d = product.qcAssignment?.assignedAt || product.qcAssignment?.scheduledDate
                      return d ? new Date(d).toLocaleDateString("en-IN") : "—"
                    })()}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {product.lastReviewedAt
                      ? new Date(product.lastReviewedAt).toLocaleDateString("en-IN")
                      : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(product.approvalStatus || "")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        onChange={setPage}
        disabled={loading}
      />
    </div>
  )
}
