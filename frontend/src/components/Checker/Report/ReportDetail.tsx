/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft, FileText, CheckCircle, XCircle,
  AlertTriangle, Building2, ShieldCheck, Factory,
  Settings, ClipboardList, Package, Download
} from "lucide-react"
import { Badge } from "@/components/UI/Badge"
import qcCheckerService from "@/services/qcCheckerService"
import { downloadReportPdf } from "@/lib/reportPdfDownload"

interface ReportDetailProps {
  reportId: string
  onBack?: () => void
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value || "—"}</span>
    </div>
  )
}

function YesNoRow({ label, value }: { label: string; value?: string }) {
  const v = (value || "").toLowerCase()
  const isYes = v === "yes" || v === "pass" || v === "passed"
  const isNo = v === "no" || v === "fail" || v === "failed"
  const Icon = isYes ? CheckCircle : isNo ? XCircle : AlertTriangle
  const color = isYes ? "text-emerald-600" : isNo ? "text-red-600" : "text-amber-600"
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-700">{label}</span>
      {value ? (
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${color}`}>
          <Icon className="w-4 h-4" />
          {value}
        </span>
      ) : (
        <span className="text-slate-400 text-xs">—</span>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, accent, children }: {
  title: string; icon: LucideIcon; accent: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-100 ${accent}`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <h3 className="font-bold text-sm tracking-wide">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

interface PhotoItem {
  data?: string
  url?: string
  name?: string
}

interface DocItem {
  data?: string
  name?: string
}

interface AssignedItem {
  itemName?: string
  description?: string
  aqlLevel?: string
}

interface InspectionRecord {
  id: string
  status: string
  result?: string
  completedAt?: string
  startedAt?: string
  scheduledDate?: string
  clientName?: string
  priority?: string
  notes?: string
  poNumber?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemsToInspect?: Record<string, any> | AssignedItem[]
  vendor?: { companyName?: string }
  checker?: { name?: string }
}

export default function ReportDetail({ reportId, onBack }: ReportDetailProps) {
  const searchParams = useSearchParams()
  const autoDownload = searchParams.get("download") === "true"
  const [inspection, setInspection] = useState<InspectionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{src: string, alt: string} | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const autoDownloadTriggered = useRef(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await qcCheckerService.getMyInspectionById(reportId)
        if (res.success) setInspection(res.inspection)
        else setError("Report not found")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [reportId])

  // Auto-trigger PDF download when navigated with ?download=true
  // Auto-trigger PDF download when navigated with ?download=true
  useEffect(() => {
    if (!autoDownload || autoDownloadTriggered.current || loading || !inspection || downloading) return
    let cancelled = false
    const tryDownload = () => {
      if (cancelled) return
      if (!reportRef.current) {
        setTimeout(tryDownload, 300)
        return
      }
      autoDownloadTriggered.current = true
      const fd = inspection.itemsToInspect && !Array.isArray(inspection.itemsToInspect) ? inspection.itemsToInspect : {}
      const vendorName = inspection.vendor?.companyName || (fd as Record<string, string>).vendorName || "Report"
      downloadReportPdf({
        element: reportRef.current,
        title: "Factory Inspection Report",
        submittedDate: inspection.completedAt
          ? new Date(inspection.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
          : "—",
        filename: `Factory_Report_${vendorName.replace(/\s+/g, "_")}_${reportId.slice(-8).toUpperCase()}.pdf`,
      }).catch(() => { /* silent */ })
    }
    const timer = setTimeout(tryDownload, 500)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [autoDownload, loading, inspection, downloading, reportId])

  if (loading) return (
    <div className="p-8 max-w-5xl mx-auto font-sans space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-8 bg-slate-200 rounded w-64" />
          <div className="h-4 bg-slate-100 rounded w-48" />
        </div>
        <div className="h-10 bg-slate-200 rounded-lg w-36" />
      </div>
      <div className="h-24 bg-slate-200 rounded-2xl" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-5 h-5 bg-slate-200 rounded" />
            <div className="h-4 bg-slate-200 rounded w-48" />
          </div>
          <div className="p-6 space-y-3">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-20" />
                  <div className="h-4 bg-slate-200 rounded w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  if (error || !inspection) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <AlertTriangle className="w-12 h-12 text-amber-400" />
      <p className="text-slate-600">{error || "Inspection not found"}</p>
      {onBack && <button onClick={onBack} className="text-[#222222] underline text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 rounded">Go back</button>}
    </div>
  )

  // After completion, itemsToInspect holds the submitted form data object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fd: Record<string, any> = inspection.itemsToInspect && !Array.isArray(inspection.itemsToInspect)
    ? inspection.itemsToInspect : {}
  // Original items assigned by admin
  const assignedItems: AssignedItem[] = Array.isArray(inspection.itemsToInspect) ? inspection.itemsToInspect : []

  const resultColors: Record<string, string> = {
    PASSED: "bg-emerald-100 text-emerald-800",
    FAILED: "bg-red-100 text-red-800",
  }

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return
    setDownloading(true)
    try {
      const vendorName = inspection.vendor?.companyName || fd.vendorName || "Report"
      await downloadReportPdf({
        element: reportRef.current,
        title: "Factory Inspection Report",
        submittedDate: inspection.completedAt
          ? new Date(inspection.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
          : "—",
        filename: `Factory_Report_${vendorName.replace(/\s+/g, "_")}_${reportId.slice(-8).toUpperCase()}.pdf`,
      })
    } catch {
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} aria-label="Go back" className="p-2 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">Inspection Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {inspection.vendor?.companyName || fd.vendorName} &bull; Ref: {reportId.slice(-8).toUpperCase()}
          </p>
        </div>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#222222] rounded-lg hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Generating..." : "Download PDF"}
        </button>
        {inspection.result && (
          <Badge className={`${resultColors[inspection.result] || "bg-gray-100 text-gray-700"} text-sm px-4 py-1.5`}>
            {inspection.result === "PASSED" && <CheckCircle className="w-4 h-4 mr-1.5" />}
            {inspection.result === "FAILED" && <XCircle className="w-4 h-4 mr-1.5" />}
            {inspection.result}
          </Badge>
        )}
      </div>

      {/* PDF capture area */}
      <div ref={reportRef} className="space-y-6">

      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-[#222222] to-[#333333] rounded-2xl p-6 text-white grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Vendor</p>
          <p className="font-semibold text-sm">{inspection.vendor?.companyName || fd.vendorName || "—"}</p>
        </div>
        <div>
          <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Client</p>
          <p className="font-semibold text-sm">{inspection.clientName || "—"}</p>
        </div>
        <div>
          <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Completed On</p>
          <p className="font-semibold text-sm">
            {inspection.completedAt
              ? new Date(inspection.completedAt).toLocaleDateString("en-IN")
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Priority</p>
          <p className="font-semibold text-sm">{inspection.priority || "—"}</p>
        </div>
      </div>

      {/* SECTION 1: Factory Details */}
      <Section title="Section 1 — Factory Details" icon={Factory} accent="bg-neutral-50 text-neutral-800">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Vendor Name" value={fd.vendorName} />
          <InfoRow label="Factory Name" value={fd.factoryName} />
          <InfoRow label="Factory Address" value={fd.factoryAddress} />
          <InfoRow label="Contact Person" value={fd.contactPersonName} />
          <InfoRow label="Contact Phone" value={fd.contactPhoneNumber} />
        </div>
      </Section>

      {/* SECTION 2: Legal */}
      <Section title="Section 2 — Legal & Registration" icon={ShieldCheck} accent="bg-neutral-50 text-neutral-800">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Business Reg. No." value={fd.businessRegistrationNumber} />
          <InfoRow label="GST / Tax ID" value={fd.gstTaxId} />
          <InfoRow label="Factory License No." value={fd.factoryLicenseNumber} />
        </div>
      </Section>

      {/* SECTION 3: Production */}
      <Section title="Section 3 — Production Info" icon={Settings} accent="bg-purple-50 text-purple-800">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Products Manufactured" value={fd.productsManufactured} />
          <InfoRow label="Monthly Capacity" value={fd.monthlyProductionCapacity} />
          <InfoRow label="Production Workers" value={fd.numberOfProductionWorkers} />
          <InfoRow label="Category to Inspect" value={fd.categoryToInspect} />
        </div>
      </Section>

      {/* SECTION 4: Infrastructure */}
      <Section title="Section 4 — Basic Infrastructure" icon={Building2} accent="bg-teal-50 text-teal-800">
        <YesNoRow label="Machinery Available" value={fd.machineryAvailable} />
        <YesNoRow label="Electricity Available" value={fd.electricityAvailable} />
        <YesNoRow label="Water Available" value={fd.waterAvailable} />
        <YesNoRow label="Storage Area Available" value={fd.storageAreaAvailable} />
      </Section>

      {/* SECTION 5: Quality & Safety */}
      <Section title="Section 5 — Quality & Safety" icon={ShieldCheck} accent="bg-emerald-50 text-emerald-800">
        <YesNoRow label="Quality Check Process in Place" value={fd.qualityCheckProcess} />
        <YesNoRow label="Safety Equipment Available" value={fd.safetyEquipment} />
        <YesNoRow label="Clean Working Environment" value={fd.cleanWorkingEnvironment} />
      </Section>

      {/* SECTION 6: Inspection Info */}
      <Section title="Section 6 — Inspection Info" icon={ClipboardList} accent="bg-orange-50 text-orange-800">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <InfoRow label="Inspection Date" value={fd.inspectionDate} />
          <InfoRow label="Inspector Name" value={fd.inspectorName || inspection.checker?.name} />
          <InfoRow label="Inspection Status" value={fd.inspectionStatus} />
        </div>
        {(fd.inspectorRemarks || inspection.notes) && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mt-2">
            <p className="text-xs font-semibold text-neutral-700 uppercase mb-1">Remarks</p>
            <p className="text-sm text-neutral-900">{fd.inspectorRemarks || inspection.notes}</p>
          </div>
        )}
      </Section>

      {/* SECTION 7: Evidence */}
      {((fd.factoryPhotos?.length > 0) || (fd.documentsUpload?.length > 0)) && (
        <Section title="Section 7 — Evidence" icon={FileText} accent="bg-rose-50 text-rose-800">
          {fd.factoryPhotos?.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
                Factory Photos ({fd.factoryPhotos.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(fd.factoryPhotos as PhotoItem[]).map((p, i) => {
                  const src = p?.data || p?.url || null
                  return src && typeof src === 'string' ? (
                    <div key={i} className="relative group cursor-pointer" onClick={() => setSelectedImage({src, alt: p.name || `Photo ${i + 1}`})}>
                      <img
                        src={src}
                        alt={p.name || `Photo ${i + 1}`}
                        onError={(e) => { e.currentTarget.style.display = "none" }}
                        className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-sm transition-transform group-hover:scale-[1.02]"
                      />
                      {p.name && (
                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-2 py-1 rounded-b-xl truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {p.name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={i} className="flex items-center justify-center h-32 bg-slate-100 rounded-xl border border-dashed border-slate-300">
                      <span className="text-xs text-slate-500 text-center px-2">{p?.name || `Photo ${i + 1}`}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {fd.documentsUpload?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
                Documents ({fd.documentsUpload.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {(fd.documentsUpload as DocItem[]).map((doc, i) =>
                  doc?.data ? (
                    <a
                      key={i}
                      href={doc.data}
                      download={doc.name || `Document_${i + 1}`}
                      className="flex items-center gap-2 px-3 py-2 bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-lg text-xs font-medium hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {doc.name || `Document ${i + 1}`}
                    </a>
                  ) : (
                    <span key={i} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                      {doc?.name || `Document ${i + 1}`}
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Assigned items (original admin list) */}
      {assignedItems.length > 0 && (
        <Section title="Items Assigned for Inspection" icon={Package} accent="bg-slate-50 text-slate-700">
          <div className="space-y-3">
            {assignedItems.map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{item.itemName}</p>
                  {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                </div>
                <div className="text-xs text-center flex-shrink-0">
                  {item.aqlLevel && (
                    <div><p className="font-bold text-[#222222]">{item.aqlLevel}</p><p className="text-slate-500">AQL</p></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Timestamps */}
      <div className="bg-white rounded-xl border border-slate-200 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Scheduled Date" value={inspection.scheduledDate} />
          <InfoRow label="Started At" value={inspection.startedAt ? new Date(inspection.startedAt).toLocaleString("en-IN") : undefined} />
          <InfoRow label="Completed At" value={inspection.completedAt ? new Date(inspection.completedAt).toLocaleString("en-IN") : undefined} />
        </div>
      </div>

      </div>{/* end PDF capture area */}

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-screen">
            <button 
              onClick={(e) => {e.stopPropagation(); setSelectedImage(null)}}
              className="absolute -top-10 -right-4 p-2 text-white hover:text-gray-300"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <img 
              src={selectedImage.src} 
              alt={selectedImage.alt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-center text-white mt-4 text-sm font-medium">{selectedImage.alt}</p>
          </div>
        </div>
      )}
    </div>
  )
}