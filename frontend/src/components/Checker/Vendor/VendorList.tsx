"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Search,
  Factory,
  MapPin,
  ArrowRight,
  Eye,
  CheckCircle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
} from "lucide-react"
import DateRangeCalendar from "@/components/Shared/DateRangeCalendar"
import VendorInspectionForm from "@/components/Checker/Vendor/VendorInspectionForm"
import VendorDetail from "@/components/Checker/Vendor/VendorDetail"
import Dropdown from "@/components/UI/Dropdown"
import { getVendorMainStatus, getVendorInspectionStatus } from "@/lib/checkerVendorStatus"
import { State } from "country-state-city"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/UI/Table"
import { Vendor } from "@/types/inspection"
import qcCheckerService from "@/services/qcCheckerService"
import { useDebounce } from "@/hooks/useDebounce"

interface VendorsPageProps {
  selectedVendor: string | null
  onVendorSelect: (vendor: string | null) => void
}

const PAGE_SIZE = 10

const STATUS_TABS = [
  { value: "", label: "All Statuses" },
  { value: "New Assignment", label: "New Assignment" },
  { value: "Under Review by Admin", label: "Under Review by Admin" },
  { value: "Re-Inspection", label: "Re-Inspection" },
  { value: "Re-Inspection Under Review by Admin", label: "Re-Inspection Under Review" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
]

const SORT_OPTIONS = [
  { value: "assignedQcAt:desc", label: "Newest assignment" },
  { value: "assignedQcAt:asc", label: "Oldest assignment" },
]

const MAIN_STATUS_COLORS: Record<string, string> = {
  "New Assignment": "bg-blue-50 text-blue-700 border-blue-200/85",
  "Under Review by Admin": "bg-orange-50 text-orange-700 border-orange-200/85",
  "Re-Inspection": "bg-orange-50 text-orange-700 border-orange-200/85",
  "Re-Inspection Under Review by Admin": "bg-amber-50 text-amber-700 border-amber-200/85",
  "Re-Inspection Under Review": "bg-amber-50 text-amber-700 border-amber-200/85",
  "Approved": "bg-emerald-50 text-emerald-700 border-emerald-200/85",
  "Rejected": "bg-red-50 text-red-700 border-red-200/85",
}

const INSPECTION_STATUS_COLORS: Record<string, string> = {
  "Pending": "bg-slate-50 text-slate-700 border-slate-200/85",
  "Submitted": "bg-blue-50 text-blue-700 border-blue-200/85",
  "Rejected": "bg-red-50 text-red-700 border-red-200/85",
  "Completed": "bg-emerald-50 text-emerald-700 border-emerald-200/85",
}

const getStatusColor = (status: string) => MAIN_STATUS_COLORS[status] || "bg-amber-50 text-amber-700 border-amber-200/85"
const getInspectionStatusColor = (status?: string | null) => {
  const s = status || "Pending"
  return INSPECTION_STATUS_COLORS[s] || INSPECTION_STATUS_COLORS.Pending
}

const getBackendStatus = (tabValue: string): string => {
  switch (tabValue) {
    case "New Assignment":
    case "Under Review by Admin":
    case "Re-Inspection Under Review by Admin":
      return "UNDER_REVIEW"
    case "Re-Inspection":
      return "" // return empty to fetch both UNDER_REVIEW and REINSPECTION and let client-side handle it
    case "Approved":
      return "APPROVED"
    case "Rejected":
      return "REJECTED"
    default:
      return ""
  }
}

// Status derivation lives in a shared util so the dashboard metric counts and this
// list's filters agree exactly (a card's count == the rows its filter shows).
const getNewMainStatus = getVendorMainStatus
const getNewInspectionStatus = getVendorInspectionStatus

function formatVendorLocation(city?: string | null, state?: string | null): string {
  const parts = [city, state].map((p) => (p ?? "").trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "Location not provided"
}

interface RawVendor {
  id: string
  companyName: string
  ownerName?: string | null
  businessEmail?: string | null
  businessPhone?: string | null
  factoryCity?: string | null
  factoryState?: string | null
  submittedAt?: string | null
  createdAt?: string | null
  assignedQcAt?: string | null
  status: string
  inspections?: Array<{ status?: string | null; result?: string | null; cycleNumber?: number | null; scheduledDate?: string | null; scheduledTime?: string | null }>
}

function transformVendor(v: RawVendor): Vendor {
  const latestInspection = v.inspections && v.inspections.length > 0 ? v.inspections[0] : null

  // "Assigned Date" now shows the inspection's booked window — scheduledDate
  // (YYYY-MM-DD) + scheduledTime (e.g. "08:16 AM"), the same values the admin set.
  const schedYmd = latestInspection?.scheduledDate || undefined
  const schedTime = latestInspection?.scheduledTime || undefined
  const schedDateObj = schedYmd ? new Date(`${schedYmd}T00:00:00`) : null
  const assignedDate = schedDateObj && !isNaN(schedDateObj.getTime())
    ? `${schedDateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}${schedTime ? ` · ${schedTime}` : ""}`
    : undefined

  // YYYY-MM-DD for the date filter — now matched on the scheduled inspection date.
  const createdAtRaw = schedYmd || undefined

  return {
    id: v.id,
    name: v.companyName,
    location: formatVendorLocation(v.factoryCity, v.factoryState),
    submittedDate: v.submittedAt
      ? new Date(v.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : undefined,
    status: getNewMainStatus(v.status, latestInspection),
    inspectionStatus: getNewInspectionStatus(v.status, latestInspection),
    state: v.factoryState || null,
    assignedDate,
    createdAtRaw,
    contactPerson: {
      name: v.ownerName || "Not Provided",
      designation: "Owner",
      phone: v.businessPhone || "Not Provided",
      email: v.businessEmail || "Not Provided",
    }
  }
}

export default function VendorsPage({ selectedVendor, onVendorSelect }: VendorsPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()


  const initialSearch = searchParams.get("search") ?? ""
  const initialStatus = searchParams.get("status") ?? ""
  const initialSort = searchParams.get("sort") ?? "assignedQcAt:desc"
  const initialPage = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1)
  const initialFrom = searchParams.get("dateFrom") ?? ""
  const initialTo = searchParams.get("dateTo") ?? ""
  const initialInspectionStatus = searchParams.get("inspectionStatus") ?? ""
  const initialState = searchParams.get("state") ?? ""

  const [searchInput, setSearchInput] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [sort, setSort] = useState<string>(initialSort)
  const [dateFrom, setDateFrom] = useState(initialFrom)
  const [dateTo, setDateTo] = useState(initialTo)
  const [inspectionStatus, setInspectionStatus] = useState(initialInspectionStatus)
  const [selectedState, setSelectedState] = useState(initialState)
  const [page, setPage] = useState(initialPage)

  const debouncedSearch = useDebounce(searchInput, 300)

  const [vendors, setVendors] = useState<Vendor[]>([])

  const stateOptions = useMemo(() => {
    const states = State.getStatesOfCountry("IN")
    const list = states.map((s) => s.name)

    // also add any other states present in vendors that are not in the list
    const uniqueVendorStates = Array.from(new Set(vendors.map((v) => v.state).filter(Boolean))) as string[]
    uniqueVendorStates.forEach((s) => {
      if (!list.includes(s)) {
        list.push(s)
      }
    })

    // sort alphabetically
    list.sort((a, b) => a.localeCompare(b))

    return [
      { value: "", label: "All States" },
      ...list.map((s) => ({ value: s, label: s })),
    ]
  }, [vendors])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inProgressInspection, setInProgressInspection] = useState(false)
  const [showVendorDetail, setShowVendorDetail] = useState(false)
  const [selectedVendorData, setSelectedVendorData] = useState<Vendor | null>(null)

  const viewParam = searchParams.get("view")
  const vendorIdParam = searchParams.get("vendorId")

  useEffect(() => {
    if (viewParam === 'detail' && vendorIdParam) {
      setShowVendorDetail(true)
      setInProgressInspection(false)
      if (vendors.length > 0) {
        const vend = vendors.find(v => v.id === vendorIdParam)
        if (vend) {
          setSelectedVendorData(vend)
          onVendorSelect(vend.id)
        }
      }
    } else if (viewParam === 'inspection' && vendorIdParam) {
      setInProgressInspection(true)
      setShowVendorDetail(false)
      if (vendors.length > 0) {
        const vend = vendors.find(v => v.id === vendorIdParam)
        if (vend) {
          setSelectedVendorData(vend)
          onVendorSelect(vend.id)
        }
      }
    } else if (!viewParam && !vendorIdParam) {
      setShowVendorDetail(false)
      setInProgressInspection(false)
      setSelectedVendorData(null)
      onVendorSelect(null)
    }
  }, [viewParam, vendorIdParam, vendors, onVendorSelect])

  // Reset page to 1 whenever the debounced search, date filter, inspectionStatus filter, or state filter changes.
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    setPage(1)
  }, [debouncedSearch, dateFrom, dateTo, inspectionStatus, selectedState])

  // Keep URL in sync with state (shareable, back-button friendly)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (debouncedSearch) params.set("search", debouncedSearch)
    else params.delete("search")

    if (status) params.set("status", status)
    else params.delete("status")

    if (sort !== "assignedQcAt:desc") params.set("sort", sort)
    else params.delete("sort")

    if (dateFrom) params.set("dateFrom", dateFrom)
    else params.delete("dateFrom")
    if (dateTo) params.set("dateTo", dateTo)
    else params.delete("dateTo")

    if (inspectionStatus) params.set("inspectionStatus", inspectionStatus)
    else params.delete("inspectionStatus")

    if (selectedState) params.set("state", selectedState)
    else params.delete("state")
    
    if (page !== 1) params.set("page", String(page))
    else params.delete("page")
    
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, sort, dateFrom, dateTo, inspectionStatus, selectedState, page, router])

  const [sortBy, sortOrder] = useMemo(() => {
    const parts = sort.split(":")
    return [parts[0], (parts[1] ?? "desc") as "asc" | "desc"]
  }, [sort])

  // Monotonic counter to ignore stale in-flight responses when filters change rapidly.
  const requestIdRef = useRef(0)

  const loadVendors = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const backendStatus = getBackendStatus(status)
      const vendorsRes = await qcCheckerService.getAssignedVendors({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: backendStatus || undefined,
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

  const handleBackToList = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("view")
    params.delete("vendorId")
    router.push(`?${params.toString()}`)
  }

  const handleCompleteInspection = () => {
    handleBackToList()
    loadVendors()
  }

  const handleViewDetails = (vendor: Vendor) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", "detail")
    params.set("vendorId", vendor.id)
    router.push(`?${params.toString()}`)
  }

  const handleStartInspection = (vendor: Vendor) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", "inspection")
    params.set("vendorId", vendor.id)
    router.push(`?${params.toString()}`)
  }

  const filteredVendors = useMemo(() => {
    let result = [...vendors]
    if (dateFrom) {
      result = result.filter((v) => {
        if (!v.createdAtRaw) return false
        if (dateTo) return v.createdAtRaw >= dateFrom && v.createdAtRaw <= dateTo
        return v.createdAtRaw === dateFrom
      })
    }

    if (inspectionStatus) {
      result = result.filter((v) => v.inspectionStatus?.toLowerCase() === inspectionStatus.toLowerCase())
    }

    if (selectedState) {
      result = result.filter((v) => v.state?.toLowerCase() === selectedState.toLowerCase())
    }

    if (status) {
      if (status === "Re-Inspection Under Review" || status === "Re-Inspection Under Review by Admin") {
        result = result.filter(
          (v) => v.status === "Re-Inspection Under Review by Admin" || v.status === "Re-Inspection Under Review"
        )
      } else {
        result = result.filter((v) => v.status === status)
      }
    }

    return result
  }, [vendors, dateFrom, dateTo, inspectionStatus, selectedState, status])

  const handleClearFilters = () => {
    setSearchInput("")
    setStatus("")
    setSort("assignedQcAt:desc")
    setDateFrom("")
    setDateTo("")
    setInspectionStatus("")
    setSelectedState("")
    setPage(1)
  }

  const hasActiveFilters = Boolean(debouncedSearch || status || sort !== "assignedQcAt:desc" || dateFrom || inspectionStatus || selectedState || page !== 1)

  // Render the inspection form as soon as we have a vendorId in the URL — don't
  // wait for selectedVendorData, which requires the vendor list to have loaded first.
  // VendorInspectionForm fetches its own vendor data internally.
  if (inProgressInspection && vendorIdParam) {
    return (
      <VendorInspectionForm
        vendorId={vendorIdParam}
        vendorName={selectedVendorData?.name ?? ''}
        onComplete={handleCompleteInspection}
      />
    )
  }

  if (showVendorDetail && selectedVendorData) {
    return <VendorDetail vendor={selectedVendorData} onBack={handleBackToList} onStartInspection={handleStartInspection} />
  }

  return (
    <div className="min-h-screen pt-1 pb-6 px-6 font-sans flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Vendor Management</h1>
        <p className="text-slate-500 text-sm">Select a vendor to start quality inspection</p>
      </div>

      {/* Status Tabs and Actions */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="overflow-x-auto pb-1 scrollbar-none flex-1">
          <div className="flex gap-2 min-w-max">
            {STATUS_TABS.map((tab) => {
              const isActive = status === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setStatus(tab.value)
                    setPage(1)
                  }}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    isActive
                      ? "border-brand-500 bg-brand-50 shadow-sm shadow-brand-500/10 text-brand-700 font-bold"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto_auto] items-center">
          <div className="relative flex-1">
            <label htmlFor="vendor-search" className="sr-only">Search vendors</label>
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              id="vendor-search"
              type="text"
              placeholder="Search by name, city, or state..."
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
              id="inspection-status-filter"
              value={inspectionStatus}
              placeholder="All Statuses"
              buttonClassName="py-3 rounded-xl"
              options={[
                { value: "", label: "All Statuses" },
                { value: "Pending", label: "Pending" },
                { value: "Submitted", label: "Submitted" },
                { value: "Rejected", label: "Rejected" },
                { value: "Completed", label: "Completed" },
              ]}
              onChange={(v) => {
                setInspectionStatus(v as string)
                setPage(1)
              }}
            />
          </div>
          <div className="min-w-45">
            <Dropdown
              id="state-filter"
              value={selectedState}
              placeholder="All States"
              buttonClassName="py-3 rounded-xl"
              options={stateOptions}
              onChange={(v) => {
                setSelectedState(v as string)
                setPage(1)
              }}
            />
          </div>
          <div className="min-w-45">
            <Dropdown
              id="sort-filter"
              value={sort}
              buttonClassName="py-3 rounded-xl"
              options={SORT_OPTIONS}
              onChange={(v) => {
                setSort(v as string)
                setPage(1)
              }}
            />
          </div>
        </div>
      </div>

      {/* Clear-filters action (vendor count summary intentionally omitted) */}
      {hasActiveFilters && (
        <div className="mb-4 flex items-center justify-end gap-4 flex-wrap">
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-brand-500/10 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 outline-none"
          >
            <X className="w-3.5 h-3.5 text-white" />
            Clear Filters
          </button>
        </div>
      )}

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

      {/* Skeleton on initial load — mirrors the data-grid table layout below */}
      {loading && vendors.length === 0 && !error && (
        <div className="overflow-x-auto bg-white border border-slate-200/80 rounded-2xl shadow-xs scrollbar-none mb-6">
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50">
              <TableRow className="!bg-brand-500/[0.06] hover:!bg-brand-500/[0.06]">
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-5 text-[10px] uppercase tracking-wider">Vendor</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Contact Person</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Contact Info</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Location</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Scheduled</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Inspection Status</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-5 text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="hover:!bg-transparent">
                  {/* Vendor */}
                  <TableCell className="py-4 px-5 align-middle">
                    <div className="space-y-2">
                      <div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse" />
                      <div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </TableCell>
                  {/* Contact Person */}
                  <TableCell className="py-4 px-4 align-middle">
                    <div className="h-3.5 w-24 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  {/* Contact Info */}
                  <TableCell className="py-4 px-4 align-middle">
                    <div className="space-y-2">
                      <div className="h-3 w-36 bg-slate-200 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </TableCell>
                  {/* Location */}
                  <TableCell className="py-4 px-4 align-middle">
                    <div className="h-3.5 w-20 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  {/* Assigned Date */}
                  <TableCell className="py-4 px-4 align-middle">
                    <div className="h-3.5 w-16 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  {/* Inspection Status */}
                  <TableCell className="py-4 px-4 align-middle">
                    <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
                  </TableCell>
                  {/* Status */}
                  <TableCell className="py-4 px-4 align-middle">
                    <div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse" />
                  </TableCell>
                  {/* Actions */}
                  <TableCell className="py-4 px-5 align-middle">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-7 w-7 bg-slate-200 rounded-lg animate-pulse" />
                      <div className="h-7 w-16 bg-slate-200 rounded-lg animate-pulse" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Vendor Listing - Modern Enterprise Data Grid */}
      {!error && filteredVendors.length > 0 && (
        <div className="overflow-x-auto bg-white border border-slate-200/80 rounded-2xl shadow-xs scrollbar-none mb-6">
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50">
              <TableRow className="!bg-brand-500/[0.06] hover:!bg-brand-500/[0.06]">
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-5 text-[10px] uppercase tracking-wider">Vendor</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Contact Person</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Contact Info</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Location</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Scheduled</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Inspection Status</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-bold !text-brand-500/60 h-12 py-3 px-5 text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => {
                const isSelected = selectedVendor === vendor.id
                // A checker-rejected inspection ('Rejected' + Under Review by
                // Admin) is submitted work like 'Submitted' — the checker
                // can't start again unless the admin orders a re-inspection
                // (which resets inspectionStatus to 'Pending').
                const isInspectionDone =
                  vendor.inspectionStatus === 'Completed' ||
                  vendor.inspectionStatus === 'Submitted' ||
                  vendor.inspectionStatus === 'Rejected' ||
                  vendor.status === 'Approved' ||
                  vendor.status === 'Rejected'
                const isAwaitingAdmin =
                  vendor.status === 'Under Review by Admin' ||
                  vendor.status === 'Re-Inspection Under Review by Admin'
                return (
                  <TableRow
                    key={vendor.id}
                    onClick={() => handleViewDetails(vendor)}
                    className={`cursor-pointer transition-all duration-150 group select-none hover:bg-slate-50/40 ${
                      isSelected
                        ? "bg-brand-50/10 hover:bg-brand-50/20"
                        : ""
                    }`}
                  >
                    {/* Vendor Column */}
                    <TableCell className="py-4 px-5 align-middle">
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-brand-500 transition-colors text-sm leading-tight">
                          {vendor.name}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wider">
                          VND-{vendor.id.substring(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </TableCell>

                    {/* Contact Person Column */}
                    <TableCell className="py-4 px-4 align-middle font-semibold text-slate-700 text-sm">
                      {vendor.contactPerson?.name || "Not Provided"}
                    </TableCell>

                    {/* Contact Info Column */}
                    <TableCell className="py-4 px-4 align-middle text-sm">
                      <div className="space-y-0.5">
                        <p className="text-slate-600 font-medium truncate max-w-48">
                          {vendor.contactPerson?.email || "No Email"}
                        </p>
                        <p className="text-slate-400 font-medium truncate">
                          {vendor.contactPerson?.phone || "No Phone"}
                        </p>
                      </div>
                    </TableCell>

                    {/* Location Column */}
                    <TableCell className="py-4 px-4 align-middle text-sm font-semibold text-slate-600">
                      {vendor.location}
                    </TableCell>

                    {/* Assigned Date Column */}
                    <TableCell className="py-4 px-4 align-middle text-sm font-semibold text-slate-600">
                      {vendor.assignedDate || "N/A"}
                    </TableCell>

                    {/* Inspection Status Column */}
                    <TableCell className="py-4 px-4 align-middle">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getInspectionStatusColor(vendor.inspectionStatus)}`}>
                        {vendor.inspectionStatus || "Pending"}
                      </span>
                    </TableCell>

                    {/* Status Column */}
                    <TableCell className="py-4 px-4 align-middle">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusColor(vendor.status)}`}>
                        {vendor.status}
                      </span>
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell className="py-4 px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(vendor)}
                          aria-label={`View details for ${vendor.name}`}
                          className="p-1.5 text-slate-500 hover:text-brand-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartInspection(vendor)}
                          disabled={isInspectionDone}
                          aria-label={`Start inspection for ${vendor.name}`}
                          title={
                            isInspectionDone
                              ? isAwaitingAdmin
                                ? "Inspection already submitted — awaiting admin review."
                                : "Inspection has already been completed for this vendor."
                              : undefined
                          }
                          className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shadow-brand-500/10 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          Start Inspect
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredVendors.length === 0 && (
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
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-150 shadow-xs shadow-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
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
            className={`min-w-9 px-3 py-2 rounded-lg border font-semibold ${
              p === page
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
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
