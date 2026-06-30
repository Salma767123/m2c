'use client'

import { useRef, useState, useEffect } from 'react'
import { Building2, MapPin, Phone, Mail, User, ChevronDown, Calendar, Info } from 'lucide-react'

const READONLY_CLS =
  'w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 cursor-not-allowed text-sm'
const EDITABLE_CLS =
  'w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all duration-200 text-sm bg-white'
const ERROR_CLS =
  'w-full px-4 py-3 border border-red-500 rounded-xl bg-red-50/40 focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all duration-200 text-sm'

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1.5 text-xs text-red-600">{message}</p> : null

const SERVICE_TYPES = [
  'Pre-Shipment Inspection',
  'During Production Inspection',
  'Pre-Production Inspection',
  'Container Loading Supervision',
  'Factory Audit',
  'Product Testing',
]

function InfoBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-900 font-medium">{value || '—'}</p>
    </div>
  )
}

interface Props {
  formData: {
    serviceStartDate: string
    serviceType: string
    vendorData: any
    productData: any
  }
  setFormData: (d: any) => void
  errors?: Record<string, string>
}

export default function PI_Step1_GeneralInfo({ formData, setFormData, errors = {} }: Props) {
  const v = formData.vendorData || {}
  const p = formData.productData || {}

  // Resolve the mainContact object (Step 7 of vendor registration)
  const mc = v.mainContact && typeof v.mainContact === 'object' ? v.mainContact : null
  const contactFullName = mc
    ? [mc.title, mc.firstName, mc.middleName, mc.lastName].filter(Boolean).join(' ') || mc.name || ''
    : [v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName].filter(Boolean).join(' ') || v.ownerName || ''

  const [showServiceTypeDropdown, setShowServiceTypeDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showServiceTypeDropdown) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowServiceTypeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showServiceTypeDropdown])

  const factoryAddress = [v.factoryAddress, v.factoryCity, v.factoryState, v.factoryZipCode, v.factoryCountry]
    .filter(Boolean).join(', ')
  const warehouseAddress = [v.warehouseAddress, v.warehouseCity, v.warehouseState]
    .filter(Boolean).join(', ')

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">General Information</h2>
        <p className="text-slate-500 text-sm">Vendor registration data and inspection context for this product audit.</p>
      </div>

      {/* ── Company Information Card ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-800">Company Information</h3>
          <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">From Vendor Registration</span>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <InfoBlock label="Company Name" value={v.companyName} />
          <InfoBlock label="Business Type" value={v.businessType} />
          <InfoBlock label="Primary Phone" value={v.businessPhone} />
          <InfoBlock label="Secondary Phone" value={v.phoneNumber2} />
          <InfoBlock label="Primary Email" value={v.businessEmail} />
        </div>
      </div>

      {/* ── Addresses ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-800">Factory Address</h3>
          </div>
          <div className="p-5">
            {factoryAddress ? (
              <p className="text-sm text-slate-900">{factoryAddress}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Not provided</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-800">Warehouse Address</h3>
          </div>
          <div className="p-5">
            {warehouseAddress ? (
              <p className="text-sm text-slate-900">{warehouseAddress}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Not provided</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Contact ──────────────────────────────────────────────── */}
      {(mc || v.ownerName || v.ownerFirstName) && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-800">Main Contact Person</h3>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <InfoBlock label="Full Name" value={contactFullName} />
            <InfoBlock label="Designation" value={mc ? mc.customDesignation || mc.designation : v.designation} />
            <InfoBlock label="Department" value={mc ? mc.customDepartment || mc.department : undefined} />
            <InfoBlock label="Primary Phone" value={mc ? mc.phone1 || mc.phone : v.ownerPhone} />
            <InfoBlock label="Secondary Phone" value={mc ? mc.phone2 : v.ownerPhone2} />
            <InfoBlock label="Primary Email" value={mc ? mc.email1 || mc.email : v.ownerEmail} />
            <InfoBlock label="Secondary Email" value={mc ? mc.email2 : v.ownerEmail2} />
          </div>
        </div>
      )}

      {/* ── Inspection Details ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-800">Inspection Details</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inspection Date — read-only, auto-populated */}
          <div>
            <label className="block text-slate-700 font-semibold mb-2 text-sm">
              Inspection Date
            </label>
            <input
              type="date"
              value={formData.serviceStartDate}
              readOnly
              aria-readonly="true"
              className={READONLY_CLS}
            />
            <p className="mt-1.5 text-xs text-slate-400">Auto-populated from today's date.</p>
          </div>

          {/* Service Type — editable dropdown */}
          <div>
            <label className="block text-slate-700 font-semibold mb-2 text-sm">
              Service Type <span className="text-red-500">*</span>
            </label>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowServiceTypeDropdown(!showServiceTypeDropdown)}
                className={`w-full px-4 py-3 border rounded-xl bg-white text-left flex items-center justify-between text-sm transition-all duration-200 ${
                  errors.serviceType
                    ? 'border-red-500 bg-red-50/40 focus:ring-2 focus:ring-red-500/40'
                    : 'border-slate-300 focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 hover:border-slate-400'
                }`}
              >
                <span className="text-slate-900">{formData.serviceType}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${showServiceTypeDropdown ? 'rotate-180' : ''}`}
                />
              </button>
              {showServiceTypeDropdown && (
                <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg">
                  <div className="py-1 max-h-52 overflow-y-auto">
                    {SERVICE_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, serviceType: type })
                          setShowServiceTypeDropdown(false)
                        }}
                        className={`block w-full px-4 py-3 text-sm text-left transition-colors ${
                          formData.serviceType === type
                            ? 'bg-brand-50 text-brand-600 font-semibold border-l-2 border-brand-500'
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
            <FieldError message={errors.serviceType} />
          </div>
        </div>
      </div>

      {/* ── Product being inspected ───────────────────────────────────── */}
      {p && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-800">Product Being Inspected</h3>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            <InfoBlock label="Product Name" value={p.name} />
            <InfoBlock label="Category" value={p.category} />
            <InfoBlock label="Sub-Category" value={p.subCategory} />
          </div>
        </div>
      )}
    </div>
  )
}
