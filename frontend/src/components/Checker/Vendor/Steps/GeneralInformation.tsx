"use client"

import { CheckCircle, ChevronDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"

// Visual marker for required fields — keeps the Product Inspection labels
// consistent with the Vendor Inspection's RequiredMark helper.
const Req = () => <span className="text-red-500 ml-0.5" aria-label="required">*</span>

interface GeneralInformationProps {
  formData: {
    client: string
    vendor: string
    factory: string
    serviceLocation: string
    serviceStartDate: string
    serviceType: string
  }
  setFormData: (data: any) => void
  // Captured by parent at autofill time so lock state is stable across
  // typing and step remounts. Missing snapshot → every field editable.
  autofillSnapshot?: Record<string, boolean>
}

const READONLY_CLS =
  "w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-100 text-slate-700 cursor-not-allowed"
const EDITABLE_CLS =
  "w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"

export default function GeneralInformation({ formData, setFormData, autofillSnapshot = {} }: GeneralInformationProps) {
  const clientLocked = !!autofillSnapshot.client
  const vendorLocked = !!autofillSnapshot.vendor
  const factoryLocked = !!autofillSnapshot.factory
  const serviceLocationLocked = !!autofillSnapshot.serviceLocation

  const [showServiceTypeDropdown, setShowServiceTypeDropdown] = useState(false)
  const serviceTypeDropdownRef = useRef<HTMLDivElement>(null)

  const serviceTypes = [
    "Pre-Shipment Inspection",
    "During Production Inspection",
    "Pre-Production Inspection",
    "Container Loading Supervision",
    "Factory Audit",
    "Product Testing"
  ]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceTypeDropdownRef.current && !serviceTypeDropdownRef.current.contains(event.target as Node)) {
        setShowServiceTypeDropdown(false)
      }
    }

    if (showServiceTypeDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showServiceTypeDropdown])
  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">General Information</h2>
        <p className="text-slate-600">
          Basic information about the vendor, client, and service details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-slate-700 font-semibold mb-3 text-sm">Client:<Req /></label>
          <input
            type="text"
            value={formData.client}
            readOnly={clientLocked}
            aria-readonly={clientLocked || undefined}
            onChange={(e) => !clientLocked && setFormData({ ...formData, client: e.target.value })}
            placeholder="Enter client name"
            className={clientLocked ? READONLY_CLS : EDITABLE_CLS}
          />
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-3 text-sm">Vendor:<Req /></label>
          <input
            type="text"
            value={formData.vendor}
            readOnly={vendorLocked}
            aria-readonly={vendorLocked || undefined}
            onChange={(e) => !vendorLocked && setFormData({ ...formData, vendor: e.target.value })}
            className={vendorLocked ? READONLY_CLS : EDITABLE_CLS}
          />
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-3 text-sm">Factory:<Req /></label>
          <input
            type="text"
            value={formData.factory}
            readOnly={factoryLocked}
            aria-readonly={factoryLocked || undefined}
            onChange={(e) => !factoryLocked && setFormData({ ...formData, factory: e.target.value })}
            placeholder="Enter factory name"
            className={factoryLocked ? READONLY_CLS : EDITABLE_CLS}
          />
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-3 text-sm">Service Location:<Req /></label>
          <input
            type="text"
            value={formData.serviceLocation}
            readOnly={serviceLocationLocked}
            aria-readonly={serviceLocationLocked || undefined}
            onChange={(e) => !serviceLocationLocked && setFormData({ ...formData, serviceLocation: e.target.value })}
            placeholder="Enter service location"
            className={serviceLocationLocked ? READONLY_CLS : EDITABLE_CLS}
          />
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-3 text-sm">Service Start Date:<Req /></label>
          <input
            type="date"
            value={formData.serviceStartDate}
            onChange={(e) => setFormData({ ...formData, serviceStartDate: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          />
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-3 text-sm">Service Type:<Req /></label>
          <div ref={serviceTypeDropdownRef} className="relative">
            <button
              onClick={() => setShowServiceTypeDropdown(!showServiceTypeDropdown)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-left flex items-center justify-between hover:border-slate-400"
            >
              <span className="text-slate-900">{formData.serviceType}</span>
              <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${showServiceTypeDropdown ? 'transform rotate-180' : ''}`} />
            </button>
            {showServiceTypeDropdown && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-slate-300 rounded-xl shadow-lg">
                <div className="py-1 max-h-48 overflow-y-auto">
                  {serviceTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setFormData({ ...formData, serviceType: type })
                        setShowServiceTypeDropdown(false)
                      }}
                      className={`block w-full px-4 py-3 text-sm text-left transition-colors duration-150 ${
                        formData.serviceType === type
                          ? 'bg-blue-50 text-blue-600 font-medium border-l-2 border-blue-600'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Information Note</h3>
            <p className="text-blue-800 text-sm">
              Please ensure all general information is accurate as it will be included in the final inspection report. 
              This information helps identify the service scope and parties involved in the quality control process.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}