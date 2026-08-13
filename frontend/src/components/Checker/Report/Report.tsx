"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  CheckCircle, XCircle,
  Factory, Package, Search, X, RotateCw, MapPin, Video,
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
import ProductReportsTab from "./ProductReportsTab"

type Tab = "factory" | "product"

const PAGE_SIZE = 12
const DEFAULT_SORT = "completedAt:desc"
// Reserve vertical space for a full page so pagination/layout doesn't jump when result count shrinks.
const TABLE_MIN_HEIGHT_PX = PAGE_SIZE * 65

const RESULT_OPTIONS = [
  { value: "", label: "All results" },
  { value: "PASSED", label: "Approved" },
  { value: "FAILED", label: "Rejected" },
]

const SORT_OPTIONS = [
  { value: "completedAt:desc", label: "Latest first" },
  { value: "completedAt:asc", label: "Oldest first" },
]

export default function ReportsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialTab = searchParams.get("tab") === "product" ? "product" : "factory"
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  // Factory reports state
  const initialSearch = searchParams.get("search") ?? ""
  const initialResult = searchParams.get("result") ?? ""
  const initialSort = searchParams.get("sort") ?? DEFAULT_SORT
  const initialFrom = searchParams.get("dateFrom") ?? ""
  const initialTo = searchParams.get("dateTo") ?? ""
  const initialPage = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1)

  const [searchInput, setSearchInput] = useState(initialSearch)
  const [result, setResult] = useState(initialResult)
  const [sort, setSort] = useState(initialSort)
  const [dateFrom, setDateFrom] = useState(initialFrom)
  const [dateTo, setDateTo] = useState(initialTo)
  const [page, setPage] = useState(initialPage)

  const debouncedSearch = useDebounce(searchInput, 300)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inspections, setInspections] = useState<Record<string, any>[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestIdRef = useRef(0)

  // Reset page on search change (skip on mount so deep-linked ?page=N is honoured)
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    setPage(1)
  }, [debouncedSearch, dateFrom, dateTo])

  const [sortBy, sortOrder] = useMemo(() => {
    const [by, ord] = sort.split(":")
    return [by || "completedAt", (ord as "asc" | "desc") || "desc"]
  }, [sort])

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab === "product") params.set("tab", "product")
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (result) params.set("result", result)
    if (sort !== DEFAULT_SORT) params.set("sort", sort)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    if (page !== 1) params.set("page", String(page))
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
  }, [activeTab, debouncedSearch, result, sort, dateFrom, dateTo, page, router])

  const loadReports = useCallback(async () => {
    const id = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await qcCheckerService.getInspections({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        result: result || undefined,
        sortBy,
        sortOrder,
      })
      if (id !== requestIdRef.current) return
      if (res.success) {
        setInspections(res.inspections)
        setPagination(res.pagination)
      }
    } catch (err) {
      if (id !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : "Failed to load reports")
    } finally {
      if (id === requestIdRef.current) setLoading(false)
    }
  }, [page, debouncedSearch, result, sortBy, sortOrder])

  useEffect(() => {
    if (activeTab === "factory") loadReports()
  }, [loadReports, activeTab])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
  }

  const handleClearFilters = () => {
    setSearchInput("")
    setResult("")
    setSort(DEFAULT_SORT)
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  // Client-side date filter — filters within the current server page.
  const filteredInspections = useMemo(() => {
    if (!dateFrom) return inspections
    return inspections.filter((insp) => {
      const src = insp.completedAt || insp.scheduledDate
      if (!src) return false
      const d = new Date(src)
      if (Number.isNaN(d.getTime())) return false
      const raw = fmtDate(d)
      if (dateTo) return raw >= dateFrom && raw <= dateTo
      return raw === dateFrom
    })
  }, [inspections, dateFrom, dateTo])

  const hasActiveFilters = Boolean(debouncedSearch || result || sort !== DEFAULT_SORT || dateFrom || page !== 1)

  // Mirrors the admin QC Reports badge exactly so the checker sees the same
  // finalised outcome the admin does. Factory reports only ever contain
  // COMPLETED inspections (admin approve → PASSED, final reject → FAILED), but
  // the full lifecycle set is handled so nothing renders as a raw enum value.
  const getResultBadge = (r: string) => {
    switch (r) {
      case "PASSED":
      case "APPROVED":
        return <Badge className="bg-green-50 text-green-700 border border-green-200 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Approved</Badge>
      case "QC_SUBMITTED":
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200">Submitted</Badge>
      case "QC_APPROVED":
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle className="w-3 h-3" />QC Approved</Badge>
      case "REINSPECTION":
      case "RE_INSPECTION":
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">Re-Inspection</Badge>
      case "FAILED":
      case "REJECTED":
        return <Badge className="bg-red-50 text-red-700 border border-red-200 flex items-center gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>
      case "PENDING":
      case "IN_PROGRESS":
        return <Badge className="bg-brand-50 text-brand-700 border border-brand-200">In Progress</Badge>
      case "SUBMITTED":
        return <Badge className="bg-brand-50 text-brand-700 border border-brand-200">Submitted for Review</Badge>
      case "UNDER_ADMIN_REVIEW":
        return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">Under Admin Review</Badge>
      case "COMPLETED":
        return <Badge className="bg-green-50 text-green-700 border border-green-200">Completed</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700">{r || "—"}</Badge>
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildRow = (insp: Record<string, any>) => {
    const fmtDate = (d?: string | null) => {
      if (!d) return "—"
      const parsed = new Date(d)
      return Number.isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString("en-IN")
    }
    return {
      id: insp.id,
      vendor: insp.vendor?.companyName || "—",
      // Human-readable vendor code (VND-YYYY-NNNN), same as the admin panel.
      // Falls back to the raw id only if a legacy vendor has no code yet.
      vendorId: insp.vendor?.vendorCode || insp.vendor?.id || insp.vendorId || "—",
      // Date the inspection was scheduled/assigned.
      assignedDate: fmtDate(insp.scheduledDate),
      // Format consistently — the old fallback returned the raw ISO string
      // (e.g. "2026-07-23") when completedAt was missing, so some rows showed
      // ISO while others showed DD/MM/YYYY.
      inspectionDate: fmtDate(insp.completedAt || insp.scheduledDate),
      priority: insp.priority || "—",
      result: insp.result || "—",
      inspectionType: insp.inspectionType,
    }
  }

  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase()
    const cls =
      p === "high"
        ? "bg-red-50 text-red-700 border border-red-200"
        : p === "medium"
          ? "bg-amber-50 text-amber-700 border border-amber-200"
          : p === "low"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-slate-100 text-slate-600 border border-slate-200"
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${cls}`}>{priority}</span>
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "factory", label: "Factory Reports", icon: <Factory className="w-4 h-4" /> },
    { key: "product", label: "Product Reports", icon: <Package className="w-4 h-4" /> },
  ]

  return (
    <div className="p-8 font-sans">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Inspection Reports</h1>
          <p className="text-slate-600 text-lg">Your completed quality control reports</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            aria-current={activeTab === tab.key ? "page" : undefined}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1 ${
              activeTab === tab.key
                ? "text-brand-600 border-b-2 border-brand-500 bg-brand-50/40"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Factory Inspections Tab */}
      {activeTab === "factory" && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] items-center">
            <div className="relative">
              <label htmlFor="report-search" className="sr-only">Search reports</label>
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                id="report-search"
                type="text"
                placeholder="Search by vendor, client..."
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
                id="report-result-filter"
                value={result}
                options={RESULT_OPTIONS}
                onChange={(v) => { setResult(v as string); setPage(1) }}
                placeholder="All results"
                buttonClassName="py-3 rounded-xl"
              />
            </div>
            <div className="min-w-45">
              <Dropdown
                id="report-sort-filter"
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
                onClick={loadReports}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <RotateCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden" style={{ minHeight: TABLE_MIN_HEIGHT_PX }}>
            {loading && inspections.length === 0 ? (
              <div className="animate-pulse">
                <div className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-slate-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-4 bg-slate-200 rounded w-20" />
                  ))}
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 px-6 py-5 border-b border-slate-50">
                    <div className="h-4 bg-slate-200 rounded w-32" />
                    <div className="h-4 bg-slate-100 rounded w-24" />
                    <div className="h-4 bg-slate-100 rounded w-20" />
                    <div className="h-6 bg-slate-200 rounded-full w-16" />
                    <div className="h-7 bg-slate-100 rounded-lg w-24" />
                  </div>
                ))}
              </div>
            ) : !loading && !error && filteredInspections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="p-4 bg-slate-100 rounded-2xl">
                  <Factory className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">
                  {hasActiveFilters ? "No reports match your filters" : "No reports yet"}
                </h3>
                <p className="text-slate-500 text-sm">
                  {hasActiveFilters
                    ? "Try adjusting your search or filters."
                    : "Completed factory inspections will appear here."}
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
                    <TableHead className="w-[22%] font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Vendor</TableHead>
                    <TableHead className="w-[10%] font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Type</TableHead>
                    <TableHead className="w-[18%] font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Vendor ID</TableHead>
                    <TableHead className="w-[15%] font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Assigned Date</TableHead>
                    <TableHead className="w-[15%] font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Completed On</TableHead>
                    <TableHead className="w-[13%] font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Priority</TableHead>
                    <TableHead className="w-[13%] font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspections.map((insp) => {
                    const row = buildRow(insp)
                    return (
                      <TableRow key={insp.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="font-medium text-slate-900">{row.vendor}</div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs font-mono truncate" title={row.vendorId}>{row.vendorId}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                            {String(row.inspectionType).toUpperCase() === 'VIRTUAL'
                              ? <><Video className="w-3.5 h-3.5 text-sky-500" /> Virtual</>
                              : <><MapPin className="w-3.5 h-3.5 text-slate-400" /> Physical</>}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{row.assignedDate}</TableCell>
                        <TableCell className="text-slate-600 text-sm">{row.inspectionDate}</TableCell>
                        <TableCell>{getPriorityBadge(row.priority)}</TableCell>
                        <TableCell>{getResultBadge(row.result)}</TableCell>
                      </TableRow>
                    )
                  })}
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
      )}

      {/* Product Reports Tab */}
      {activeTab === "product" && <ProductReportsTab />}
    </div>
  )
}
