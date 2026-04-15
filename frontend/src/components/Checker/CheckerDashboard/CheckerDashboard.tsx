"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Clock, CheckCircle2, AlertCircle, BarChart3, Calendar, CalendarDays, MapPin, Factory, Eye, ArrowRight, Package } from "lucide-react"
import StatCard from "@/components/Checker/CheckerDashboard/StatCard"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/UI/Table"
import ScheduledInspectionDetail from "@/components/Checker/CheckerDashboard/ScheduledInspectionDetail"
import InspectionForm from "@/components/Checker/Vendor/InspectionForm"
import { qcCheckerService } from "@/services/qcCheckerService"
import { showErrorToast } from "@/lib/toast-utils"

interface DashboardHomeProps {
  checkerID: string
  onSelectVendor: (vendor: string) => void
}

export default function DashboardHome({ checkerID }: DashboardHomeProps) {
  const [selectedInspection, setSelectedInspection] = useState<any | null>(null)
  const [showInspectionDetail, setShowInspectionDetail] = useState(false)
  const [showInspectionForm, setShowInspectionForm] = useState(false)
  const [assignedProducts, setAssignedProducts] = useState<any[]>([])
  const [assignedVendors, setAssignedVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const [productsRes, vendorsRes] = await Promise.all([
          qcCheckerService.getAssignedProducts({ limit: 50 }),
          qcCheckerService.getAssignedVendors({ limit: 50 })
        ])

        if (productsRes.success) {
          setAssignedProducts((productsRes.data?.products ?? []) as unknown as typeof assignedProducts)
        }
        if (vendorsRes.success) {
          setAssignedVendors(vendorsRes.data?.vendors ?? [])
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

  const pendingCount = assignedProducts.filter(p =>
    p.approvalStatus === 'PENDING' || p.approvalStatus === 'REINSPECTION' || p.approvalStatus === 'UNDER_REVIEW'
  ).length + assignedVendors.filter(v => v.status === 'UNDER_REVIEW' || v.status === 'PENDING').length

  const passedCount = assignedProducts.filter(p => p.approvalStatus === 'QC_APPROVED' || p.approvalStatus === 'APPROVED').length
  const failedCount = assignedProducts.filter(p => p.approvalStatus === 'REJECTED').length

  const stats = [
    {
      label: "Total Assignments",
      value: (assignedProducts.length + assignedVendors.length).toString(),
      icon: TrendingUp,
      trend: "Products and Vendors",
      color: "blue" as const,
    },
    {
      label: "Pending Action",
      value: pendingCount.toString(),
      icon: Clock,
      trend: "Awaiting inspection",
      color: "amber" as const,
    },
    {
      label: "QC Approved",
      value: passedCount.toString(),
      icon: CheckCircle2,
      trend: "Passed inspection",
      color: "emerald" as const,
    },
    {
      label: "Rejected",
      value: failedCount.toString(),
      icon: AlertCircle,
      trend: "Failed quality check",
      color: "red" as const,
    },
  ]

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

  const handleBackToDashboard = () => {
    setShowInspectionDetail(false)
    setShowInspectionForm(false)
    setSelectedInspection(null)
  }

  const handleCompleteInspection = () => {
    setShowInspectionForm(false)
    setShowInspectionDetail(false)
    setSelectedInspection(null)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your summary...</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
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
                  <p className="text-sm text-slate-600">Products and Vendors awaiting action</p>
                </div>
              </div>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                {assignedProducts.length + assignedVendors.length} total
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {assignedProducts.length === 0 && assignedVendors.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No active assignments found.</div>
              ) : (
                <>
                  {assignedProducts.map((product) => (
                    <div key={product.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <Package className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 text-sm">{product.name}</h3>
                              <p className="text-xs text-slate-600">SKU: {product.baseSku}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(product.approvalStatus)}`}>
                            {product.approvalStatus}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-500">{product.vendor?.companyName}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => window.location.href = '/checker/dashboard/products'}
                          className="flex-1 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold py-2 px-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group text-sm"
                        >
                          Go to Products
                        </button>
                      </div>
                    </div>
                  ))}
                  {assignedVendors.map((vendor) => (
                    <div key={vendor.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                              <Factory className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 text-sm">{vendor.companyName}</h3>
                              <p className="text-xs text-slate-600">Factory Onboarding</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(vendor.status)}`}>
                            {vendor.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => window.location.href = '/checker/dashboard/vendors'}
                          className="flex-1 bg-linear-to-r from-emerald-600 to-emerald-700 text-white font-semibold py-2 px-3 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group text-sm"
                        >
                          Go to Vendors
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Overview */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/60 bg-linear-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Summary Statistics</h2>
                  <p className="text-sm text-slate-600">Current inspection overview</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <BarChart3 className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Live Updates</h3>
                <p className="text-slate-600 max-w-xs">Your dashboard reflects real-time assignments from the administrators.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}