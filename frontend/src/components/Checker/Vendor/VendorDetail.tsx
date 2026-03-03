"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Factory,
  User,
  Phone,
  Mail,
  Package,
  AlertTriangle,
  CheckCircle,
  Play,
  FileText,
  TrendingUp,
  BarChart3,
  ThumbsUp,
  ThumbsDown
} from "lucide-react"
import { Vendor } from "@/types/inspection"
import qcCheckerService from "@/services/qcCheckerService"
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils"

interface VendorDetailProps {
  vendor: Vendor
  onBack: () => void
  onStartInspection: (vendor: Vendor) => void
}

export default function VendorDetail({
  vendor,
  onBack,
  onStartInspection
}: VendorDetailProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isProcessing, setIsProcessing] = useState(false)
  const isActionable = vendor.status === 'review' || vendor.status === 'pending'
  const [inspections, setInspections] = useState<any[]>([]);

  // Fetch true inspections instead of using mock upcoming
  useEffect(() => {
    async function loadInspections() {
      try {
        const response = await qcCheckerService.getInspections();
        if (response.success) {
          // Filter to just this vendor
          setInspections(response.inspections.filter((i: any) => i.vendorId === vendor.id));
        }
      } catch (err) {
        console.error("Failed to load inspections", err);
      }
    }
    loadInspections();
  }, [vendor.id]);

  // Mock detailed vendor data - extending the vendor object with additional data
  const vendorDetails = {
    ...vendor,
    fullName: vendor.name,
    establishedYear: "1995",
    certifications: ["ISO 9001:2015", "OEKO-TEX Standard 100", "GOTS Certified"],
    specialization: "Premium Cotton Textiles & Sustainable Fabrics",
    capacity: "50,000 units/month",
    recentOrders: [
      {
        id: 1,
        po: "PO-2024-001",
        items: "Cotton T-Shirts",
        quantity: 5000,
        status: "completed",
        date: "2024-01-08",
        result: "passed"
      },
      {
        id: 2,
        po: "PO-2023-089",
        items: "Denim Jeans",
        quantity: 3000,
        status: "completed",
        date: "2023-12-15",
        result: "passed"
      },
      {
        id: 3,
        po: "PO-2023-078",
        items: "Polo Shirts",
        quantity: 2500,
        status: "completed",
        date: "2023-11-20",
        result: "failed"
      }
    ],
  }

  // Use state instead of mock upcoming items
  const actualUpcomingInspections = inspections.filter(i => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS');

  const handleStartInspection = async (inspectionId: string) => {
    setIsProcessing(true);
    try {
      await qcCheckerService.startInspection(inspectionId);
      showSuccessToast("Inspection Started", "The inspection status is now In Progress");
      // Ideally redirect to the specific inspection panel here
    } catch (error) {
      showErrorToast("Error", "Failed to start inspection. Ensure it has not been completed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-emerald-100 text-emerald-800 border-emerald-200",
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      review: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-slate-100 text-slate-800 border-slate-200",
      passed: "bg-emerald-100 text-emerald-800 border-emerald-200",
      failed: "bg-red-100 text-red-800 border-red-200"
    }
    return colors[status as keyof typeof colors] || colors.active
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-amber-100 text-amber-800 border-amber-200",
      low: "bg-green-100 text-green-800 border-green-200"
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'Inspection History' },
    { id: 'upcoming', label: 'Upcoming Inspections' },
    { id: 'performance', label: 'Performance' }
  ]

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
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">Vendor Details</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(vendor.status)}`}>
                {vendor.status.toUpperCase()}
              </span>
            </div>
            <p className="text-slate-600">Comprehensive vendor information and inspection history</p>
          </div>
          <div className="flex gap-2">
            {isActionable && (
              <>
                <button
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      await qcCheckerService.approveVendor(vendor.id);
                      showSuccessToast("Success", "Vendor Approved successfully");
                      onBack(); // Refresh list ideally, but going back works
                    } catch (e) {
                      showErrorToast("Error", "Failed to approve vendor");
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
                    const reason = window.prompt("Enter Rejection Reason:");
                    if (reason) {
                      setIsProcessing(true);
                      try {
                        await qcCheckerService.rejectVendor(vendor.id, reason);
                        showSuccessToast("Success", "Vendor Rejected successfully");
                        onBack();
                      } catch (e) {
                        showErrorToast("Error", "Failed to reject vendor");
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
              <p className="font-semibold">{vendorDetails.fullName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Location</p>
              <p className="font-semibold">{vendor.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Recent PO</p>
              <p className="font-semibold">{vendor.recentPO}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Pass Rate</p>
              <p className="font-semibold">{vendorDetails.performance.passRate}%</p>
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Company Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Company Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Company Name</label>
                <p className="text-slate-900 font-medium">{vendorDetails.fullName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Established</label>
                <p className="text-slate-900">{vendorDetails.establishedYear}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Specialization</label>
                <p className="text-slate-900">{vendorDetails.specialization}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Production Capacity</label>
                <p className="text-slate-900 font-medium">{vendorDetails.capacity}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Certifications</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {vendorDetails.certifications.map((cert, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-200">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Primary Contact</label>
                <div className="mt-1">
                  <p className="text-slate-900 font-medium">{vendorDetails.contactPerson.name}</p>
                  <p className="text-sm text-slate-600">{vendorDetails.contactPerson.designation}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{vendorDetails.contactPerson.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{vendorDetails.contactPerson.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Factory Details</label>
                <div className="mt-1">
                  <p className="text-slate-900 font-medium">{vendorDetails.factory.name}</p>
                  <p className="text-slate-700 text-sm">{vendorDetails.factory.address}</p>
                  <p className="text-sm text-slate-600 mt-1">Working Hours: {vendorDetails.factory.workingHours}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Inspection History</h3>
          <div className="space-y-4">
            {vendorDetails.recentOrders.map((order) => (
              <div key={order.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                      {order.po}
                    </span>
                    <span className="font-medium text-slate-900">{order.items}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.result)}`}>
                    {order.result.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-600">
                  <span>Quantity: {order.quantity.toLocaleString()} pcs</span>
                  <span>Date: {order.date}</span>
                  <span>Status: {order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'upcoming' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Inspections</h3>
          <div className="space-y-4">
            {actualUpcomingInspections.length > 0 ? actualUpcomingInspections.map((inspection: any) => (
              <div key={inspection.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                      {inspection.poNumber}
                    </span>
                    <span className="font-medium text-slate-900">{inspection.clientName}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(inspection.priority)}`}>
                    {inspection.priority.toUpperCase()}
                  </span>
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
            )) : <p className="text-sm text-slate-500">No pending inspections found.</p>}
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="p-3 bg-blue-100 rounded-lg w-fit mx-auto mb-3">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{vendorDetails.performance.totalInspections}</p>
            <p className="text-sm text-slate-600">Total Inspections</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="p-3 bg-green-100 rounded-lg w-fit mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{vendorDetails.performance.passRate}%</p>
            <p className="text-sm text-slate-600">Pass Rate</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="p-3 bg-amber-100 rounded-lg w-fit mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{vendorDetails.performance.averageScore}/10</p>
            <p className="text-sm text-slate-600">Average Score</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="p-3 bg-purple-100 rounded-lg w-fit mx-auto mb-3">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{vendorDetails.performance.onTimeDelivery}%</p>
            <p className="text-sm text-slate-600">On-Time Delivery</p>
          </div>
        </div>
      )}
    </div>
  )
}