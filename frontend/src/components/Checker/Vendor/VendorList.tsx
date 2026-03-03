"use client"

import { useState } from "react"
import { Search, Factory, MapPin, Calendar, ArrowRight, Eye } from "lucide-react"
import InspectionForm from "@/components/Checker/Vendor/InspectionForm"
import VendorDetail from "@/components/Checker/Vendor/VendorDetail"
import { vendors } from "@/data/inspectionData"
import { Vendor } from "@/types/inspection"

interface VendorsPageProps {
  selectedVendor: string | null
  onVendorSelect: (vendor: string | null) => void
}

import qcCheckerService from "@/services/qcCheckerService"
import { useEffect } from "react"

export default function VendorsPage({ selectedVendor, onVendorSelect }: VendorsPageProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [inProgressInspection, setInProgressInspection] = useState(false)
  const [showVendorDetail, setShowVendorDetail] = useState(false)
  const [selectedVendorData, setSelectedVendorData] = useState<Vendor | null>(null)
  const [assignedVendors, setAssignedVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true)
        const response = await qcCheckerService.getAssignedVendors()
        if (response.success) {
          const formattedVendors = response.data.map((v: any) => ({
            id: v.id,
            name: v.companyName,
            location: `${v.factoryCity || "Unknown City"}, ${v.factoryState || "Unknown State"}`,
            recentPO: v.submittedAt ? new Date(v.submittedAt).toLocaleDateString() : "N/A",
            status: v.status.toLowerCase() === 'under_review' ? 'review' : v.status.toLowerCase(),
            contactPerson: {
              name: v.ownerName,
              designation: "Owner",
              phone: v.businessPhone,
              email: v.businessEmail,
            },
            factory: {
              name: v.companyName,
              address: v.factoryAddress,
              manager: "N/A",
              managerPhone: "N/A",
              workingHours: "N/A"
            },
            performance: {
              totalInspections: 0,
              passRate: 0,
              averageScore: 0,
              onTimeDelivery: 0
            }
          }))
          setAssignedVendors(formattedVendors)
        }
      } catch (error) {
        console.error("Failed to fetch assigned vendors:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVendors()
  }, [])

  const filteredVendors = assignedVendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.location.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-emerald-100 text-emerald-800 border-emerald-200",
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      review: "bg-blue-100 text-blue-800 border-blue-200",
    }
    return colors[status as keyof typeof colors] || colors.active
  }

  const handleCompleteInspection = () => {
    setInProgressInspection(false)
    setSelectedVendorData(null)
    onVendorSelect(null)
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

  if (inProgressInspection && selectedVendorData) {
    return (
      <InspectionForm
        vendorId={selectedVendorData.id}
        vendorName={selectedVendorData.name}
        onComplete={handleCompleteInspection}
      />
    )
  }

  // Show vendor detail if user clicked "View Details"
  if (showVendorDetail && selectedVendorData) {
    return (
      <VendorDetail
        vendor={selectedVendorData}
        onBack={handleBackToList}
        onStartInspection={handleStartInspection}
      />
    )
  }

  return (
    <div className="min-h-screen p-8 font-sans flex flex-col">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Vendor Management</h1>
        <p className="text-slate-600 text-lg">Select a vendor to start quality inspection</p>
      </div>

      {/* Search */}
      <div className="mb-8 relative max-w-md">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search vendors by name or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
        />
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1">
        {filteredVendors.map((vendor) => (
          <div
            key={vendor.id}
            className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${selectedVendor === vendor.id
              ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30"
              : "border-slate-200/60 hover:border-blue-300"
              }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Factory className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{vendor.name}</h3>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(vendor.status)}`}>
                  {vendor.status}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{vendor.location}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded border">
                    Joined: {vendor.recentPO}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleViewDetails(vendor)
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Details
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartInspection(vendor)
                  }}
                  className="flex-1 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold py-2 px-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group text-sm"
                >
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  Start
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-slate-100 p-6 rounded-2xl inline-block mb-4">
            <Factory className="w-16 h-16 text-slate-400 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No vendors found</h3>
          <p className="text-slate-600">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  )
}
