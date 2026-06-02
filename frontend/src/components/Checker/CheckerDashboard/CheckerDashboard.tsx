"use client"

import { useState, useEffect } from "react"
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
    },
    {
      label: "Pending Action",
      value: activeTab === 'vendor' ? pendingVendors.toString() : pendingProducts.toString(),
      icon: Clock,
      trend: activeTab === 'vendor' ? `${pl(pendingVendors, "Vendor")}` : `${pl(pendingProducts, "Product")}`,
      color: "amber" as const,
    },
    {
      label: "Passed",
      value: activeTab === 'vendor' ? passedVendors.toString() : passedProducts.toString(),
      icon: CheckCircle2,
      trend: activeTab === 'vendor' ? `${pl(passedVendors, "Vendor")}` : `${pl(passedProducts, "Product")}`,
      color: "emerald" as const,
    },
    {
      label: "Rejected",
      value: activeTab === 'vendor' ? failedVendors.toString() : failedProducts.toString(),
      icon: AlertCircle,
      trend: activeTab === 'vendor' ? `${pl(failedVendors, "Vendor")}` : `${pl(failedProducts, "Product")}`,
      color: "red" as const,
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
    <div className="p-8 font-sans">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
            <p className="text-slate-600 text-lg">Welcome back, <span className="font-semibold text-blue-600">{checkerID}</span></p>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">{new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 border-b border-slate-200 mb-8">
        <button
          onClick={() => setActiveTab('vendor')}
          className={`pb-4 px-2 text-sm font-semibold transition-colors relative ${activeTab === 'vendor' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4" />
            Vendor Inspection
          </div>
          {activeTab === 'vendor' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('product')}
          className={`pb-4 px-2 text-sm font-semibold transition-colors relative ${activeTab === 'product' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Product Inspection
          </div>
          {activeTab === 'product' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
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
        {/* Scheduled Inspections */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/60 bg-linear-to-r from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Recent Assignments</h2>
                  <p className="text-sm text-slate-600">
                    {activeTab === 'vendor' ? 'Vendors awaiting action' : 'Products awaiting action'}
                  </p>
                </div>
              </div>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                {activeTab === 'vendor' ? assignedVendors.length : assignedProducts.length} total
              </span>
            </div>
          </div>

          <div className="p-6">
            {(activeTab === 'vendor' ? assignedVendors.length : assignedProducts.length) === 0 ? (
              <div className="text-center py-8 text-slate-500">No active assignments found.</div>
            ) : (
              <div className="space-y-6">
                {/* Products Section */}
                {activeTab === 'product' && assignedProducts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Products</h3>
                      <span className="text-xs text-slate-400 font-medium">({assignedProducts.length})</span>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {[...assignedProducts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((product) => (
                        <div key={product.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                                <Package className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-slate-900 text-sm truncate">{product.name}</h4>
                                <p className="text-xs text-slate-500">SKU: {product.baseSku}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(product.approvalStatus)}`}>
                                {formatStatus(product.approvalStatus)}
                              </span>
                              <p className="text-xs text-slate-500 hidden sm:block">{product.vendor?.companyName}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => window.location.href = '/checker/dashboard/products'}
                            className="w-full bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                          >
                            Go to Products
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vendors Section */}
                {activeTab === 'vendor' && assignedVendors.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Factory className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Vendors</h3>
                      <span className="text-xs text-slate-400 font-medium">({assignedVendors.length})</span>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {[...assignedVendors].sort((a, b) => new Date(b.createdAt || b.submittedAt || 0).getTime() - new Date(a.createdAt || a.submittedAt || 0).getTime()).map((vendor) => (
                        <div key={vendor.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
                                <Factory className="w-4 h-4 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-slate-900 text-sm truncate">{vendor.companyName}</h4>
                                <p className="text-xs text-slate-500">Factory Onboarding</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ml-3 ${getStatusBadge(vendor.status)}`}>
                              {formatStatus(vendor.status)}
                            </span>
                          </div>
                          <button
                            onClick={() => window.location.href = '/checker/dashboard/vendors'}
                            className="w-full bg-emerald-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                          >
                            Go to Vendors
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