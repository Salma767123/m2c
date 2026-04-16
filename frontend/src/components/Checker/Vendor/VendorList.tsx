"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Search,
  Factory,
  MapPin,
  Calendar,
  ArrowRight,
  Eye,
  CheckCircle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import InspectionForm from "@/components/Checker/Vendor/InspectionForm"
import VendorDetail from "@/components/Checker/Vendor/VendorDetail"
import Dropdown from "@/components/UI/Dropdown"
import { Vendor } from "@/types/inspection"
import qcCheckerService from "@/services/qcCheckerService"
import { useDebounce } from "@/hooks/useDebounce"

interface VendorsPageProps {
  selectedVendor: string | null
  onVendorSelect: (vendor: string | null) => void
}

const PAGE_SIZE = 12

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "UNDER_REVIEW", label: "Under Review by Admin" },
  { value: "APPROVED", label: "Approved by Admin" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
]

const SORT_OPTIONS = [
  { value: "submittedAt:desc", label: "Newest first" },
  { value: "submittedAt:asc", label: "Oldest first" },
]

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  UNDER_REVIEW: "bg-blue-100 text-blue-800 border-blue-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  SUSPENDED: "bg-slate-100 text-slate-800 border-slate-200",
}

const getStatusColor = (status: string) => STATUS_COLORS[status] || STATUS_COLORS.PENDING
const FRIENDLY_LABELS: Record<string, string> = {
  UNDER_REVIEW: "Under Review by Admin",
  QC_APPROVED: "Approved by QC",
  APPROVED: "Approved by Admin",
}
const formatStatus = (status: string) => FRIENDLY_LABELS[status] || status.replace(/_/g, " ").toLowerCase()

function formatVendorLocation(city?: string | null, state?: string | null): string {
  const parts = [city, state].map((p) => (p ?? "").trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "Location not provided"
}

type VendorStatus = Vendor['status']
const VALID_STATUSES: readonly VendorStatus[] = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED']
const toVendorStatus = (s: string | null | undefined): VendorStatus =>
  (VALID_STATUSES as readonly string[]).includes(s ?? '') ? (s as VendorStatus) : 'PENDING'

interface RawVendor {
  id: string
  companyName: string
  factoryCity?: string | null
  factoryState?: string | null
  submittedAt?: string | null
  status: string
  inspections?: Array<{ status?: string | null }>
}

// Pick an actionable inspection over a terminal one so the card button
// (Start / Continue / Completed) reflects what the checker can actually do.
const INSPECTION_PRIORITY = ["IN_PROGRESS", "SCHEDULED", "COMPLETED", "CANCELLED"] as const
function pickInspectionStatus(inspections?: Array<{ status?: string | null }>): string | null {
  if (!inspections || inspections.length === 0) return null
  for (const target of INSPECTION_PRIORITY) {
    const hit = inspections.find((i) => i.status === target)
    if (hit?.status) return hit.status
  }
  return inspections[0].status ?? null
}

function transformVendor(v: RawVendor): Vendor {
  return {
    id: v.id,
    name: v.companyName,
    location: formatVendorLocation(v.factoryCity, v.factoryState),
    submittedDate: v.submittedAt
      ? new Date(v.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : undefined,
    status: toVendorStatus(v.status),
    inspectionStatus: pickInspectionStatus(v.inspections),
  }
}

export default function VendorsPage({ selectedVendor, onVendorSelect }: VendorsPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialSearch = searchParams.get("search") ?? ""
  const initialStatus = searchParams.get("status") ?? ""
  const initialSort = searchParams.get("sort") ?? "submittedAt:desc"
  const initialPage = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1)

  const [searchInput, setSearchInput] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(initialPage)

  const debouncedSearch = useDebounce(searchInput, 300)

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inProgressInspection, setInProgressInspection] = useState(false)
  const [showVendorDetail, setShowVendorDetail] = useState(false)
  const [selectedVendorData, setSelectedVendorData] = useState<Vendor | null>(null)

  // Reset page to 1 whenever the debounced search changes (handles user typing a query).
  // We skip the very first run so that a deep-linked ?page=N URL is honored on mount.
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    setPage(1)
  }, [debouncedSearch])

  // Keep URL in sync with state (shareable, back-button friendly)
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (status) params.set("status", status)
    if (sort !== "submittedAt:desc") params.set("sort", sort)
    if (page !== 1) params.set("page", String(page))
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
  }, [debouncedSearch, status, sort, page, router])

  const [sortBy, sortOrder] = useMemo(() => {
    const [by, ord] = sort.split(":")
    return [by || "submittedAt", (ord as "asc" | "desc") || "desc"]
  }, [sort])

  // Monotonic counter to ignore stale in-flight responses when filters change rapidly.
  const requestIdRef = useRef(0)

  const loadVendors = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const vendorsRes = await qcCheckerService.getAssignedVendors({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
      })

      if (requestId !== requestIdRef.current) return

      if (vendorsRes.success) {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const formatted = vendorsRes.data.vendors.map((v: any) => transformVendor(v))
        /* eslint-enable @typescript-eslint/no-explicit-any */
        setVendors(formatted)
        setPagination(vendorsRes.data.pagination)
      }
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return
      console.error("Failed to fetch assigned vendors:", err)
      setError(err?.message || "Failed to fetch assigned vendors")
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [page, debouncedSearch, status, sortBy, sortOrder])

  useEffect(() => {
    loadVendors()
  }, [loadVendors])

  const handleCompleteInspection = () => {
    setInProgressInspection(false)
    setSelectedVendorData(null)
    onVendorSelect(null)
    loadVendors()
  }

  const handleViewDetails = (vendor: Vendor) => {
    setSelectedVendorData(vendor)
    setShowVendorDetail(true)
    onVendorSelect(vendor.id)
  }

  const handleStartInspection = (vendor: Vendor) => {
    setSelectedVendorData(vendor)
    setInProgressInspection(true)
    setShowVendorDetail(false)
    onVendorSelect(vendor.id)
  }

  const handleBackToList = () => {
    setShowVendorDetail(false)
    setSelectedVendorData(null)
    onVendorSelect(null)
  }

  const handleClearFilters = () => {
    setSearchInput("")
    setStatus("")
    setSort("submittedAt:desc")
    setPage(1)
  }

  const hasActiveFilters = Boolean(debouncedSearch || status || sort !== "submittedAt:desc" || page !== 1)
  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total)

  if (inProgressInspection && selectedVendorData) {
    return (
      <InspectionForm
        vendorId={selectedVendorData.id}
        vendorName={selectedVendorData.name}
        onComplete={handleCompleteInspection}
      />
    )
  }

  if (showVendorDetail && selectedVendorData) {
    return <VendorDetail vendor={selectedVendorData} onBack={handleBackToList} onStartInspection={handleStartInspection} />
  }

  return (
    <div className="min-h-screen p-8 font-sans flex flex-col">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Vendor Management</h1>
          <p className="text-slate-600 text-lg">Select a vendor to start quality inspection</p>
        </div>
        <button
          onClick={loadVendors}
          disabled={loading}
          title="Refresh"
          aria-label="Refresh vendors"
          className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto_auto] items-start">
        <div className="relative">
          <label htmlFor="vendor-search" className="sr-only">Search vendors</label>
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            id="vendor-search"
            type="text"
            placeholder="Search by name, city, or state..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-12 pr-10 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white shadow-sm"
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
            id="status-filter"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(v) => {
              setStatus(v as string)
              setPage(1)
            }}
            placeholder="All statuses"
          />
        </div>
        <div className="min-w-45">
          <Dropdown
            id="sort-filter"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(v) => {
              setSort(v as string)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Results summary */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
        <span>
          {loading
            ? "Loading vendors..."
            : pagination.total === 0
            ? "0 vendors"
            : `Showing ${rangeStart}–${rangeEnd} of ${pagination.total} vendor${pagination.total === 1 ? "" : "s"}`}
        </span>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
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
            onClick={loadVendors}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Skeleton on initial load */}
      {loading && vendors.length === 0 && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-3 flex-1">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                    <div className="h-3 w-1/2 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-slate-200 rounded-full" />
              </div>
              <div className="h-3 w-2/3 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-200 rounded" />
              <div className="flex gap-2">
                <div className="flex-1 h-9 bg-slate-200 rounded-lg" />
                <div className="flex-1 h-9 bg-slate-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vendor grid */}
      {!error && vendors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <article
              key={vendor.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden flex flex-col ${
                selectedVendor === vendor.id
                  ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30"
                  : "border-slate-200/60 hover:border-blue-300"
              }`}
            >
              <button
                type="button"
                onClick={() => handleViewDetails(vendor)}
                aria-label={`View details for ${vendor.name}`}
                className="block w-full text-left p-6 pb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset flex-1"
              >
                <div className="flex items-start justify-between mb-4 gap-2">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{vendor.name}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize whitespace-nowrap ${getStatusColor(vendor.status)}`}>
                    {formatStatus(vendor.status)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm">{vendor.location}</span>
                  </div>
                  {vendor.submittedDate && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4" aria-hidden="true" />
                      <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded border">
                        Submitted: {vendor.submittedDate}
                      </span>
                    </div>
                  )}
                </div>
              </button>
              <div className="px-6 pb-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleViewDetails(vendor)}
                  aria-label={`View details for ${vendor.name}`}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Eye className="w-4 h-4" aria-hidden="true" />
                  Details
                </button>
                {vendor.inspectionStatus === "COMPLETED" ? (
                  <div className="flex-1 bg-emerald-100 text-emerald-800 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm border border-emerald-200">
                    <CheckCircle className="w-4 h-4" aria-hidden="true" />
                    Completed
                  </div>
                ) : vendor.inspectionStatus === "CANCELLED" ? (
                  <div className="flex-1 bg-slate-100 text-slate-600 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm border border-slate-200">
                    <X className="w-4 h-4" aria-hidden="true" />
                    Cancelled
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartInspection(vendor)}
                    aria-label={`${vendor.inspectionStatus === "IN_PROGRESS" ? "Continue" : "Start"} inspection for ${vendor.name}`}
                    className="flex-1 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold py-2 px-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    {vendor.inspectionStatus === "IN_PROGRESS" ? "Continue" : "Start"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && vendors.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-slate-100 p-6 rounded-2xl inline-block mb-4">
            <Factory className="w-16 h-16 text-slate-400 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {hasActiveFilters ? "No vendors match your filters" : "No vendors assigned yet"}
          </h3>
          <p className="text-slate-600 mb-4">
            {hasActiveFilters
              ? "Try adjusting or clearing your filters."
              : "Vendors assigned to you by the admin will appear here."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={setPage}
          disabled={loading}
        />
      )}
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
  disabled?: boolean
}) {
  const pages = getPageRange(page, totalPages)
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1 flex-wrap">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" /> Prev
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-slate-400" aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            disabled={disabled}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Go to page ${p}`}
            className={`min-w-9 px-3 py-2 rounded-lg border font-medium ${
              p === page
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  )
}

// Returns an array of page numbers and ellipsis markers for a compact pagination bar.
function getPageRange(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: Array<number | "…"> = [1]
  if (current > 3) pages.push("…")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let p = start; p <= end; p++) pages.push(p)
  if (current < total - 2) pages.push("…")
  pages.push(total)
  return pages
}
