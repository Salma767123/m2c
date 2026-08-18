"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp, Clock, CheckCircle2, AlertCircle, Calendar, CalendarDays, Factory, Package } from "lucide-react"
import StatCard from "@/components/Checker/CheckerDashboard/StatCard"
import InspectionForm from "@/components/Checker/Vendor/InspectionForm"
import { qcCheckerService } from "@/services/qcCheckerService"
import { showErrorToast } from "@/lib/toast-utils"
import { vendorInspectionStatusOf } from "@/lib/checkerVendorStatus"

interface DashboardHomeProps {
  checkerID: string
  checkerName?: string
  onSelectVendor: (vendor: string) => void
}

// Keep vendor status display in sync with the Vendor module (VendorList /
// VendorDetail). The raw DB status (UNDER_REVIEW / PENDING / ...) is mapped to
// the same human-facing label + colour the vendor pages show, derived from the
// vendor's latest inspection.
const VENDOR_MAIN_STATUS_COLORS: Record<string, string> = {
  "New Assignment": "bg-blue-50 text-blue-700 border-blue-200",
  "Under Review by Admin": "bg-orange-50 text-orange-700 border-orange-200",
  "Re-Inspection": "bg-purple-50 text-purple-700 border-purple-200",
  "Re-Inspection Under Review by Admin": "bg-amber-50 text-amber-700 border-amber-200",
  "Re-Inspection Under Review": "bg-amber-50 text-amber-700 border-amber-200",
  "Approved": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Rejected": "bg-red-50 text-red-700 border-red-200",
}

function getVendorMainStatus(
  dbStatus: string,
  latestInspection?: { status?: string | null; result?: string | null; cycleNumber?: number | null } | null
): string {
  const status = dbStatus?.toUpperCase() || 'PENDING'
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  if (status === 'REINSPECTION') return 'Re-Inspection'
  if (status === 'UNDER_REVIEW') {
    if (latestInspection) {
      const inspStatus = latestInspection.status?.toUpperCase()
      const cycle = latestInspection.cycleNumber ?? 1
      if (inspStatus === 'SCHEDULED' || inspStatus === 'IN_PROGRESS') {
        return cycle > 1 ? 'Re-Inspection' : 'New Assignment'
      }
      if (inspStatus === 'SUBMITTED' || inspStatus === 'UNDER_ADMIN_REVIEW') {
        return cycle > 1 ? 'Re-Inspection Under Review by Admin' : 'Under Review by Admin'
      }
    }
    return 'Under Review by Admin'
  }
  if (status === 'PENDING') return 'New Assignment'
  return status.replace(/_/g, " ").toLowerCase()
}

// Sortable timestamp for a vendor's inspection window: the latest inspection's
// scheduledDate (YYYY-MM-DD) + scheduledTime (e.g. "08:16 AM"). Falls back to the
// assignment/submission time when no inspection is scheduled yet.
function scheduledMs(vendor: any): number {
  const insp = vendor?.inspections?.[0]
  if (insp?.scheduledDate) {
    const t = new Date(`${insp.scheduledDate} ${insp.scheduledTime || '00:00'}`).getTime()
    if (!isNaN(t)) return t
    const d = new Date(insp.scheduledDate).getTime()
    if (!isNaN(d)) return d
  }
  return new Date(vendor?.assignedQcAt || vendor?.submittedAt || 0).getTime()
}

// "2026-09-15" → "15 Sep 2026" (parsed as local midnight to avoid TZ date shifts).
function formatSchedDate(ymd?: string): string {
  if (!ymd) return ''
  const d = new Date(`${ymd}T00:00:00`)
  if (isNaN(d.getTime())) return ymd
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const getVendorStatusBadge = (status: string) =>
  `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${VENDOR_MAIN_STATUS_COLORS[status] || "bg-amber-50 text-amber-700 border-amber-200"}`

export default function DashboardHome({ checkerID, checkerName }: DashboardHomeProps) {
  const router = useRouter()
  const [selectedInspection, setSelectedInspection] = useState<any | null>(null)
  const [showInspectionForm, setShowInspectionForm] = useState(false)
  const [assignedProducts, setAssignedProducts] = useState<any[]>([])
  const [assignedVendors, setAssignedVendors] = useState<any[]>([])
  const [completedInspections, setCompletedInspections] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'vendor' | 'product'>('vendor')
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const [productsRes, vendorsRes, inspectionsRes] = await Promise.all([
          qcCheckerService.getAssignedProducts({ limit: 50 }),
          qcCheckerService.getAssignedVendors({ limit: 50 }),
          qcCheckerService.getInspections({ limit: 50, status: 'COMPLETED' }),
        ])

        if (productsRes.success) {
          setAssignedProducts((productsRes.data?.products ?? []) as unknown as typeof assignedProducts)
        }
        if (vendorsRes.success) {
          setAssignedVendors(vendorsRes.data?.vendors ?? [])
        }
        if (inspectionsRes.success) {
          setCompletedInspections(inspectionsRes.inspections ?? [])
        }
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error)
        showErrorToast("Load Failed", "Could not fetch dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Product counts
  const pendingProducts = assignedProducts.filter(p =>
    p.approvalStatus === 'PENDING' || p.approvalStatus === 'REINSPECTION'
  ).length
  // "Completed" from the checker's view = they finished & submitted the inspection.
  // QC_SUBMITTED (awaiting the admin's decision) counts here, alongside the admin's
  // later QC_APPROVED/APPROVED outcomes.
  const passedProducts = assignedProducts.filter(p => p.approvalStatus === 'QC_SUBMITTED' || p.approvalStatus === 'QC_APPROVED' || p.approvalStatus === 'APPROVED').length
  const failedProducts = assignedProducts.filter(p => p.approvalStatus === 'REJECTED').length

  // Vendor inspection counts — derived from the SAME assigned-vendor list, using the
  // SAME status logic the Vendors page filters on (lib/checkerVendorStatus). So each
  // card's number equals exactly the rows its filter shows, and the three are mutually
  // exclusive (they no longer come from a separate "completed inspections" fetch).
  const pendingVendors = assignedVendors.filter(v => vendorInspectionStatusOf(v) === 'Pending').length
  const passedVendors = assignedVendors.filter(v => vendorInspectionStatusOf(v) === 'Completed').length
  const failedVendors = assignedVendors.filter(v => vendorInspectionStatusOf(v) === 'Rejected').length

  const pl = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

  const stats = [
    {
      label: "Total Assignments",
      value: activeTab === 'vendor' ? assignedVendors.length.toString() : assignedProducts.length.toString(),
      icon: TrendingUp,
      trend: activeTab === 'vendor' ? `${pl(assignedVendors.length, "Vendor")}` : `${pl(assignedProducts.length, "Product")}`,
      color: "blue" as const,
      onClick: () => router.push(activeTab === 'vendor' ? '/checker/dashboard/vendors' : '/checker/dashboard/products'),
    },
    {
      label: "Pending Action",
      value: activeTab === 'vendor' ? pendingVendors.toString() : pendingProducts.toString(),
      icon: Clock,
      trend: activeTab === 'vendor' ? `${pl(pendingVendors, "Vendor")}` : `${pl(pendingProducts, "Product")}`,
      color: "amber" as const,
      onClick: () => router.push(activeTab === 'vendor' ? '/checker/dashboard/vendors?status=&inspectionStatus=Pending' : '/checker/dashboard/products?status=PENDING,REINSPECTION'),
    },
    {
      label: "Completed",
      value: activeTab === 'vendor' ? passedVendors.toString() : passedProducts.toString(),
      icon: CheckCircle2,
      trend: activeTab === 'vendor' ? `${pl(passedVendors, "Vendor")}` : `${pl(passedProducts, "Product")}`,
      color: "emerald" as const,
      onClick: () => router.push(activeTab === 'vendor' ? '/checker/dashboard/vendors?status=&inspectionStatus=Completed' : '/checker/dashboard/products?status=QC_SUBMITTED,QC_APPROVED,APPROVED'),
    },
    {
      label: "Rejected",
      value: activeTab === 'vendor' ? failedVendors.toString() : failedProducts.toString(),
      icon: AlertCircle,
      trend: activeTab === 'vendor' ? `${pl(failedVendors, "Vendor")}` : `${pl(failedProducts, "Product")}`,
      color: "red" as const,
      onClick: () => router.push(activeTab === 'vendor' ? '/checker/dashboard/vendors?status=&inspectionStatus=Rejected' : '/checker/dashboard/products?status=REJECTED'),
    },
  ]

  const STATUS_LABELS: Record<string, string> = {
    APPROVED: "Approved by Admin",
    QC_SUBMITTED: "Submitted",
    QC_APPROVED: "Approved by QC",
    REJECTED: "Rejected",
    REINSPECTION: "Reinspection",
    PENDING: "Pending",
    UNDER_REVIEW: "Under Review by Admin",
    SUSPENDED: "Suspended",
  }

  const formatStatus = (status: string) => STATUS_LABELS[status] || status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())

  const getStatusBadge = (status: string) => {
    const badgeClasses = {
      APPROVED: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200",
      QC_SUBMITTED: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200",
      QC_APPROVED: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200",
      REJECTED: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200",
      REINSPECTION: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200",
      PENDING: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200",
      UNDER_REVIEW: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200",
    }
    return badgeClasses[status as keyof typeof badgeClasses] || badgeClasses.PENDING
  }

  const handleCompleteInspection = () => {
    setShowInspectionForm(false)
    setSelectedInspection(null)
  }

  if (loading) {
    return (
      <div className="p-8 font-sans animate-pulse">
        {/* Header skeleton */}
        <div className="mb-8 flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-9 bg-slate-200 rounded w-56" />
            <div className="h-5 bg-slate-100 rounded w-40" />
          </div>
          <div className="h-4 bg-slate-100 rounded w-48" />
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-28" />
                  <div className="h-8 bg-slate-200 rounded w-16" />
                </div>
                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
              </div>
              <div className="h-4 bg-slate-100 rounded w-36" />
            </div>
          ))}
        </div>

        {/* Recent Assignments skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-lg" />
              <div className="space-y-2">
                <div className="h-5 bg-slate-200 rounded w-44" />
                <div className="h-3 bg-slate-100 rounded w-56" />
              </div>
            </div>
            <div className="h-6 bg-slate-200 rounded-full w-16" />
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border border-slate-100 rounded-xl p-4 space-y-3 flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg shrink-0" />
                  <div className="h-3 bg-slate-100 rounded w-20" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                </div>
                <div className="h-5 bg-slate-100 rounded-full w-24" />
                <div className="h-3 bg-slate-100 rounded w-20" />
                <div className="h-8 bg-slate-200 rounded-lg w-full mt-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show inspection form if user started an inspection
  if (showInspectionForm && selectedInspection) {
    return (
      <InspectionForm
        vendorName={selectedInspection.vendor?.name || selectedInspection.vendor?.companyName || "Vendor"}
        onComplete={handleCompleteInspection}
      />
    )
  }
  return (
    <div className="p-8 font-sans bg-[#f7f7f5] min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 text-lg">Welcome back, <span className="font-semibold text-brand-500">{checkerName || checkerID}</span></p>
          </div>
          <div className="flex items-center gap-2 text-slate-500 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs">
            <Calendar className="w-5 h-5 text-brand-500" />
            <span className="text-sm font-medium">
              {now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="text-slate-300 select-none">|</span>
            <Clock className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-medium tabular-nums">
              {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs - Business Type selection chips styling */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('vendor')}
          className={`flex-1 max-w-[240px] p-3.5 border rounded-xl cursor-pointer transition-all duration-200 text-center outline-none flex items-center justify-center gap-3 font-semibold text-sm focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 active:scale-[0.98] ${
            activeTab === 'vendor'
              ? "border-brand-500 bg-brand-50 shadow-sm shadow-brand-500/10 text-brand-700 font-bold"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <Factory className="w-5 h-5" />
          Vendor Inspection
        </button>
        <button
          onClick={() => setActiveTab('product')}
          className={`flex-1 max-w-[240px] p-3.5 border rounded-xl cursor-pointer transition-all duration-200 text-center outline-none flex items-center justify-center gap-3 font-semibold text-sm focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 active:scale-[0.98] ${
            activeTab === 'product'
              ? "border-brand-500 bg-brand-50 shadow-sm shadow-brand-500/10 text-brand-700 font-bold"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <Package className="w-5 h-5" />
          Product Inspection
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        {/* Scheduled Inspections Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="px-6 py-5 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-50 rounded-xl">
                  <CalendarDays className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recent Assignments</h2>
                  <p className="text-sm text-slate-500">
                    {activeTab === 'vendor' ? 'Vendors awaiting action' : 'Products awaiting action'}
                  </p>
                </div>
              </div>
              <span className="bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                {activeTab === 'vendor' ? assignedVendors.length : assignedProducts.length} total
              </span>
            </div>
          </div>

          <div className="p-6">
            {(activeTab === 'vendor' ? assignedVendors.length : assignedProducts.length) === 0 ? (
              <div className="text-center py-16 text-slate-400 font-medium">No active assignments found.</div>
            ) : activeTab === 'product' ? (
              /* ── Product grid ─────────────────────────────────────────────── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...assignedProducts]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 8)
                  .map((product) => (
                    <div
                      key={product.id}
                      className="flex flex-col border border-slate-200 bg-white rounded-xl p-4 hover:shadow-sm hover:border-brand-200 transition-all duration-200"
                    >
                      {/* Type chip */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-brand-50 rounded-lg shrink-0">
                          <Package className="w-4 h-4 text-brand-500" />
                        </div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Product</span>
                      </div>

                      {/* Name + meta */}
                      <h4 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-1">
                        {product.name}
                      </h4>
                      {product.vendor?.companyName && (
                        <p className="text-xs text-slate-500 mb-3 truncate">{product.vendor.companyName}</p>
                      )}

                      {/* Spacer pushes badge + date + button to bottom */}
                      <div className="flex-1" />

                      {/* Status badge */}
                      <span className={`self-start mb-2 ${getStatusBadge(product.approvalStatus)}`}>
                        {formatStatus(product.approvalStatus)}
                      </span>

                      {/* Inspection scheduled date + time (the booked window) —
                          shown the same way as vendor inspections. */}
                      {product.qcAssignment?.scheduledDate ? (
                        <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 shrink-0" />
                          <span>Scheduled {formatSchedDate(product.qcAssignment.scheduledDate)}{product.qcAssignment.scheduledTime ? ` · ${product.qcAssignment.scheduledTime}` : ''}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 shrink-0" />
                          <span>Not scheduled yet</span>
                        </p>
                      )}

                      {/* Primary action */}
                      <button
                        onClick={() => window.location.href = `/checker/dashboard/products?view=detail&id=${product.id}`}
                        className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors duration-150 text-xs outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      >
                        Go to Product →
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              /* ── Vendor grid ──────────────────────────────────────────────── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...assignedVendors]
                  // Order by the inspection's scheduled date/time (soonest/most recent
                  // first), then show at most 8. This is the booked inspection window
                  // (scheduledDate + scheduledTime), not the vendor's join date.
                  .sort((a, b) => scheduledMs(b) - scheduledMs(a))
                  .slice(0, 8)
                  .map((vendor) => {
                    const vendorStatus = getVendorMainStatus(vendor.status, vendor.inspections?.[0] ?? null)
                    const latestInsp = vendor.inspections?.[0]
                    const schedDate = latestInsp?.scheduledDate as string | undefined
                    const schedTime = latestInsp?.scheduledTime as string | undefined
                    return (
                      <div
                        key={vendor.id}
                        className="flex flex-col border border-slate-200 bg-white rounded-xl p-4 hover:shadow-sm hover:border-brand-200 transition-all duration-200"
                      >
                        {/* Type chip */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-brand-50 rounded-lg shrink-0">
                            <Factory className="w-4 h-4 text-brand-500" />
                          </div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Vendor</span>
                        </div>

                        {/* Name + type */}
                        <h4 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-1">
                          {vendor.companyName}
                        </h4>
                        <p className="text-xs text-slate-400 mb-3">Factory Onboarding</p>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Status badge */}
                        <span className={`self-start mb-2 ${getVendorStatusBadge(vendorStatus)}`}>
                          {vendorStatus}
                        </span>

                        {/* Inspection scheduled date + time (the booked window) */}
                        {schedDate ? (
                          <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 shrink-0" />
                            <span>Scheduled {formatSchedDate(schedDate)}{schedTime ? ` · ${schedTime}` : ''}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 shrink-0" />
                            <span>Not scheduled yet</span>
                          </p>
                        )}

                        {/* Primary action */}
                        <button
                          onClick={() => window.location.href = `/checker/dashboard/vendors?view=detail&vendorId=${vendor.id}`}
                          className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors duration-150 text-xs outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                        >
                          Go to Vendor →
                        </button>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}