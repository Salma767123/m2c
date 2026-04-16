"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  Eye, CheckCircle, XCircle, Download,
  Factory, Package, Search, X, ChevronLeft, ChevronRight, RotateCw,
} from "lucide-react"
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

const RESULT_OPTIONS = [
  { value: "", label: "All results" },
  { value: "PASSED", label: "Passed" },
  { value: "FAILED", label: "Failed" },
]

const SORT_OPTIONS = [
  { value: "completedAt:desc", label: "Latest first" },
  { value: "completedAt:asc", label: "Oldest first" },
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

export default function ReportsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialTab = searchParams.get("tab") === "product" ? "product" : "factory"
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  // Factory reports state
  const initialSearch = searchParams.get("search") ?? ""
  const initialResult = searchParams.get("result") ?? ""
  const initialSort = searchParams.get("sort") ?? DEFAULT_SORT
  const initialPage = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1)

  const [searchInput, setSearchInput] = useState(initialSearch)
  const [result, setResult] = useState(initialResult)
  const [sort, setSort] = useState(initialSort)
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
  }, [debouncedSearch])

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
    if (page !== 1) params.set("page", String(page))
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
  }, [activeTab, debouncedSearch, result, sort, page, router])

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
    setPage(1)
  }

  const hasActiveFilters = Boolean(debouncedSearch || result || sort !== DEFAULT_SORT || page !== 1)
  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total)

  const getResultBadge = (r: string) => {
    switch (r) {
      case "PASSED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Passed</Badge>
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1"><XCircle className="w-3 h-3" />Failed</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700">{r || "—"}</Badge>
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildRow = (insp: Record<string, any>) => {
    return {
      id: insp.id,
      vendor: insp.vendor?.companyName || "—",
      inspectionDate: insp.completedAt
        ? new Date(insp.completedAt).toLocaleDateString("en-IN")
        : insp.scheduledDate || "—",
      result: insp.result || "—",
      clientName: insp.clientName || "—",
    }
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
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 ${
              activeTab === tab.key
                ? "text-[#222222] border-b-2 border-[#222222] bg-neutral-50/40"
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
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-start">
            <div className="relative">
              <label htmlFor="report-search" className="sr-only">Search reports</label>
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                id="report-search"
                type="text"
                placeholder="Search by vendor, client..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-12 pr-10 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent transition-all bg-white shadow-sm"
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
              <Dropdown
                id="report-result-filter"
                value={result}
                options={RESULT_OPTIONS}
                onChange={(v) => { setResult(v as string); setPage(1) }}
                placeholder="All results"
              />
            </div>
            <div className="min-w-45">
              <Dropdown
                id="report-sort-filter"
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
                ? "Loading reports..."
                : pagination.total === 0
                  ? "0 reports"
                  : `Showing ${rangeStart}–${rangeEnd} of ${pagination.total} report${pagination.total === 1 ? "" : "s"}`}
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-[#222222] hover:text-[#333333] font-medium underline underline-offset-2"
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
                onClick={loadReports}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <RotateCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
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
            ) : !loading && !error && inspections.length === 0 ? (
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
                    className="mt-2 px-4 py-2 bg-[#222222] text-white font-medium rounded-lg hover:bg-[#333333] transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Vendor</TableHead>
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Completed On</TableHead>
                    <TableHead className="font-semibold">Result</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((insp) => {
                    const row = buildRow(insp)
                    return (
                      <TableRow key={insp.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="font-medium text-slate-900">{row.vendor}</div>
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{row.clientName}</TableCell>
                        <TableCell className="text-slate-600 text-sm">{row.inspectionDate}</TableCell>
                        <TableCell>{getResultBadge(row.result)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/checker/dashboard/report/${insp.id}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
                              title="View Report"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Report
                            </button>
                            <button
                              onClick={() => router.push(`/checker/dashboard/report/${insp.id}?download=true`)}
                              className="flex items-center justify-center w-8 h-8 text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-2 flex items-center justify-center gap-1 flex-wrap">
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
                        ? "bg-[#222222] text-white border-[#222222]"
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
      )}

      {/* Product Reports Tab */}
      {activeTab === "product" && <ProductReportsTab />}
    </div>
  )
}
