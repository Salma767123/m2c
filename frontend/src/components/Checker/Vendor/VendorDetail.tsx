"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Factory,
  Phone,
  Mail,
  CheckCircle,
  Play,
  TrendingUp,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Globe,
  Briefcase,
  Package,
  Warehouse,
  Award,
  FileText,
  Loader2
} from "lucide-react"
import { Vendor } from "@/types/inspection"
import qcCheckerService from "@/services/qcCheckerService"
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils"

interface VendorDetailProps {
  vendor: Vendor
  onBack: () => void
}

export default function VendorDetail({
  vendor,
  onBack,
}: VendorDetailProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isProcessing, setIsProcessing] = useState(false)
  const currentStatus = (vendor.status || '').toUpperCase()
  const isActionable = currentStatus === 'UNDER_REVIEW' || currentStatus === 'PENDING'
  const [inspections, setInspections] = useState<any[]>([])
  const [fullVendor, setFullVendor] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [recentInspections, setRecentInspections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      setError(null)
      try {
        const [detailsRes, inspectionsRes] = await Promise.all([
          qcCheckerService.getVendorDetails(vendor.id),
          qcCheckerService.getInspections(),
        ])
        if (detailsRes.success) {
          setFullVendor(detailsRes.data.vendor)
          setStats(detailsRes.data.stats)
          setRecentInspections(detailsRes.data.recentInspections || [])
        }
        if (inspectionsRes.success) {
          setInspections(inspectionsRes.inspections.filter((i: any) => i.vendorId === vendor.id))
        }
      } catch (err: any) {
        console.error("Failed to load vendor details", err)
        setError(err?.message || "Failed to load vendor details")
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [vendor.id])

  const actualUpcomingInspections = inspections.filter(
    i => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS'
  )

  const handleStartInspection = async (inspectionId: string) => {
    setIsProcessing(true)
    try {
      await qcCheckerService.startInspection(inspectionId)
      showSuccessToast("Inspection Started", "The inspection status is now In Progress")
    } catch (error) {
      showErrorToast("Error", "Failed to start inspection. Ensure it has not been completed.")
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-800 border-emerald-200",
      approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      review: "bg-blue-100 text-blue-800 border-blue-200",
      under_review: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-slate-100 text-slate-800 border-slate-200",
      passed: "bg-emerald-100 text-emerald-800 border-emerald-200",
      failed: "bg-red-100 text-red-800 border-red-200",
    }
    return colors[status?.toLowerCase()] || colors.active
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-amber-100 text-amber-800 border-amber-200",
      low: "bg-green-100 text-green-800 border-green-200"
    }
    return colors[priority?.toLowerCase()] || colors.medium
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'Inspection History' },
    { id: 'upcoming', label: 'Upcoming Inspections' },
    { id: 'performance', label: 'Performance' }
  ]

  const companyName = fullVendor?.companyName || vendor.name
  const location = fullVendor
    ? [fullVendor.factoryCity, fullVendor.factoryState].filter(Boolean).join(", ") || vendor.location
    : vendor.location
  const specializations: string[] = fullVendor?.specializations || []
  const productCategories: string[] = fullVendor?.productCategories || []
  const certifications: any[] = fullVendor?.certifications || []
  const paymentTerms: string[] = fullVendor?.paymentTerms || []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-600">Loading vendor details...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 font-sans">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-bold text-slate-900">Vendor Details</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(fullVendor?.status || vendor.status)}`}>
                {(fullVendor?.status || vendor.status).toString().replace(/_/g, " ")}
              </span>
              {fullVendor?.assignedQc?.name && (
                <span className="px-3 py-1 rounded-full text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
                  QC: {fullVendor.assignedQc.name}
                </span>
              )}
            </div>
            <p className="text-slate-600">Comprehensive vendor information and inspection history</p>
          </div>
          <div className="flex gap-2">
            {isActionable && (
              <>
                <button
                  onClick={async () => {
                    setIsProcessing(true)
                    try {
                      await qcCheckerService.approveVendor(vendor.id)
                      showSuccessToast("Success", "Vendor Approved successfully")
                      onBack()
                    } catch (e) {
                      showErrorToast("Error", "Failed to approve vendor")
                    } finally { setIsProcessing(false) }
                  }}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={async () => {
                    const reason = window.prompt("Enter Rejection Reason:")
                    if (reason) {
                      setIsProcessing(true)
                      try {
                        await qcCheckerService.rejectVendor(vendor.id, reason)
                        showSuccessToast("Success", "Vendor Rejected successfully")
                        onBack()
                      } catch (e) {
                        showErrorToast("Error", "Failed to reject vendor")
                      } finally { setIsProcessing(false) }
                    }
                  }}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  <ThumbsDown className="w-4 h-4" />
                  Reject
                </button>
              </>
            )}
            {actualUpcomingInspections.length > 0 && (
              <button
                onClick={() => handleStartInspection(actualUpcomingInspections[0].id)}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Start Now ({actualUpcomingInspections[0].poNumber})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Summary Card */}
      <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Vendor</p>
              <p className="font-semibold">{companyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Location</p>
              <p className="font-semibold">{location}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Last PO</p>
              <p className="font-semibold">
                {stats?.lastPoDate ? new Date(stats.lastPoDate).toLocaleDateString() : "No PO yet"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Pass Rate</p>
              <p className="font-semibold">{stats?.passRate ?? 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Information */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" /> Company Information
              </h3>
              <div className="space-y-4">
                <Field label="Company Name" value={companyName} />
                <Field label="Company Type" value={fullVendor?.companyType} />
                <Field label="Vendor Type" value={fullVendor?.vendorType} />
                <Field label="Established" value={fullVendor?.establishedYear?.toString()} />
                <Field label="GST Number" value={fullVendor?.gstNumber} />
                <Field label="Annual Turnover" value={fullVendor?.annualTurnover} />
                {fullVendor?.website && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Website</label>
                    <a
                      href={fullVendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline mt-1"
                    >
                      <Globe className="w-4 h-4" /> {fullVendor.website}
                    </a>
                  </div>
                )}
                {fullVendor?.companyDescription && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Description</label>
                    <p className="text-slate-900 text-sm mt-1">{fullVendor.companyDescription}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" /> Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Primary Contact</label>
                  <div className="mt-1">
                    <p className="text-slate-900 font-medium">{fullVendor?.ownerName || "—"}</p>
                    <p className="text-sm text-slate-600">Owner</p>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
                      {fullVendor?.businessPhone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          <span>{fullVendor.businessPhone}</span>
                        </div>
                      )}
                      {fullVendor?.businessEmail && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          <span>{fullVendor.businessEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {fullVendor?.businessAddress && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Business Address</label>
                    <p className="text-slate-700 text-sm mt-1">
                      {[fullVendor.businessAddress, fullVendor.businessCity, fullVendor.businessState, fullVendor.businessZipCode]
                        .filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}

                {fullVendor?.factoryAddress && (
                  <div>
                    <label className="text-sm font-medium text-slate-600 flex items-center gap-1">
                      <Factory className="w-4 h-4" /> Factory
                    </label>
                    <p className="text-slate-700 text-sm mt-1">
                      {[fullVendor.factoryAddress, fullVendor.factoryCity, fullVendor.factoryState, fullVendor.factoryZipCode]
                        .filter(Boolean).join(", ")}
                    </p>
                    {fullVendor.factorySize && (
                      <p className="text-xs text-slate-500 mt-1">Size: {fullVendor.factorySize}</p>
                    )}
                  </div>
                )}

                {fullVendor?.warehouseAddress && (
                  <div>
                    <label className="text-sm font-medium text-slate-600 flex items-center gap-1">
                      <Warehouse className="w-4 h-4" /> Warehouse
                    </label>
                    <p className="text-slate-700 text-sm mt-1">
                      {[fullVendor.warehouseAddress, fullVendor.warehouseCity, fullVendor.warehouseState]
                        .filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Capabilities & Products
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Production Capacity" value={fullVendor?.productionCapacity} />
              <Field label="Minimum Order Quantity" value={fullVendor?.minimumOrderQuantity} />
              <Field label="Delivery Time" value={fullVendor?.deliveryTime} />
              <Field label="Quality Control" value={fullVendor?.qualityControl} />

              {productCategories.length > 0 && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600">Product Categories</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {productCategories.map((c, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {specializations.length > 0 && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600">Specializations</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {specializations.map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {paymentTerms.length > 0 && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600">Payment Terms</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {paymentTerms.map((t, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full border border-slate-200">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {certifications.length > 0 && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600 flex items-center gap-1">
                    <Award className="w-4 h-4" /> Certifications
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {certifications.map((c: any, i: number) => (
                      <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-200">
                        {c.name}{c.issuedBy ? ` — ${c.issuedBy}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inspection History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Recent Inspection History
          </h3>
          <div className="space-y-4">
            {recentInspections.length > 0 ? recentInspections.map((insp: any) => (
              <div key={insp.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                      {insp.poNumber}
                    </span>
                    <span className="font-medium text-slate-900">{insp.clientName}</span>
                  </div>
                  {insp.result && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(insp.result)}`}>
                      {insp.result.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
                  <span>Scheduled: {insp.scheduledDate}</span>
                  {insp.completedAt && (
                    <span>Completed: {new Date(insp.completedAt).toLocaleDateString()}</span>
                  )}
                  {typeof insp.score === 'number' && (
                    <span>Score: <span className="font-semibold text-slate-900">{insp.score}/10</span></span>
                  )}
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500 text-center py-8">
                No completed inspections yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Inspections */}
      {activeTab === 'upcoming' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Inspections</h3>
          <div className="space-y-4">
            {actualUpcomingInspections.length > 0 ? actualUpcomingInspections.map((inspection: any) => (
              <div key={inspection.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                      {inspection.poNumber}
                    </span>
                    <span className="font-medium text-slate-900">{inspection.clientName}</span>
                  </div>
                  {inspection.priority && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(inspection.priority)}`}>
                      {inspection.priority.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{inspection.scheduledDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{inspection.scheduledTime}</span>
                  </div>
                </div>
              </div>
            )) : <p className="text-sm text-slate-500 text-center py-8">No pending inspections found.</p>}
          </div>
        </div>
      )}

      {/* Performance */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<BarChart3 className="w-6 h-6 text-blue-600" />}
            bg="bg-blue-100"
            value={stats?.totalCompleted ?? 0}
            label="Total Inspections"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6 text-green-600" />}
            bg="bg-green-100"
            value={`${stats?.passRate ?? 0}%`}
            label="Pass Rate"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6 text-amber-600" />}
            bg="bg-amber-100"
            value={`${stats?.averageScore ?? 0}/10`}
            label="Average Score"
          />
          <StatCard
            icon={<Clock className="w-6 h-6 text-purple-600" />}
            bg="bg-purple-100"
            value={`${stats?.onTimeDelivery ?? 0}%`}
            label="On-Time Delivery"
          />
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <p className="text-slate-900">{value}</p>
    </div>
  )
}

function StatCard({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: React.ReactNode; label: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
      <div className={`p-3 ${bg} rounded-lg w-fit mx-auto mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  )
}
