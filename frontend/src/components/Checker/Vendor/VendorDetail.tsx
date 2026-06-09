"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
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
  BarChart3,
  Globe,
  Briefcase,
  Package,
  Warehouse,
  Award,
  FileText,
  Loader2,
  RotateCw,
  UserCircle,
  Tags,
  Building2,
  ShieldCheck,
} from "lucide-react"
import { Vendor } from "@/types/inspection"
import qcCheckerService from "@/services/qcCheckerService"
const MAIN_STATUS_COLORS: Record<string, string> = {
  "New Assignment": "bg-blue-50 text-blue-700 border-blue-200/85",
  "Under Review by Admin": "bg-orange-50 text-orange-700 border-orange-200/85",
  "Re-Inspection": "bg-purple-50 text-purple-700 border-purple-200/85",
  "Re-Inspection Under Review by Admin": "bg-amber-50 text-amber-700 border-amber-200/85",
  "Re-Inspection Under Review": "bg-amber-50 text-amber-700 border-amber-200/85",
  "Approved": "bg-emerald-50 text-emerald-700 border-emerald-200/85",
  "Rejected": "bg-red-50 text-red-700 border-red-200/85",
}

const INSPECTION_STATUS_COLORS: Record<string, string> = {
  "Pending": "bg-slate-50 text-slate-700 border-slate-200/85",
  "Submitted": "bg-blue-50 text-blue-700 border-blue-200/85",
  "Rejected": "bg-red-50 text-red-700 border-red-200/85",
  "Completed": "bg-emerald-50 text-emerald-700 border-emerald-200/85",
}

function getNewMainStatus(dbStatus: string, latestInspection?: { status?: string | null; result?: string | null; cycleNumber?: number | null } | null): string {
  const status = dbStatus?.toUpperCase() || 'PENDING'
  if (status === 'APPROVED') {
    return 'Approved'
  }
  if (status === 'REJECTED') {
    return 'Rejected'
  }
  if (status === 'REINSPECTION') {
    return 'Re-Inspection'
  }
  if (status === 'UNDER_REVIEW') {
    if (latestInspection) {
      const inspStatus = latestInspection.status?.toUpperCase()
      const cycle = latestInspection.cycleNumber ?? 1
      if (inspStatus === 'SCHEDULED' || inspStatus === 'IN_PROGRESS') {
        if (cycle > 1) {
          return 'Re-Inspection'
        }
        return 'New Assignment'
      }
      if (inspStatus === 'SUBMITTED' || inspStatus === 'UNDER_ADMIN_REVIEW') {
        if (cycle > 1) {
          return 'Re-Inspection Under Review by Admin'
        }
        return 'Under Review by Admin'
      }
    }
    return 'Under Review by Admin'
  }
  if (status === 'PENDING') {
    return 'New Assignment'
  }
  return status.replace(/_/g, " ").toLowerCase()
}

function getNewInspectionStatus(dbStatus: string, latestInspection?: { status?: string | null; result?: string | null } | null): string {
  const status = dbStatus?.toUpperCase() || 'PENDING'
  if (status === 'APPROVED') {
    return 'Completed'
  }
  if (status === 'REJECTED') {
    if (latestInspection && latestInspection.result?.toUpperCase() === 'FAILED') {
      return 'Rejected'
    }
    return 'Completed'
  }
  if (status === 'REINSPECTION') {
    return 'Pending'
  }
  if (status === 'UNDER_REVIEW') {
    if (latestInspection) {
      const inspStatus = latestInspection.status?.toUpperCase()
      if (inspStatus === 'SCHEDULED' || inspStatus === 'IN_PROGRESS') {
        return 'Pending'
      }
      if (inspStatus === 'SUBMITTED' || inspStatus === 'UNDER_ADMIN_REVIEW') {
        if (latestInspection.result?.toUpperCase() === 'FAILED') {
          return 'Rejected'
        }
        return 'Submitted'
      }
    }
    return 'Pending'
  }
  if (status === 'PENDING') {
    return 'Pending'
  }
  return 'Pending'
}

interface VendorDetailProps {
  vendor: Vendor
  onBack: () => void
  onStartInspection?: (vendor: Vendor) => void
}

export default function VendorDetail({
  vendor,
  onBack,
  onStartInspection,
}: VendorDetailProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [inspections, setInspections] = useState<any[]>([])
  const [fullVendor, setFullVendor] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [recentInspections, setRecentInspections] = useState<any[]>([])
  const [historyMeta, setHistoryMeta] = useState<{ total: number; returned: number; hasMore: boolean } | null>(null)
  const [historyLimit, setHistoryLimit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async (limitOverride?: number) => {
    setLoading(true)
    setError(null)
    const limit = limitOverride ?? historyLimit
    try {
      const detailsRes = await qcCheckerService.getVendorDetails(vendor.id, limit)
      if (detailsRes.success) {
        setFullVendor(detailsRes.data.vendor)
        setStats(detailsRes.data.stats)
        setRecentInspections(detailsRes.data.recentInspections || [])
        setInspections(detailsRes.data.upcomingInspections || [])
        if (detailsRes.data.recentInspectionsMeta) {
          setHistoryMeta(detailsRes.data.recentInspectionsMeta)
        }
      }
    } catch (err: any) {
      console.error("Failed to load vendor details", err)
      setError(err?.message || "Failed to load vendor details")
    } finally {
      setLoading(false)
    }
  }, [vendor.id, historyLimit])

  const handleLoadMoreHistory = () => {
    const nextLimit = Math.min(historyLimit + 20, 50)
    setHistoryLimit(nextLimit)
    loadAll(nextLimit)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor.id])

  const actualUpcomingInspections = inspections.filter(
    i => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS'
  )

  const latestInspection = inspections.length > 0 ? inspections[0] : (recentInspections.length > 0 ? recentInspections[0] : null)
  const currentMainStatus = fullVendor ? getNewMainStatus(fullVendor.status, latestInspection) : vendor.status
  const currentInspectionStatus = fullVendor ? getNewInspectionStatus(fullVendor.status, latestInspection) : vendor.inspectionStatus

  // Once the assignment is completed, the QC checker no longer needs the full
  // vendor profile — only a compact summary + a link to the inspection report.
  const isCompleted = currentInspectionStatus === 'Completed'
  const reportInspectionId = recentInspections[0]?.id ?? null

  // Delegate to the parent, which mounts <InspectionForm />. InspectionForm
  // handles the SCHEDULED → IN_PROGRESS transition itself, so we must NOT call
  // the start API here (calling it on an already IN_PROGRESS inspection 400s).
  const handleOpenInspection = () => {
    if (!onStartInspection) return
    onStartInspection(vendor)
  }

  const firstUpcoming = actualUpcomingInspections[0]
  const isContinuing = firstUpcoming?.status === 'IN_PROGRESS'

  const getStatusColor = (status: string) => {
    return MAIN_STATUS_COLORS[status] || "bg-amber-50 text-amber-700 border-amber-200/85"
  }

  const getInspectionStatusColor = (status?: string | null) => {
    const s = status || "Pending"
    return INSPECTION_STATUS_COLORS[s] || INSPECTION_STATUS_COLORS.Pending
  }

  const getResultColor = (result: string) => {
    if (result?.toUpperCase() === 'PASSED') return "bg-emerald-50 text-emerald-700 border-emerald-200/85"
    if (result?.toUpperCase() === 'FAILED') return "bg-red-50 text-red-700 border-red-200/85"
    return "bg-slate-50 text-slate-700 border-slate-200/85"
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
    { id: 'upcoming', label: 'Upcoming Inspections' }
  ]

  const companyName = fullVendor?.companyName || vendor.name
  const location = fullVendor
    ? formatAddress(fullVendor.factoryCity, fullVendor.factoryState) || vendor.location
    : vendor.location
  const specializations: string[] = fullVendor?.specializations || []
  const productCategories: string[] = fullVendor?.productCategories || []
  const certifications: any[] = fullVendor?.certifications || []
  const paymentTerms: string[] = fullVendor?.paymentTerms || []

  const renderOverviewTab = () => {
    if (!fullVendor) return null

    // Helper to format addresses with city, state, zipCode, country
    const formatAddressHelper = (address?: string, city?: string, state?: string, zipCode?: string, country?: string) => {
      const parts = [address, city, state, zipCode, country].map(p => (p ?? "").toString().trim()).filter(Boolean)
      return parts.length > 0 ? parts.join(", ") : null
    }

    // Helper to determine if an object/array has any active items
    const hasData = (val: any) => {
      if (val === null || val === undefined || val === "") return false
      if (Array.isArray(val)) return val.length > 0
      if (typeof val === 'object') return Object.keys(val).length > 0
      return true
    }

    interface SectionField {
      key: string
      label: string
      type?: string
      valueOverride?: any
      condition?: any
      transform?: (val: any) => any
    }

    // Define the sections and their standard fields
    const sections: Array<{
      id: string
      title: string
      icon: React.ReactNode
      fields: SectionField[]
    }> = [
      {
        id: "company",
        title: "Company Details",
        icon: <Briefcase className="w-5 h-5 text-brand-600" />,
        fields: [
          { key: "companyName", label: "Company Name" },
          { key: "companyType", label: "Company Type", type: "badge" },
          { key: "businessType", label: "Business Type", transform: (val: string) => getBusinessTypeLabel(val) },
          { key: "establishedYear", label: "Year Established" },
          { key: "gstNumber", label: "GST Number" },
          { key: "companyIdNumber", label: getCompanyIdLabel(fullVendor.businessType), condition: fullVendor.companyIdNumber },
          { key: "panNumber", label: "PAN Number" },
          { key: "website", label: "Website", type: "url" },
          { key: "companyDescription", label: "Company Description" }
        ]
      },
      {
        id: "contact",
        title: "Contact Information",
        icon: <Phone className="w-5 h-5 text-brand-600" />,
        fields: [
          { key: "ownerName", label: "Owner Name" },
          { key: "designation", label: "Designation" },
          { key: "businessPhone", label: "Business Phone" },
          { key: "businessEmail", label: "Business Email" },
          { key: "phoneNumber2", label: "Alternate Phone" },
          { key: "businessEmail2", label: "Alternate Email" },
          { key: "landlineNumber", label: "Landline Number" },
          { 
            key: "businessAddress", 
            label: "Business Address", 
            valueOverride: formatAddressHelper(
              fullVendor.businessAddress,
              fullVendor.businessCity,
              fullVendor.businessState,
              fullVendor.businessZipCode,
              fullVendor.businessCountry
            )
          }
        ]
      },
      {
        id: "owner_profile",
        title: "Owner Profile Details",
        icon: <UserCircle className="w-5 h-5 text-brand-600" />,
        fields: [
          { key: "ownerEmail", label: "Owner Email" },
          { key: "ownerEmail2", label: "Owner Email 2" },
          { key: "ownerPhone", label: "Owner Phone" },
          { key: "ownerPhone2", label: "Owner Phone 2" },
          { key: "ownerLandline", label: "Owner Landline" },
          {
            key: "ownerAddress",
            label: "Owner Address",
            valueOverride: formatAddressHelper(
              fullVendor.ownerAddress,
              fullVendor.ownerCity,
              fullVendor.ownerState,
              fullVendor.ownerZipCode,
              fullVendor.ownerCountry
            )
          },
          { key: "businessStartDate", label: "Business Start Date", type: "date" },
          { key: "employeeCount", label: "Employee Count", transform: (val: string) => getEmployeeCountLabel(val) }
        ]
      },
      {
        id: "warehouse",
        title: "Warehouse / Factory Address",
        icon: <Warehouse className="w-5 h-5 text-brand-600" />,
        fields: [
          { key: "ownershipType", label: "Ownership Type", transform: (val: string) => getOwnershipTypeLabel(val) },
          {
            key: "warehouseAddress",
            label: "Warehouse Address",
            valueOverride: formatAddressHelper(
              fullVendor.warehouseAddress,
              fullVendor.warehouseCity,
              fullVendor.warehouseState,
              fullVendor.warehouseZipCode,
              fullVendor.warehouseCountry
            )
          },
          { key: "warehouseSize", label: "Warehouse Size" },
          { key: "storageCapacity", label: "Storage Capacity" },
          { key: "mapLink", label: "Google Maps Link", type: "url" }
        ]
      },
      {
        id: "capabilities",
        title: "Capabilities & Catalogue Focus",
        icon: <Package className="w-5 h-5 text-brand-600" />,
        fields: [
          { key: "vendorType", label: "Vendor Role Type", type: "badge" },
          { key: "productionCapacity", label: "Production Capacity" },
          { key: "minimumOrderQuantity", label: "Minimum Order Quantity" },
          { key: "deliveryTime", label: "Delivery Time" },
          { key: "qualityControl", label: "Quality Control Measures" },
          { key: "productCategories", label: "Product Categories", type: "list" },
          { key: "productTypes", label: "Product Types", type: "list" },
          { key: "specializations", label: "Specializations", type: "list" },
          { key: "categoryRemarks", label: "Category Remarks" }
        ]
      },
      {
        id: "facilities",
        title: "Manufacturing Facilities",
        icon: <Factory className="w-5 h-5 text-brand-600" />,
        fields: [] // Custom rendered
      },
      {
        id: "certifications",
        title: "Certifications & Compliance",
        icon: <Award className="w-5 h-5 text-brand-600" />,
        fields: [
          { key: "complianceStandards", label: "Compliance Standards" },
          { key: "packagingCapabilities", label: "Packaging Capabilities" },
          { key: "logisticsPartners", label: "Logistics Partners" },
          { key: "shippingMethods", label: "Shipping Methods", type: "list" }
        ]
      },
      {
        id: "trade",
        title: "Trade & Regulatory ID Details",
        icon: <FileText className="w-5 h-5 text-brand-600" />,
        fields: [
          { key: "tradeLicenseNumber", label: "Trade License Number" },
          { key: "businessRegistrationNumber", label: "Business Registration Number" },
          { key: "taxIdentificationNumber", label: "Tax Identification Number" }
        ]
      },
      {
        id: "bank",
        title: "Banking Details",
        icon: <Briefcase className="w-5 h-5 text-brand-600" />,
        fields: [] // Custom rendered
      }
    ]

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {sections.map((section) => {
          // 1. Collect standard fields that have data
          const activeFields = section.fields.map(field => {
            const rawVal = field.valueOverride !== undefined ? field.valueOverride : fullVendor[field.key]
            if (!hasData(rawVal)) return null
            if (field.condition === false) return null
            const finalVal = field.transform ? field.transform(rawVal) : rawVal
            return {
              label: field.label,
              value: finalVal,
              type: field.type
            }
          }).filter(Boolean) as Array<{ label: string; value: any; type?: string }>

          // 2. Check for custom section data
          let hasCustomData = false
          let customContent: React.ReactNode = null

          if (section.id === "owner_profile") {
            const additional = fullVendor.additionalOwners
            if (Array.isArray(additional) && additional.length > 0) {
              hasCustomData = true
              customContent = (
                <div className="col-span-full border-t border-slate-100 pt-6 mt-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                    <UserCircle className="w-4.5 h-4.5 text-slate-400" /> Additional Owners ({additional.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {additional.map((owner: any, idx: number) => (
                      <div key={idx} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-bold text-slate-800">Owner {idx + 2}</p>
                        {owner.name && <Field label="Name" value={owner.name} />}
                        {owner.designation && <Field label="Designation" value={owner.designation} />}
                        {owner.email && <Field label="Email" value={owner.email} />}
                        {owner.email2 && <Field label="Secondary Email" value={owner.email2} />}
                        {owner.phone && <Field label="Phone" value={owner.phone} />}
                        {owner.phone2 && <Field label="Secondary Phone" value={owner.phone2} />}
                        {owner.landline && <Field label="Landline" value={owner.landline} />}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          } else if (section.id === "facilities") {
            const hasSpinning = fullVendor.enabledFacilities || fullVendor.facilityDetails
            if (hasSpinning) {
              const enabledList: string[] = []
              const detailsMap = fullVendor.facilityDetails || {}
              const enabledFacilities = fullVendor.enabledFacilities || {}
              
              for (const [fac, enabled] of Object.entries(enabledFacilities)) {
                if (enabled) {
                  const labelMap: Record<string, string> = {
                    spinning: 'Spinning',
                    weaving: 'Weaving',
                    dyeing: 'Dyeing',
                    printing: 'Printing',
                    stitching: 'Stitching',
                    finishing: 'Finishing',
                  }
                  enabledList.push(labelMap[fac] || fac)
                }
              }

              if (enabledList.length > 0 || Object.keys(detailsMap).length > 0) {
                hasCustomData = true
                customContent = (
                  <div className="col-span-full space-y-6">
                    {enabledList.length > 0 && (
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Active Facilities</label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {enabledList.map((f, i) => (
                            <span key={i} className="px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {Object.entries(detailsMap).map(([facilityId, details]: [string, any]) => {
                      if (!enabledFacilities[facilityId]) return null
                      const facilityName = enabledList.find((f) => f.toLowerCase().includes(facilityId)) || facilityId
                      const hasDetailFields = Object.values(details || {}).some(v => v !== null && v !== undefined && v !== "")
                      if (!hasDetailFields) return null

                      return (
                        <div key={facilityId} className="border-l-2 border-brand-500/80 pl-4 py-1 space-y-4">
                          <p className="font-bold text-sm text-slate-800 uppercase tracking-wide">{facilityName} Facility Details</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(details || {}).map(([key, value]: [string, any]) => {
                              if (value === null || value === undefined || value === "") return null
                              const fieldLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
                              return (
                                <div key={key}>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">{fieldLabel}</label>
                                  <p className="text-sm font-semibold text-slate-900">{value.toString()}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            }
          } else if (section.id === "certifications") {
            const certs = fullVendor.certifications || []
            if (certs.length > 0) {
              hasCustomData = true
              customContent = (
                <div className="col-span-full border-t border-slate-100 pt-6 mt-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                    <Award className="w-4.5 h-4.5 text-slate-400" /> Catalog Certifications ({certs.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certs.map((cert: any, idx: number) => {
                      const status = cert.expiryDate ? getCertificateStatus(cert.expiryDate) : null
                      return (
                        <div key={cert.id || idx} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center px-2.5 py-0.5 bg-brand-50 text-brand-700 border border-brand-100 rounded text-xs font-bold">
                              {cert.name}
                            </span>
                            {cert.documentUrl && (
                              <a
                                href={cert.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-brand-600 hover:text-brand-700 hover:underline font-bold flex items-center gap-1"
                              >
                                <FileText className="w-3.5 h-3.5" /> View File
                              </a>
                            )}
                          </div>
                          {cert.issuedBy && <Field label="Issued By" value={cert.issuedBy} />}
                          {cert.certificateNumber && <Field label="Certificate #" value={cert.certificateNumber} />}
                          {cert.expiryDate ? (
                            <div>
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Expiry Date</label>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-semibold text-slate-800">
                                  {new Date(cert.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                                {status && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
                                    {status.message}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">No expiry date set</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }
          } else if (section.id === "trade") {
            const alternate = fullVendor.alternateContacts
            if (Array.isArray(alternate) && alternate.length > 0) {
              hasCustomData = true
              customContent = (
                <div className="col-span-full border-t border-slate-100 pt-6 mt-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                    <UserCircle className="w-4.5 h-4.5 text-slate-400" /> Alternate Contacts ({alternate.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {alternate.map((contact: any, idx: number) => (
                      <div key={idx} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-bold text-slate-800">Contact {idx + 1}</p>
                        {contact.name && <Field label="Name" value={contact.name} />}
                        {(contact.customDesignation || contact.designation) && (
                          <Field label="Designation" value={contact.customDesignation || contact.designation} />
                        )}
                        {(contact.email1 || contact.email) && (
                          <Field label="Email" value={contact.email1 || contact.email} />
                        )}
                        {contact.email2 && <Field label="Secondary Email" value={contact.email2} />}
                        {(contact.phone1 || contact.phone) && (
                          <Field label="Phone" value={contact.phone1 || contact.phone} />
                        )}
                        {contact.phone2 && <Field label="Secondary Phone" value={contact.phone2} />}
                        {contact.landline && <Field label="Landline" value={contact.landline} />}
                        {(contact.customDepartment || contact.department) && (
                          <Field label="Department" value={contact.customDepartment || contact.department} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          } else if (section.id === "bank") {
            const bank = fullVendor.bankDetails
            if (bank && bank.bankName) {
              hasCustomData = true
              customContent = (
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bank.bankName && <Field label="Bank Name" value={bank.bankName} />}
                  {bank.accountNumber && (
                    <Field 
                      label="Account Number" 
                      value={bank.accountNumber.length > 4 ? `**** **** ${bank.accountNumber.slice(-4)}` : bank.accountNumber} 
                    />
                  )}
                  {bank.ifscCode && <Field label="IFSC Code" value={bank.ifscCode} />}
                  {bank.swiftCode && <Field label="SWIFT / BIC Code" value={bank.swiftCode} />}
                  {bank.iban && <Field label="IBAN Number" value={bank.iban} />}
                  {bank.accountType && <Field label="Account Type" value={bank.accountType} />}
                  {bank.accountHolderName && <Field label="Account Holder Name" value={bank.accountHolderName} />}
                  {bank.branchName && <Field label="Branch Name" value={bank.branchName} />}
                  {bank.branchAddress && <Field label="Branch Address" value={bank.branchAddress} />}
                  {bank.isVerified && (
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Verification Status</label>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
                        <CheckCircle className="w-3.5 h-3.5" /> Verified
                      </span>
                    </div>
                  )}
                </div>
              )
            }
          }

          // If there is no data in this section, hide it completely!
          if (activeFields.length === 0 && !hasCustomData) return null

          return (
            <div key={section.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 hover:shadow-sm transition-all duration-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className="p-2 bg-brand-50 rounded-xl text-brand-600">{section.icon}</span>
                {section.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                {activeFields.map((field) => (
                  <div key={field.label}>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{field.label}</label>
                    <div className="text-sm font-semibold text-slate-900 leading-relaxed">
                      {field.type === 'list' && Array.isArray(field.value) ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {field.value.map((item, idx) => (
                            <span key={idx} className="px-2.5 py-0.5 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : field.type === 'badge' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100 capitalize mt-1">
                          {field.value.toString().replace(/_/g, " ").toLowerCase()}
                        </span>
                      ) : field.type === 'url' ? (
                        (() => {
                          const url = safeExternalUrl(field.value)
                          return url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 hover:underline font-bold flex items-center gap-1 mt-1 break-all">
                              <Globe className="w-4 h-4 shrink-0" /> {field.value}
                            </a>
                          ) : (
                            <span className="text-slate-700 font-semibold flex items-center gap-1 mt-1 break-all">
                              <Globe className="w-4 h-4 shrink-0 text-slate-400" /> {field.value}
                            </span>
                          )
                        })()
                      ) : field.type === 'date' ? (
                        <span className="text-slate-800 font-semibold">{formatDate(field.value)}</span>
                      ) : (
                        <span className="text-slate-800 font-semibold">{field.value.toString()}</span>
                      )}
                    </div>
                  </div>
                ))}
                {customContent}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Only show full skeleton on initial load; later refreshes keep existing data visible
  // to avoid jarring layout resets when clicking Refresh or Load More.
  if (loading && !fullVendor) {
    return <VendorDetailSkeleton />
  }

  if (error) {
    return (
      <div className="p-8">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
          <span>{error}</span>
          <button
            onClick={() => loadAll()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-2 pb-8 px-6 font-sans">
      {/* Header */}
      <div className="mb-4">
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
              <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(currentMainStatus)}`}>
                {currentMainStatus}
              </span>
              {currentInspectionStatus && (
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getInspectionStatusColor(currentInspectionStatus)}`}>
                  Inspection: {currentInspectionStatus}
                </span>
              )}
              {fullVendor?.assignedQc?.name && (
                <span className="px-3 py-1 rounded-full text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
                  QC: {fullVendor.assignedQc.name}
                </span>
              )}
            </div>
            <p className="text-slate-600">Comprehensive vendor information and inspection history</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadAll()}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh vendor details"
              className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {firstUpcoming && onStartInspection && (
              <button
                onClick={handleOpenInspection}
                className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {isContinuing ? 'Continue' : 'Start Now'}
                {firstUpcoming.poNumber ? ` (${firstUpcoming.poNumber})` : ''}
              </button>
            )}
          </div>
        </div>
      </div>

      {isCompleted ? (
        /* Compact completed view — assignment done, full vendor profile hidden */
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
                <Factory className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Vendor Name</p>
                <p className="font-bold text-slate-900 truncate">{companyName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Location</p>
                <p className="font-bold text-slate-900 truncate">{location || "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Inspection Status</p>
                <span className={`inline-flex mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getInspectionStatusColor(currentInspectionStatus)}`}>
                  {currentInspectionStatus}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Submitted Date</p>
                <p className="font-bold text-slate-900">{fullVendor?.submittedAt ? formatDate(fullVendor.submittedAt) : "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Approved Date</p>
                <p className="font-bold text-slate-900">{fullVendor?.approvedAt ? formatDate(fullVendor.approvedAt) : "—"}</p>
              </div>
            </div>

            <div className="flex items-center">
              {reportInspectionId ? (
                <button
                  onClick={() => router.push(`/checker/dashboard/report/${reportInspectionId}`)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-xs shadow-brand-500/20 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                >
                  <FileText className="w-4 h-4" />
                  Details View
                </button>
              ) : (
                <span className="text-sm text-slate-400">Report unavailable</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Vendor Summary Card */}
      <div className="bg-brand-50/40 border border-brand-100/60 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100/80 text-brand-700 rounded-lg">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Vendor</p>
              <p className="font-semibold text-slate-900">{companyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100/80 text-brand-700 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Location</p>
              <p className="font-semibold text-slate-900">{location}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100/80 text-brand-700 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Last Inspection</p>
              <p className="font-semibold text-slate-900">
                {stats?.lastInspectionDate ? formatDate(stats.lastInspectionDate) : "No inspections yet"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100/80 text-brand-700 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Inspections</p>
              <p className="font-semibold text-slate-900">{stats?.totalInspections ?? 0}</p>
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
                  ? 'border-brand-500 text-brand-600'
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
      {activeTab === 'overview' && renderOverviewTab()}

      {/* Inspection History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" /> Recent Inspection History
            </h3>
            {historyMeta && historyMeta.total > 0 && (
              <span className="text-sm text-slate-500">
                Showing {historyMeta.returned} of {historyMeta.total}
              </span>
            )}
          </div>
          <div className="space-y-4">
            {recentInspections.length > 0 ? recentInspections.map((insp: any) => (
              <div key={insp.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-brand-600 bg-brand-50 px-2 py-1 rounded border border-brand-200">
                      {insp.poNumber}
                    </span>
                    <span className="font-medium text-slate-900">{insp.clientName}</span>
                  </div>
                  {insp.result && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getResultColor(insp.result)}`}>
                      {insp.result.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
                  <span>Scheduled: {insp.scheduledDate}</span>
                  {insp.completedAt && (
                    <span>Completed: {formatDate(insp.completedAt)}</span>
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
          {historyMeta?.hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleLoadMoreHistory}
                disabled={loading || historyLimit >= 50}
                className="flex items-center gap-2 px-5 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {historyLimit >= 50 ? "Showing max 50" : "Load more"}
              </button>
            </div>
          )}
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
                    <span className="font-mono text-sm text-brand-600 bg-brand-50 px-2 py-1 rounded border border-brand-200">
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
        </>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div>
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">{label}</label>
      <p className="text-sm font-semibold text-slate-900 leading-normal">{value.toString()}</p>
    </div>
  )
}

const getEmployeeCountLabel = (count: string): string => {
  const labels: Record<string, string> = {
    '10-20': '10-20 employees',
    '20-50': '20-50 employees',
    '50-100': '50-100 employees',
    '100+': '100+ employees',
  }
  return labels[count] || count
}

const getOwnershipTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'owned': 'Owned',
    'rented': 'Rented',
    'lease': 'Lease',
  }
  return labels[type] || type
}

const getBusinessTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'proprietorship': 'Proprietorship',
    'pvt-ltd': 'Pvt Ltd',
    'partnership-firm': 'Partnership Firm',
    'llp': 'LLP',
    'sole': 'Sole Proprietorship',
    'partnership': 'Partnership',
    'corporation': 'Corporation',
    'llc': 'Limited Liability Company (LLC)',
  }
  return labels[type] || type
}

const getCompanyIdLabel = (businessType: string): string => {
  const labels: Record<string, string> = {
    'proprietorship': 'IEC Code',
    'pvt-ltd': 'CIN Number',
    'partnership-firm': 'Partnership Deed',
    'llp': 'LLPIN Number',
  }
  return labels[businessType] || 'Business Registration ID'
}

const getCertificateStatus = (expiryDate: string) => {
  if (!expiryDate) return null
  const today = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilExpiry < 0) {
    return { status: 'expired', message: 'Expired', color: 'text-red-700 bg-red-50 border border-red-200/50' }
  } else if (daysUntilExpiry <= 30) {
    return { status: 'expiring', message: `Expires in ${daysUntilExpiry} days`, color: 'text-amber-700 bg-amber-50 border border-amber-200/50 font-medium' }
  } else if (daysUntilExpiry <= 90) {
    return { status: 'warning', message: `Expires in ${daysUntilExpiry} days`, color: 'text-yellow-700 bg-yellow-50 border border-yellow-200/50 font-medium' }
  } else {
    return { status: 'valid', message: `Valid until ${expiry.toLocaleDateString()}`, color: 'text-emerald-700 bg-emerald-50 border border-emerald-200/50 font-medium' }
  }
}

function VendorDetailSkeleton() {
  return (
    <div className="p-8 font-sans animate-pulse">
      <div className="mb-8 flex items-center gap-4">
        <div className="h-10 w-10 bg-slate-200 rounded-lg" />
        <div className="flex-1 space-y-3">
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="h-4 w-96 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="h-28 bg-slate-200 rounded-2xl mb-8" />
      <div className="h-10 border-b border-slate-200 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            {[...Array(5)].map((_, j) => (
              <div key={j} className="space-y-2">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-4 w-full bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Only allow http(s) URLs to prevent javascript:/data: XSS injection via vendor-supplied links.
function safeExternalUrl(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : null
}

function formatDate(input?: string | Date | null): string {
  if (!input) return ""
  const d = typeof input === "string" ? new Date(input) : input
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

// Joins address parts with ", " while trimming and dropping empty/whitespace-only segments.
// Prevents ugly strings like "Addr, , Zip" when intermediate fields are missing.
function formatAddress(...parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p ?? "").toString().trim())
    .filter((p) => p.length > 0)
    .join(", ")
}
