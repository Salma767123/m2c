/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft, FileText, CheckCircle, XCircle, AlertTriangle,
  Building2, ShieldCheck, Factory, Settings, ClipboardList, Package,
  Camera, Clock, MapPin, Eye, Download, Loader2,
} from "lucide-react"
import { Badge } from "@/components/UI/Badge"
import { Card, CardContent } from "@/components/UI/Card"
import { openDoc } from "@/lib/docViewerBus"
import qcCheckerService from "@/services/qcCheckerService"
import { formatCheckerName } from "@/lib/checkerUtils"
import { generateFactoryInspectionPdf, pdfFileName } from "@/lib/factoryInspectionReportPdf"
import { showErrorToast } from "@/lib/toast-utils"
import VendorInspectionData from "@/components/AdminDashboard/Vendors/VendorInspectionData"

async function fetchImgDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function openDataUriInTab(dataUri: string, mimeType: string) {
  try {
    const b64 = dataUri.split(",")[1]
    const bytes = atob(b64)
    const ab = new ArrayBuffer(bytes.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < bytes.length; i++) ia[i] = bytes.charCodeAt(i)
    const blob = new Blob([ab], { type: mimeType })
    window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer")
  } catch { /* ignore */ }
}

interface ReportDetailProps {
  reportId: string
  onBack?: () => void
}

function stepForKey(key: string): string {
  if (key.startsWith("certDoc_") || key.startsWith("cert_")) return "Step 6 – Certifications"
  if (key.startsWith("vt_")) return "Step 4 – Vendor & Products"
  if (key.startsWith("mf_")) return "Step 5 – Manufacturing"
  if (key.startsWith("ct_")) return "Step 7 – Contact & Trade"
  if (key.startsWith("c_"))  return "Step 1 – Company Info"
  if (key.startsWith("w_"))  return "Step 2 – Warehouse & Factory"
  if (key.startsWith("o_"))  return "Step 3 – Owner Profile"
  return "Other"
}

// ── Verification types ──────────────────────────────────────────────────────────
type VF = Record<string, { ok: boolean | null; remarks: string }>

// ── Helper components ───────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value || "—"}</span>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-slate-900 break-words">{value || "—"}</span>
    </div>
  )
}


function StatusChip({ value }: { value: string }) {
  const v = (value || "").toLowerCase()
  const isPass = ["yes", "pass", "passed", "approved"].includes(v)
  const isFail = ["no", "fail", "failed", "rejected"].includes(v)
  const color = isPass ? "text-green-700 bg-green-50 border-green-200"
    : isFail ? "text-red-700 bg-red-50 border-red-200"
    : "text-amber-700 bg-amber-50 border-amber-200"
  const Icon = isPass ? CheckCircle : isFail ? XCircle : AlertTriangle
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      <Icon className="w-3.5 h-3.5" />{value}
    </span>
  )
}

function YesNoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-700">{label}</span>
      {value ? <StatusChip value={value} /> : <span className="text-slate-400 text-sm">—</span>}
    </div>
  )
}

function Section({ title, icon: Icon, accent, badge, children }: {
  title: string; icon: any; accent: string; badge?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-100 ${accent}`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <h3 className="font-bold text-sm tracking-wide flex-1">{title}</h3>
        {badge}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ── Interfaces ──────────────────────────────────────────────────────────────────
interface PhotoItem {
  data?: string
  url?: string
  name?: string
  slotId?: string
  label?: string
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemsToInspect?: Record<string, any> | AssignedItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vendor?: Record<string, any>
  checker?: { name?: string; checkerId?: string; email?: string }
  checkerLatitude?: number
  checkerLongitude?: number
  vendorLatitude?: number
  vendorLongitude?: number
  locationVerified?: boolean
  locationDistanceM?: number
}

// ── Main Component ──────────────────────────────────────────────────────────────
export default function ReportDetail({ reportId, onBack }: ReportDetailProps) {
  const [inspection, setInspection] = useState<InspectionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null)
  const [reportBusy, setReportBusy] = useState<null | "view" | "download">(null)

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

  const buildReport = async () => {
    if (!inspection) throw new Error("No inspection data")
    const rawItems = inspection.itemsToInspect
    const isFormData = rawItems && !Array.isArray(rawItems) && typeof rawItems === "object"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fd: Record<string, any> = isFormData ? (rawItems as Record<string, any>) : {}
    const isNewFmt = isFormData && typeof fd.verifications === "object" && fd.verifications !== null
    const vfData: VF = isNewFmt ? (fd.verifications as VF) : {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vendorObj: Record<string, any> = (inspection.vendor as Record<string, any>) || {}

    let signatureDataUrl: string | null = null
    const rawSig = fd.clientSignature
    if (rawSig) signatureDataUrl = String(rawSig).startsWith("data:") ? rawSig : await fetchImgDataUrl(rawSig)

    const vendorDocs: any[] = Array.isArray(vendorObj?.documents) ? vendorObj.documents : []
    const otherDocs = vendorDocs.filter((d: any) => d?.type === "OTHER" && d?.documentUrl)
    const vendorFactoryImages = (
      await Promise.all(
        otherDocs.map(async (d: any) => {
          const dataUrl = await fetchImgDataUrl(d.documentUrl)
          return dataUrl ? { label: d.name || "Factory Image", dataUrl } : null
        })
      )
    ).filter((x): x is { label: string; dataUrl: string } => x !== null)

    const [companyLogoDataUrl, ownerPhotoDataUrl, mainContactPhotoDataUrl] = await Promise.all([
      vendorObj?.companyLogo ? fetchImgDataUrl(vendorObj.companyLogo) : Promise.resolve(null),
      vendorObj?.ownerPhoto ? fetchImgDataUrl(vendorObj.ownerPhoto) : Promise.resolve(null),
      vendorObj?.mainContact?.photo ? fetchImgDataUrl(vendorObj.mainContact.photo) : Promise.resolve(null),
    ])
    const additionalOwnerPhotoDataUrls = await Promise.all(
      (Array.isArray(vendorObj?.additionalOwners) ? vendorObj.additionalOwners : []).map(
        (o: any) => (o?.photo ? fetchImgDataUrl(o.photo) : Promise.resolve(null))
      )
    )

    const reportMeta = {
      inspectorName: fd.inspectorName || formatCheckerName(inspection.checker) || "",
      inspectionDate: fd.inspectionDate,
      inspectionStartedAt: inspection.startedAt ?? undefined,
      overallResult: fd.inspectionStatus,
      inspectorRemarks: fd.inspectorRemarks || inspection.notes,
      checker: inspection.checker ? { name: inspection.checker.name, checkerId: inspection.checker.checkerId, email: inspection.checker.email } : (fd.inspectorName ? { name: fd.inspectorName } : null),
      location: inspection.checkerLatitude != null && inspection.checkerLongitude != null
        ? { latitude: inspection.checkerLatitude, longitude: inspection.checkerLongitude }
        : null,
      generatedAt: inspection.completedAt ? new Date(inspection.completedAt) : new Date(),
    }

    const hasSignature = !!rawSig
    const doc = generateFactoryInspectionPdf(vendorObj as any, vfData as any, reportMeta, {
      clientSignatureDataUrl: signatureDataUrl,
      vendorFactoryImages: vendorFactoryImages.length > 0 ? vendorFactoryImages : null,
      companyLogoDataUrl,
      ownerPhotoDataUrl,
      mainContactPhotoDataUrl,
      additionalOwnerPhotoDataUrls,
    })
    return { doc, reportMeta, hasSignature }
  }

  const viewSignedReport = async () => {
    setReportBusy("view")
    try {
      const { doc } = await buildReport()
      openDataUriInTab(doc.output("datauristring"), "application/pdf")
    } catch (err: any) {
      console.error("Failed to generate inspection report:", err)
      showErrorToast("Report Error", "Could not generate the inspection report. Please try again.")
    } finally {
      setReportBusy(null)
    }
  }

  const downloadSignedReport = async () => {
    setReportBusy("download")
    try {
      const { doc, reportMeta, hasSignature } = await buildReport()
      doc.save(pdfFileName(reportMeta, hasSignature))
    } catch (err: any) {
      console.error("Failed to download inspection report:", err)
      showErrorToast("Report Error", "Could not generate the inspection report. Please try again.")
    } finally {
      setReportBusy(null)
    }
  }

  if (loading) return (
    <div className="p-8 max-w-5xl mx-auto font-sans space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-8 bg-slate-200 rounded w-64" />
          <div className="h-4 bg-slate-100 rounded w-48" />
        </div>
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
      {onBack && <button onClick={onBack} className="text-brand-600 underline text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1 rounded">Go back</button>}
    </div>
  )

  const rawItems = inspection.itemsToInspect
  const isFormData = rawItems && !Array.isArray(rawItems) && typeof rawItems === "object"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fd: Record<string, any> = isFormData ? (rawItems as Record<string, any>) : {}
  const assignedItems: AssignedItem[] = Array.isArray(rawItems) ? rawItems : []
  const isNewFormat = isFormData && typeof fd.verifications === "object" && fd.verifications !== null
  const vf: VF = isNewFormat ? (fd.verifications as VF) : {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vendor: Record<string, any> = (inspection.vendor as Record<string, any>) || {}

  const resultColors: Record<string, string> = {
    PASSED: "bg-emerald-100 text-emerald-800",
    FAILED: "bg-red-100 text-red-800",
  }

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} aria-label="Go back" className="p-2 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inspection Report</h1>
            <p className="text-slate-500 mt-0.5">{vendor.companyName || fd.vendorName || "—"}</p>
          </div>
        </div>
        {inspection.result && (
          <Badge className={`${resultColors[inspection.result] || "bg-gray-100 text-gray-700"} text-base px-4 py-2`}>
            {inspection.result === "PASSED" && <CheckCircle className="w-4 h-4 mr-2" />}
            {inspection.result === "FAILED" && <XCircle className="w-4 h-4 mr-2" />}
            {inspection.result === "PASSED" ? "Passed" : inspection.result === "FAILED" ? "Failed" : inspection.result}
          </Badge>
        )}
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Inspection Status</div>
            <div className="mt-1">
              {inspection.result === "PASSED"
                ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-base px-4 py-2"><CheckCircle className="w-4 h-4 mr-2" />Passed</Badge>
                : inspection.result === "FAILED"
                  ? <Badge className="bg-red-100 text-red-800 border-red-200 text-base px-4 py-2"><XCircle className="w-4 h-4 mr-2" />Failed</Badge>
                  : <Badge className="bg-slate-100 text-slate-800 text-base px-4 py-2"><Clock className="w-4 h-4 mr-2" />Pending</Badge>
              }
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Inspector</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {fd.inspectorName || formatCheckerName(inspection.checker) || "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Inspection Date</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {inspection.completedAt
                ? new Date(inspection.completedAt).toLocaleDateString()
                : fd.inspectionDate || "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Priority</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {inspection.priority
                ? <span className="capitalize">{inspection.priority}</span>
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspection Report PDF Card */}
      <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Inspection Report</h3>
              <p className="text-sm text-slate-600">
                {fd.clientSignature
                  ? "Full report with the client signature captured during the inspection."
                  : "Full factory inspection report generated from the submitted data."}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={viewSignedReport}
              disabled={reportBusy !== null}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white transition-colors shadow-sm shadow-brand-500/10 disabled:opacity-60"
            >
              {reportBusy === "view" ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</> : <><Eye className="w-4 h-4" /> View Report</>}
            </button>
            <button
              type="button"
              onClick={downloadSignedReport}
              disabled={reportBusy !== null}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 transition-colors disabled:opacity-60"
            >
              {reportBusy === "download" ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</> : <><Download className="w-4 h-4" /> Download</>}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Inspector Remarks */}
      {(fd.inspectorRemarks || inspection.notes) && (
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> Inspector Remarks
            </h3>
            <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {fd.inspectorRemarks || inspection.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── NEW FORMAT (9-step vendor inspection form) ── */}
      {isNewFormat && (
        <div className="space-y-5">

          <VendorInspectionData vendor={vendor} />


          {/* Verification Summary */}
          {(() => {
            const allEntries = Object.entries(vf)
            if (!allEntries.length) return null
            const ok = allEntries.filter(([, v]) => v.ok === true).length
            const fail = allEntries.filter(([, v]) => v.ok === false).length
            const pending = allEntries.filter(([, v]) => v.ok === null).length
            const total = allEntries.length
            const pct = total === 0 ? 0 : Math.round((ok / total) * 100)
            return (
              <Section title="Verification Summary" icon={ClipboardList} accent="bg-slate-50 text-slate-700">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <InfoCard label="Total Fields" value={String(total)} />
                  <InfoCard label="Verified OK" value={String(ok)} />
                  <InfoCard label="Issues Found" value={String(fail)} />
                  <InfoCard label="Pending" value={String(pending)} />
                  <InfoCard label="Verification %" value={`${pct}%`} />
                </div>
              </Section>
            )
          })()}

          {/* Issues Found */}
          {(() => {
            const issues = Object.entries(vf).filter(([, v]) => v.ok === false)
            if (!issues.length) return null
            return (
              <Section title="Issues Found" icon={AlertTriangle} accent="bg-red-50 text-red-800">
                <div className="space-y-2">
                  {issues.map(([key, v]) => (
                    <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-red-50/60 border border-red-100">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-red-700">{stepForKey(key)}</p>
                        {v.remarks
                          ? <p className="text-sm text-red-800 mt-0.5">{v.remarks}</p>
                          : <p className="text-sm text-red-600 italic mt-0.5">No remarks provided.</p>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )
          })()}

        </div>
      )}

      {/* ── OLD FORMAT fallback (legacy 7-step form) ── */}
      {isFormData && !isNewFormat && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800 font-medium">This inspection was submitted using the legacy form format.</p>
          </div>

          <Section title="Section 1 — Factory Details" icon={Factory} accent="bg-brand-50 text-brand-700">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoRow label="Vendor Name" value={fd.vendorName} />
              <InfoRow label="Factory Name" value={fd.factoryName} />
              <InfoRow label="Factory Address" value={fd.factoryAddress} />
              <InfoRow label="Contact Person" value={fd.contactPersonName} />
              <InfoRow label="Primary Phone" value={fd.contactPhoneNumber} />
            </div>
          </Section>

          <Section title="Section 2 — Legal & Registration" icon={ShieldCheck} accent="bg-indigo-50 text-indigo-800">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <InfoRow label="GST Number" value={fd.gstTaxId} />
              {fd.panNumber && <InfoRow label={fd.businessType === "proprietorship" ? "Proprietor PAN Number" : "Company PAN Number"} value={fd.panNumber} />}
              {fd.iecCode && <InfoRow label="IEC Code" value={fd.iecCode} />}
              {fd.companyIdNumber && <InfoRow label="CIN Number" value={fd.companyIdNumber} />}
            </div>
            {fd.docVerifications && Object.keys(fd.docVerifications).length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Document Verification</p>
                {Object.entries(fd.docVerifications as Record<string, { verified: string; remarks: string }>).map(([idx, v]) => {
                  const docList = Array.isArray(fd.vendorDocuments)
                    ? fd.vendorDocuments.filter((d: any) => d?.type && d.type !== "OTHER" && d?.documentUrl)
                    : []
                  const doc = docList[Number(idx)]
                  if (!doc) return null
                  const isProp = fd.businessType === "proprietorship"
                  const label = (doc.type === "GST_CERTIFICATE" ? "GST Certificate"
                    : doc.type === "PAN_CARD" ? (isProp ? "Proprietor PAN Card" : "Company PAN Card")
                    : doc.type === "COMPANY_REGISTRATION" ? "Company Registration"
                    : doc.name || doc.type) as string
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{label}</p>
                        {v.remarks && <p className="text-xs text-slate-500 mt-0.5">{v.remarks}</p>}
                      </div>
                      {v.verified === "yes" && <span className="shrink-0 px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full">Verified ✓</span>}
                      {v.verified === "no" && <span className="shrink-0 px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 border border-red-200 rounded-full">Not Verified ✗</span>}
                      {(!v.verified || v.verified === "") && <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded-full">Not Checked</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          <Section title="Section 3 — Production Info" icon={Settings} accent="bg-purple-50 text-purple-800">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoRow label="Products Manufactured" value={fd.productsManufactured} />
              <InfoRow label="Monthly Capacity" value={fd.monthlyProductionCapacity} />
              <InfoRow label="Production Workers" value={fd.numberOfProductionWorkers} />
              <InfoRow label="Category to Inspect" value={fd.categoryToInspect} />
            </div>
          </Section>

          <Section title="Section 4 — Basic Infrastructure" icon={Building2} accent="bg-teal-50 text-teal-800">
            <YesNoRow label="Machinery Available" value={fd.machineryAvailable} />
            <YesNoRow label="Electricity Available" value={fd.electricityAvailable} />
            <YesNoRow label="Water Available" value={fd.waterAvailable} />
            <YesNoRow label="Storage Area Available" value={fd.storageAreaAvailable} />
          </Section>

          <Section title="Section 5 — Quality & Safety" icon={ShieldCheck} accent="bg-emerald-50 text-emerald-800">
            <YesNoRow label="Quality Check Process in Place" value={fd.qualityCheckProcess} />
            <YesNoRow label="Safety Equipment Available" value={fd.safetyEquipment} />
            <YesNoRow label="Clean Working Environment" value={fd.cleanWorkingEnvironment} />
          </Section>

          {((fd.factoryPhotos?.length > 0) || (fd.documentsUpload?.length > 0)) && (
            <Section title="Section 7 — Evidence" icon={FileText} accent="bg-rose-50 text-rose-800">
              {fd.factoryPhotos?.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Factory Photos ({fd.factoryPhotos.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {(fd.factoryPhotos as PhotoItem[]).map((p, i) => {
                      const src = p?.data || p?.url || null
                      const caption = p.label || p.name || `Photo ${i + 1}`
                      return src && typeof src === "string" ? (
                        <div key={i} className="cursor-pointer" onClick={() => setSelectedImage({ src, alt: caption })}>
                          <img src={src} alt={caption} onError={(e) => { e.currentTarget.style.display = "none" }}
                            className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]" />
                          <p className="mt-1.5 text-[11px] font-semibold text-slate-700 truncate" title={caption}>{caption}</p>
                        </div>
                      ) : (
                        <div key={i}>
                          <div className="flex items-center justify-center h-32 bg-slate-100 rounded-xl border border-dashed border-slate-300">
                            <span className="text-xs text-slate-500 text-center px-2">{caption}</span>
                          </div>
                          <p className="mt-1.5 text-[11px] font-semibold text-slate-700 truncate" title={caption}>{caption}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {fd.documentsUpload?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Documents ({fd.documentsUpload.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {(fd.documentsUpload as DocItem[]).map((doc, i) =>
                      doc?.data ? (
                        <button key={i} type="button" onClick={() => doc.data && openDoc(doc.data, doc.name || `Document ${i + 1}`)}
                          className="flex items-center gap-2 px-3 py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg text-xs font-medium hover:bg-brand-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1">
                          <FileText className="w-3.5 h-3.5" />
                          {doc.name || `Document ${i + 1}`}
                        </button>
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
        </div>
      )}

      {/* Selfie Verification */}
      {(fd.beforeSelfiePhoto || fd.afterSelfiePhoto) && (
        <Section title="Selfie Verification" icon={Camera} accent="bg-violet-50 text-violet-800">
          <div className="flex flex-wrap gap-6">
            {([
              { key: "before", photo: fd.beforeSelfiePhoto, takenAt: fd.beforeSelfieTakenAt, label: "Before Inspection" },
              { key: "after",  photo: fd.afterSelfiePhoto,  takenAt: fd.afterSelfieTakenAt,  label: "After Inspection"  },
            ] as const).map(({ key, photo, takenAt, label }) => {
              const src = (photo as PhotoItem)?.data || (photo as PhotoItem)?.url || (typeof photo === "string" ? photo : null)
              if (!src) return null
              return (
                <div key={key} className="flex flex-col items-center gap-2">
                  <div className="relative w-44 rounded-2xl overflow-hidden border-2 border-violet-200 shadow-md" style={{ aspectRatio: "0.8" }}>
                    <img src={src} alt={label} onError={(e) => { e.currentTarget.style.display = "none" }}
                      className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-violet-900/70 text-white text-[10px] font-bold text-center py-1 px-2">{label}</div>
                  </div>
                  {takenAt && (
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(takenAt as string).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Location Verification */}
      {(inspection.locationVerified !== undefined || inspection.checkerLatitude != null) && (
        <Section title="Location Verification" icon={MapPin} accent={inspection.locationVerified ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}>
          <div className="flex items-center gap-3 mb-4">
            {inspection.locationVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />Location Verified ✓
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                <XCircle className="w-3.5 h-3.5" />Location Mismatch
              </span>
            )}
            {inspection.locationDistanceM != null && (
              <span className="text-xs text-slate-500">Distance: <strong>{inspection.locationDistanceM}m</strong> (threshold: 500m)</span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard label="Checker Latitude" value={inspection.checkerLatitude?.toFixed(6)} />
            <InfoCard label="Checker Longitude" value={inspection.checkerLongitude?.toFixed(6)} />
            <InfoCard label="Vendor Latitude" value={inspection.vendorLatitude?.toFixed(6)} />
            <InfoCard label="Vendor Longitude" value={inspection.vendorLongitude?.toFixed(6)} />
          </div>
        </Section>
      )}

      {/* Assigned items */}
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
                    <div><p className="font-bold text-brand-600">{item.aqlLevel}</p><p className="text-slate-500">AQL</p></div>
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
          <InfoCard label="Scheduled Date" value={inspection.scheduledDate} />
          <InfoCard label="Started At" value={inspection.startedAt ? new Date(inspection.startedAt).toLocaleString("en-IN") : undefined} />
          <InfoCard label="Completed At" value={inspection.completedAt ? new Date(inspection.completedAt).toLocaleString("en-IN") : undefined} />
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-5xl max-h-screen">
            <button onClick={(e) => { e.stopPropagation(); setSelectedImage(null) }}
              className="absolute -top-10 -right-4 p-2 text-white hover:text-gray-300">
              <XCircle className="w-8 h-8" />
            </button>
            <img src={selectedImage.src} alt={selectedImage.alt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} />
            <p className="text-center text-white mt-4 text-sm font-medium">{selectedImage.alt}</p>
          </div>
        </div>
      )}

    </div>
  )
}
