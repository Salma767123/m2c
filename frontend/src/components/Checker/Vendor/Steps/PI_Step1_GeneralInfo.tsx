'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Building2, MapPin, Phone, Mail, User, ChevronDown, Calendar, Info, Eye, X } from 'lucide-react'

const READONLY_CLS =
  'w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 cursor-not-allowed text-sm'
const EDITABLE_CLS =
  'w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all duration-200 text-sm bg-white'
const ERROR_CLS =
  'w-full px-4 py-3 border border-red-500 rounded-xl bg-red-50/40 focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all duration-200 text-sm'

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1.5 text-xs text-red-600">{message}</p> : null

// Mirrors the vendor registration form's business-type labels so the checker
// sees "Private Limited Company" rather than the raw "pvt-ltd" value.
export function getBusinessTypeLabel(val?: string) {
  const map: Record<string, string> = {
    'proprietorship': 'Proprietorship',
    'pvt-ltd': 'Private Limited Company',
    'partnership-firm': 'Partnership Firm',
    'llp': 'Limited Liability Partnership (LLP)',
    'unregistered': 'Unregistered',
  }
  return val ? (map[val] || val) : val
}

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
  const contactFullName =
    [mc?.title, mc?.firstName, mc?.middleName, mc?.lastName].filter(Boolean).join(' ') ||
    mc?.name ||
    v.ownerName ||
    ''

  const [viewingImage, setViewingImage] = useState<{ url: string; label: string } | null>(null)
  const [showServiceTypeDropdown, setShowServiceTypeDropdown] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const serviceTypeBtnRef = useRef<HTMLButtonElement | null>(null)
  const serviceTypeMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!showServiceTypeDropdown) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (!serviceTypeBtnRef.current?.contains(t) && !serviceTypeMenuRef.current?.contains(t)) {
        setShowServiceTypeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showServiceTypeDropdown])

  useEffect(() => {
    if (!showServiceTypeDropdown || !serviceTypeBtnRef.current) return
    const rect = serviceTypeBtnRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    const close = () => setShowServiceTypeDropdown(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [showServiceTypeDropdown])

  const factoryAddress = [v.factoryAddress, v.addressLine2, v.addressLine3, v.landmark, v.factoryCity, v.factoryState, v.factoryZipCode, v.factoryCountry]
    .filter(Boolean).join(', ')
  const warehouseAddress = [v.warehouseAddress, v.warehouseAddressLine2, v.warehouseAddressLine3, v.warehouseLandmark, v.warehouseCity, v.warehouseState, v.warehouseZipCode, v.warehouseCountry]
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
          <InfoBlock label="Business Type" value={getBusinessTypeLabel(v.businessType)} />
          <InfoBlock label="Primary Phone" value={v.businessPhone} />
          {v.phoneNumber2 && <InfoBlock label="Secondary Phone" value={v.phoneNumber2} />}
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
          <div className="p-5 space-y-5">
            {/* Photo + Name header */}
            <div className="flex items-center gap-4">
              {mc?.photo ? (
                <button
                  type="button"
                  onClick={() => setViewingImage({ url: mc.photo, label: contactFullName || 'Profile Photo' })}
                  className="relative flex-shrink-0 group"
                  aria-label="View profile photo"
                >
                  <img
                    src={mc.photo}
                    alt={contactFullName || 'Profile Photo'}
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 group-hover:border-brand-400 transition-colors"
                  />
                  <span className="absolute inset-0 rounded-full bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </button>
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-7 h-7 text-slate-400" />
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-slate-900">{contactFullName || '—'}</p>
                {(mc?.customDesignation || mc?.designation || v.designation) && (
                  <p className="text-xs text-slate-500 mt-0.5">{mc?.customDesignation || mc?.designation || v.designation}</p>
                )}
              </div>
            </div>
            {/* Fields grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Always chain through mc fields first, then fall back to top-level vendor
                  owner fields so vendors who only partially completed Step 7 still show
                  data that was captured in earlier registration steps. */}
              <InfoBlock label="Designation" value={mc?.customDesignation || mc?.designation || v.designation} />
              <InfoBlock label="Department" value={mc?.customDepartment || mc?.department} />
              <InfoBlock label="Primary Phone" value={mc?.phone1 || mc?.phone || v.ownerPhone} />
              {(mc?.phone2 || v.ownerPhone2) && <InfoBlock label="Secondary Phone" value={mc?.phone2 || v.ownerPhone2} />}
              <InfoBlock label="Primary Email" value={mc?.email1 || mc?.email || v.ownerEmail} />
              {(mc?.email2 || v.ownerEmail2) && <InfoBlock label="Secondary Email" value={mc?.email2 || v.ownerEmail2} />}
            </div>
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

          {/* Service Type — editable dropdown (portal to escape overflow-hidden) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-2 text-sm">
              Service Type <span className="text-red-500">*</span>
            </label>
            <button
              ref={serviceTypeBtnRef}
              type="button"
              onClick={() => setShowServiceTypeDropdown(!showServiceTypeDropdown)}
              className={`w-full px-4 py-3 border rounded-xl bg-white text-left flex items-center justify-between text-sm transition-all duration-200 ${
                errors.serviceType
                  ? 'border-red-500 bg-red-50/40'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <span className="text-slate-900">{formData.serviceType}</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${showServiceTypeDropdown ? 'rotate-180' : ''}`}
              />
            </button>
            {showServiceTypeDropdown && dropdownPos && typeof document !== 'undefined' && createPortal(
              <div
                ref={serviceTypeMenuRef}
                style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
                className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
              >
                <div className="py-1 max-h-60 overflow-y-auto">
                  {SERVICE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFormData((prev: any) => ({ ...prev, serviceType: type }))
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
              </div>,
              document.body
            )}
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
          </div>
        </div>
      )}

      {/* ── Image viewer lightbox ────────────────────────────────────────── */}
      {viewingImage && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/85 backdrop-blur-sm p-4"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative max-w-lg w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute -top-4 -right-4 w-9 h-9 bg-white rounded-full shadow-xl flex items-center justify-center z-10 hover:bg-slate-50 transition-colors"
              aria-label="Close viewer"
            >
              <X className="w-4 h-4 text-slate-700" />
            </button>
            <img
              src={viewingImage.url}
              alt={viewingImage.label}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
            />
            <p className="text-white/80 text-sm mt-3 text-center">{viewingImage.label}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
