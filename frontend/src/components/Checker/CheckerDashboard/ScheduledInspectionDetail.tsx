"use client"

import { useState } from "react"
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
  Camera
} from "lucide-react"
import { ScheduledInspection } from "@/types/inspection"

interface ScheduledInspectionDetailProps {
  inspection: ScheduledInspection
  onBack: () => void
  onStartInspection: (inspection: ScheduledInspection) => void
}

export default function ScheduledInspectionDetail({ 
  inspection, 
  onBack, 
  onStartInspection 
}: ScheduledInspectionDetailProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-amber-100 text-amber-800 border-amber-200",
      low: "bg-green-100 text-green-800 border-green-200"
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const getDocumentStatusColor = (status: string) => {
    const colors = {
      received: "bg-green-100 text-green-800",
      pending: "bg-amber-100 text-amber-800",
      "not-required": "bg-slate-100 text-slate-600"
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'items', label: 'Items to Inspect' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'documents', label: 'Documents' }
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
              <h1 className="text-3xl font-bold text-slate-900">Scheduled Inspection</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(inspection.priority)}`}>
                {inspection.priority.toUpperCase()} PRIORITY
              </span>
            </div>
            <p className="text-slate-600">Inspection details and preparation</p>
          </div>
          <button
            onClick={() => onStartInspection(inspection)}
            className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Play className="w-4 h-4" />
            Start Inspection
          </button>
        </div>
      </div>

      {/* Inspection Summary Card */}
      <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Vendor</p>
              <p className="font-semibold">{inspection.vendor.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Scheduled Date</p>
              <p className="font-semibold">{formatDate(inspection.scheduledDate)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Time & Duration</p>
              <p className="font-semibold">{inspection.scheduledTime} ({inspection.estimatedDuration})</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Location</p>
              <p className="font-semibold">{inspection.vendor.location}</p>
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
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
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
          {/* Client Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Client Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Client Name</label>
                <p className="text-slate-900 font-medium">{inspection.client}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">PO Number</label>
                <p className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 inline-block">
                  {inspection.po}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Contact Person</label>
                <div className="mt-1">
                  <p className="text-slate-900 font-medium">{inspection.vendor.contactPerson?.name ?? "—"}</p>
                  <p className="text-sm text-slate-600">{inspection.vendor.contactPerson?.designation ?? "—"}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                    {inspection.vendor.contactPerson?.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <span>{inspection.vendor.contactPerson.phone}</span>
                      </div>
                    )}
                    {inspection.vendor.contactPerson?.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        <span>{inspection.vendor.contactPerson.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Factory Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Factory Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Factory Name</label>
                <p className="text-slate-900 font-medium">{inspection.vendor.factory?.name ?? "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Address</label>
                <p className="text-slate-700">{inspection.vendor.factory?.address ?? "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Factory Manager</label>
                <div className="mt-1">
                  <p className="text-slate-900 font-medium">{inspection.vendor.factory?.manager ?? "—"}</p>
                  {inspection.vendor.factory?.managerPhone && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span>{inspection.vendor.factory.managerPhone}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Working Hours</label>
                <p className="text-slate-700">{inspection.vendor.factory?.workingHours ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="space-y-6">
          {inspection.items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{item.itemName}</h3>
                  <p className="text-slate-600 mt-1">{item.description}</p>
                </div>
                {/* Quantities / specs / AQL are optional — assignments only
                    carry the category since the hardcoded placeholder values
                    (0 / TBD / Standard QC / 2.5) were removed from creation.
                    Older records that still have them render as before. */}
                {item.aqlLevel && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                    AQL {item.aqlLevel}
                  </span>
                )}
              </div>

              {(item.quantity != null || item.inspectionQuantity != null) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {item.quantity != null && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Total Quantity</label>
                      <p className="text-slate-900 font-semibold">{item.quantity.toLocaleString()} pcs</p>
                    </div>
                  )}
                  {item.inspectionQuantity != null && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Inspection Quantity</label>
                      <p className="text-slate-900 font-semibold">{item.inspectionQuantity} pcs</p>
                    </div>
                  )}
                  {Number(item.inspectionQuantity) > 0 && Number(item.quantity) > 0 && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Sample Size</label>
                      <p className="text-slate-900 font-semibold">{Math.round((Number(item.inspectionQuantity) / Number(item.quantity)) * 100)}%</p>
                    </div>
                  )}
                </div>
              )}

              {item.specifications && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Specifications</label>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg mt-1">{item.specifications}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'requirements' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Inspection Requirements</h3>
          <div className="space-y-3">
            {inspection.requirements.map((requirement, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <span className="text-slate-700">{requirement}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Required Documents</h3>
          <div className="space-y-3">
            {inspection.documents.map((document, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-900 font-medium">{document.name}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getDocumentStatusColor(document.status)}`}>
                  {document.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          
          {inspection.documents.some(doc => doc.status === 'pending') && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Action Required</span>
              </div>
              <p className="text-amber-700 text-sm mt-1">
                Some documents are still pending. Please ensure all required documents are available before starting the inspection.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}