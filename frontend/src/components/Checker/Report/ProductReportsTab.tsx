"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Eye, Package, CheckCircle, XCircle, Download,
  Search, X, ChevronLeft, ChevronRight, RotateCw, Calendar,
} from "lucide-react"
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

function getPageRange(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: Array<number | "…"> = [1]
  if (current > 4) pages.push("…")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let p = start; p <= end; p++) pages.push(p)
  if (current < total - 3) pages.push("…")
  pages.push(total)
  return pages
}

interface ProductReportSummary {
  id: string
  name: string
  baseSku?: string
  category?: string
  approvalStatus?: string
  rejectionReason?: string
  updatedAt?: string
  vendor?: { companyName?: string }
  images?: { url: string }[]
}

export default function ProductReportsTab() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialSearch = searchParams.get("psearch") ?? ""
  const initialSort = searchParams.get("psort") ?? DEFAULT_SORT
  const initialStatus = searchParams.get("pstatus") ?? ""
  const initialDate = searchParams.get("pdate") ?? ""
  const initialPage = Math.max(parseInt(searchParams.get("ppage") || "1", 10) || 1, 1)

  const [searchInput, setSearchInput] = useState(initialSearch)
  const [sort, setSort] = useState(initialSort)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [dateFilter, setDateFilter] = useState(initialDate)
  const [page, setPage] = useState(initialPage)
  const dateInputRef = useRef<HTMLInputElement>(null)

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
  }, [debouncedSearch, statusFilter, dateFilter])

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
    params.delete("psearch"); params.delete("psort"); params.delete("pstatus"); params.delete("pdate"); params.delete("ppage")
    if (debouncedSearch) params.set("psearch", debouncedSearch)
    if (sort !== DEFAULT_SORT) params.set("psort", sort)
    if (statusFilter) params.set("pstatus", statusFilter)
    if (dateFilter) params.set("pdate", dateFilter)
    if (page !== 1) params.set("ppage", String(page))
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : "?tab=product", { scroll: false })
  }, [debouncedSearch, sort, statusFilter, dateFilter, page, router])

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
    setDateFilter("")
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
    if (dateFilter) {
      list = list.filter((p) => {
        if (!p.updatedAt) return false
        const d = new Date(p.updatedAt)
        if (Number.isNaN(d.getTime())) return false
        const raw = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        return raw === dateFilter
      })
    }
    return list
  }, [products, statusFilter, dateFilter])

  const isClientFiltered = Boolean(statusFilter || dateFilter)
  const hasActiveFilters = Boolean(debouncedSearch || sort !== DEFAULT_SORT || statusFilter || dateFilter || page !== 1)
  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const rangeEnd = isClientFiltered
    ? rangeStart + filteredProducts.length - 1
    : Math.min(pagination.page * pagination.limit, pagination.total)

  const getStatusBadge = (status: string) => {
    switch (status) {
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
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] items-start">
        <div className="relative">
          <label htmlFor="product-report-search" className="sr-only">Search product reports</label>
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            id="product-report-search"
            type="text"
            placeholder="Search by product, SKU, or vendor..."
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
        <div className="relative min-w-45">
          <label htmlFor="product-report-date" className="sr-only">Filter by Inspected Date</label>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              try { dateInputRef.current?.showPicker() } catch (err) {}
            }}
            className="absolute left-3.5 top-3.5 text-slate-400 hover:text-brand-500 cursor-pointer z-10 transition-colors"
            title="Open calendar picker"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <input
            ref={dateInputRef}
            id="product-report-date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-12 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all bg-white shadow-xs text-sm text-slate-700 [&::-webkit-calendar-picker-indicator]:hidden"
          />
          {dateFilter && (
            <button
              onClick={(e) => { e.stopPropagation(); setDateFilter("") }}
              aria-label="Clear date filter"
              className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-700 cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="min-w-45">
          <Dropdown
            id="product-report-status"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(v) => { setStatusFilter(v as string); setPage(1) }}
            placeholder="All results"
          />
        </div>
        <div className="min-w-45">
          <Dropdown
            id="product-report-sort"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(v) => { setSort(v as string); setPage(1) }}
          />
        </div>
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
        <span>
          {loading
            ? "Loading product reports..."
            : (isClientFiltered ? filteredProducts.length : pagination.total) === 0
              ? "0 reports"
              : `Showing ${rangeStart}–${rangeEnd} of ${isClientFiltered ? filteredProducts.length : pagination.total} report${(isClientFiltered ? filteredProducts.length : pagination.total) === 1 ? "" : "s"}`}
        </span>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

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
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold">Product</TableHead>
                <TableHead className="font-semibold">Vendor</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Inspected On</TableHead>
                <TableHead className="font-semibold">Result</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-slate-50/50">
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
                  <TableCell className="text-slate-600 text-sm">{product.category || "—"}</TableCell>
                  <TableCell>
                    {product.baseSku ? (
                      <span className="font-mono text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                        {product.baseSku}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {product.updatedAt
                      ? new Date(product.updatedAt).toLocaleDateString("en-IN")
                      : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(product.approvalStatus || "")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/checker/dashboard/report/product/${product.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1"
                        title="View Report"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Report
                      </button>
                      <button
                        onClick={() => router.push(`/checker/dashboard/report/product/${product.id}?download=true`)}
                        className="flex items-center justify-center w-8 h-8 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <nav aria-label="Product report pagination" className="mt-2 flex items-center justify-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={loading || page <= 1}
            aria-label="Previous page"
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          {getPageRange(page, pagination.totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-slate-400" aria-hidden="true">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                disabled={loading}
                aria-current={p === page ? "page" : undefined}
                className={`min-w-9 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={loading || page >= pagination.totalPages}
            aria-label="Next page"
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  )
}
