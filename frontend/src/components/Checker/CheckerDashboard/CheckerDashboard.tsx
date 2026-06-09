"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp, Clock, CheckCircle2, AlertCircle, Calendar, CalendarDays, Factory, Package } from "lucide-react"
import StatCard from "@/components/Checker/CheckerDashboard/StatCard"
import InspectionForm from "@/components/Checker/Vendor/InspectionForm"
import { qcCheckerService } from "@/services/qcCheckerService"
import { showErrorToast } from "@/lib/toast-utils"

interface DashboardHomeProps {
  checkerID: string
  onSelectVendor: (vendor: string) => void
}

export default function DashboardHome({ checkerID }: DashboardHomeProps) {
  const router = useRouter()
  const [selectedInspection, setSelectedInspection] = useState<any | null>(null)
  const [showInspectionForm, setShowInspectionForm] = useState(false)
  const [assignedProducts, setAssignedProducts] = useState<any[]>([])
  const [assignedVendors, setAssignedVendors] = useState<any[]>([])
  const [completedInspections, setCompletedInspections] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'vendor' | 'product'>('vendor')
  const [loading, setLoading] = useState(true)

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
  const passedProducts = assignedProducts.filter(p => p.approvalStatus === 'QC_APPROVED' || p.approvalStatus === 'APPROVED').length
  const failedProducts = assignedProducts.filter(p => p.approvalStatus === 'REJECTED').length

  // Vendor inspection counts
  const pendingVendors = assignedVendors.filter(v => v.status === 'UNDER_REVIEW' || v.status === 'PENDING' || v.status === 'REINSPECTION').length
  const passedVendors = completedInspections.filter(i => i.result === 'PASSED').length
  const failedVendors = completedInspections.filter(i => i.result === 'FAILED').length

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
      onClick: () => router.push(activeTab === 'vendor' ? '/checker/dashboard/vendors?status=&inspectionStatus=Pending' : '/checker/dashboard/products?status=PENDING'),
    },
    {
      label: "Completed",
      value: activeTab === 'vendor' ? passedVendors.toString() : passedProducts.toString(),
      icon: CheckCircle2,
      trend: activeTab === 'vendor' ? `${pl(passedVendors, "Vendor")}` : `${pl(passedProducts, "Product")}`,
      color: "emerald" as const,
      onClick: () => router.push(activeTab === 'vendor' ? '/checker/dashboard/vendors?status=&inspectionStatus=Completed' : '/checker/dashboard/products?status=QC_APPROVED'),
    },
    {
      label: "Rejected",
      value: activeTab === 'vendor' ? failedVendors.toString() : failedProducts.toString(),
      icon: AlertCircle,
      trend: activeTab === 'vendor' ? `${pl(failedVendors, "Vendor")}` : `${pl(failedProducts, "Product")}`,
      color: "red" as const,
      onClick: () => router.push(activeTab === 'vendor' ? '/checker/dashboard/vendors?status=Rejected' : '/checker/dashboard/products?status=REJECTED'),
    },
  ]

  const STATUS_LABELS: Record<string, string> = {
    APPROVED: "Approved by Admin",
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
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-slate-100 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded w-48" />
                      <div className="h-3 bg-slate-100 rounded w-24" />
                    </div>
                  </div>
                  <div className="h-6 bg-slate-200 rounded-full w-20" />
                </div>
                <div className="h-9 bg-slate-100 rounded-lg w-full" />
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
            <p className="text-slate-500 text-lg">Welcome back, <span className="font-semibold text-brand-500">{checkerID}</span></p>
          </div>
          <div className="flex items-center gap-2 text-slate-500 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs">
            <Calendar className="w-5 h-5 text-brand-500" />
            <span className="text-sm font-medium">{new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
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
              <div className="text-center py-12 text-slate-400 font-medium">No active assignments found.</div>
            ) : (
              <div className="space-y-6">
                {/* Products Section */}
                {activeTab === 'product' && assignedProducts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="w-4 h-4 text-brand-500" />
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Products</h3>
                      <span className="text-xs text-slate-400 font-medium">({assignedProducts.length})</span>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {[...assignedProducts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((product) => (
                        <div key={product.id} className="border border-slate-200 bg-white rounded-xl p-5 hover:shadow-xs hover:border-slate-300 transition-all duration-300">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 bg-brand-50 rounded-xl shrink-0">
                                <Package className="w-5 h-5 text-brand-500" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-slate-900 text-sm truncate">{product.name}</h4>
                                <p className="text-xs text-slate-400 mt-0.5">SKU: {product.baseSku}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 self-start sm:self-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(product.approvalStatus)}`}>
                                {formatStatus(product.approvalStatus)}
                              </span>
                              <p className="text-xs font-medium text-slate-500">{product.vendor?.companyName}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => window.location.href = `/checker/dashboard/products?view=detail&id=${product.id}`}
                            className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors duration-200 shadow-sm shadow-brand-500/10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                          >
                            Go to Product
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vendors Section */}
                {activeTab === 'vendor' && assignedVendors.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Factory className="w-4 h-4 text-brand-500" />
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendors</h3>
                      <span className="text-xs text-slate-400 font-medium">({assignedVendors.length})</span>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {[...assignedVendors].sort((a, b) => new Date(b.createdAt || b.submittedAt || 0).getTime() - new Date(a.createdAt || a.submittedAt || 0).getTime()).map((vendor) => (
                        <div key={vendor.id} className="border border-slate-200 bg-white rounded-xl p-5 hover:shadow-xs hover:border-slate-300 transition-all duration-300">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 bg-brand-50 rounded-xl shrink-0">
                                <Factory className="w-5 h-5 text-brand-500" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-slate-900 text-sm truncate">{vendor.companyName}</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Factory Onboarding</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(vendor.status)}`}>
                              {formatStatus(vendor.status)}
                            </span>
                          </div>
                          <button
                            onClick={() => window.location.href = `/checker/dashboard/vendors?view=detail&vendorId=${vendor.id}`}
                            className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors duration-200 shadow-sm shadow-brand-500/10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                          >
                            Go to Vendor
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}