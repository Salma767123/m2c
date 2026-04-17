/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft, CheckCircle, XCircle,
  AlertTriangle, Package, ClipboardList, Ruler,
  Box, Bug, FlaskConical, Camera, Star, Download, Clock
} from "lucide-react"
import { Badge } from "@/components/UI/Badge"
import qcCheckerService from "@/services/qcCheckerService"
import { downloadReportPdf } from "@/lib/reportPdfDownload"

interface ProductReportDetailProps {
  productId: string
  onBack?: () => void
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value ?? "—"}</span>
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

function PhotoGrid({ photos, label, onImageClick }: { photos: (string | PhotoItem)[] | undefined | null; label: string; onImageClick?: (src: string, alt: string) => void }) {
  if (!photos || photos.length === 0) return null
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
        {label} ({photos.length})
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((p, i) => {
          const src = typeof p === "string" ? p : p?.data || p?.url || null
          const alt = typeof p === "string" ? `${label} ${i + 1}` : p?.name || `${label} ${i + 1}`
          return src ? (
            <div key={i} className="relative group cursor-pointer" onClick={() => onImageClick?.(src, alt)}>
              <img
                src={src}
                alt={alt}
                onError={(e) => { e.currentTarget.style.display = "none" }}
                className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-sm transition-transform group-hover:scale-[1.02]"
              />
              {typeof p !== "string" && p?.name && (
                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-2 py-1 rounded-b-xl truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.name}
                </div>
              )}
            </div>
          ) : (
            <div key={i} className="flex items-center justify-center h-32 bg-slate-100 rounded-xl border border-dashed border-slate-300">
              <span className="text-xs text-slate-500 text-center px-2">{(typeof p !== "string" && p?.name) || `Photo ${i + 1}`}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const REMARK_LABELS: Record<string, string> = {
  shipperCartonRemark: "Shipper Carton Packaging",
  innerCartonRemark: "Inner Carton Packaging",
  retailPackagingRemark: "Retail Packaging",
  productTypeRemark: "Product Type (style, size, color, material, labeling)",
  aqlWorkmanshipRemark: "AQL (Workmanship / Appearance / Function)",
  onSiteTestsRemark: "On-site Tests",
}

const statusColors: Record<string, string> = {
  QC_APPROVED: "bg-emerald-100 text-emerald-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  REINSPECTION: "bg-amber-100 text-amber-800",
  PENDING: "bg-slate-100 text-slate-700",
}

const statusLabels: Record<string, string> = {
  QC_APPROVED: "Approved by QC",
  APPROVED: "Approved by Admin",
  REJECTED: "Rejected",
  REINSPECTION: "Reinspection",
  PENDING: "Pending",
}

interface InspectionItem {
  itemName?: string
  itemDescription?: string
  totalQuantity?: number
  inspectionQuantity?: number
}

interface Measurement {
  sampleName?: string
  cartonLength?: number
  cartonWidth?: number
  cartonHeight?: number
  productLength?: number
  productWidth?: number
  retailWeight?: number
  cartonGrossWeight?: number
}

interface InspectionTest {
  id?: string
  label?: string
  detail?: string
  pass?: boolean
  fail?: boolean
  rightPhotos?: (string | PhotoItem)[]
  wrongPhotos?: (string | PhotoItem)[]
}

interface ProductReport {
  id: string
  name: string
  baseSku?: string
  category?: string
  approvalStatus?: string
  rejectionReason?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  vendor?: { companyName?: string }
  images?: { url: string }[]
  qcInspectionData?: Record<string, unknown> | null
}

export default function ProductReportDetail({ productId, onBack }: ProductReportDetailProps) {
  const searchParams = useSearchParams()
  const autoDownload = searchParams.get("download") === "true"
  const [product, setProduct] = useState<ProductReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{src: string, alt: string} | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const autoDownloadTriggered = useRef(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await qcCheckerService.getProductDetails(productId)
        if (res.success) setProduct(res.data.product)
        else setError("Product not found")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load product report")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [productId])

  // Auto-trigger PDF download when navigated with ?download=true
  useEffect(() => {
    if (!autoDownload || autoDownloadTriggered.current || loading || !product || downloading) return
    let cancelled = false
    const tryDownload = () => {
      if (cancelled) return
      if (!reportRef.current) {
        setTimeout(tryDownload, 300)
        return
      }
      autoDownloadTriggered.current = true
      downloadReportPdf({
        element: reportRef.current,
        title: "Product Inspection Report",
        submittedDate: product.updatedAt
          ? new Date(product.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
          : "—",
        filename: `Product_Report_${product.name.replace(/\s+/g, "_")}_${product.baseSku || productId}.pdf`,
      }).catch(() => { /* silent */ })
    }
    const timer = setTimeout(tryDownload, 500)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [autoDownload, loading, product, downloading, productId])

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

  if (error || !product) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <AlertTriangle className="w-12 h-12 text-amber-400" />
      <p className="text-slate-600">{error || "Product not found"}</p>
      {onBack && <button onClick={onBack} className="text-[#222222] underline text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 rounded">Go back</button>}
    </div>
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fd = (product.qcInspectionData || {}) as Record<string, any>
  const status = product.approvalStatus || "PENDING"
  const items = Array.isArray(fd.items) ? (fd.items as InspectionItem[]) : []
  const measurements = Array.isArray(fd.measurements) ? (fd.measurements as Measurement[]) : []
  const tests = Array.isArray(fd.tests) ? (fd.tests as InspectionTest[]) : []

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return
    setDownloading(true)
    try {
      await downloadReportPdf({
        element: reportRef.current,
        title: "Product Inspection Report",
        submittedDate: product.updatedAt
          ? new Date(product.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
          : "—",
        filename: `Product_Report_${product.name.replace(/\s+/g, "_")}_${product.baseSku || productId}.pdf`,
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
          <h1 className="text-3xl font-bold text-slate-900">Product Inspection Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {product.name} &bull; SKU: {product.baseSku || "N/A"}
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
        <Badge className={`${statusColors[status] || "bg-gray-100 text-gray-700"} text-sm px-4 py-1.5`}>
          {status === "QC_APPROVED" || status === "APPROVED" ? <CheckCircle className="w-4 h-4 mr-1.5" /> : null}
          {status === "REJECTED" ? <XCircle className="w-4 h-4 mr-1.5" /> : null}
          {statusLabels[status] || status}
        </Badge>
      </div>

      {/* PDF capture area */}
      <div ref={reportRef} className="space-y-6">

      {/* Summary Banner */}
      <div className="bg-linear-to-r from-[#222222] to-[#333333] rounded-2xl p-6 text-white grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Product</p>
          <p className="font-semibold text-sm">{product.name || "—"}</p>
        </div>
        <div>
          <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Vendor</p>
          <p className="font-semibold text-sm">{product.vendor?.companyName || "—"}</p>
        </div>
        <div>
          <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Category</p>
          <p className="font-semibold text-sm">{product.category || "—"}</p>
        </div>
        <div>
          <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Inspected On</p>
          <p className="font-semibold text-sm">
            {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString("en-IN") : "—"}
          </p>
        </div>
      </div>

      {/* Rejection Reason Banner */}
      {product.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-700 uppercase mb-1">Rejection Reason</p>
          <p className="text-sm text-red-900">{product.rejectionReason}</p>
        </div>
      )}

      {/* Section 1: General Information */}
      <Section title="Section 1 — General Information" icon={ClipboardList} accent="bg-neutral-50 text-neutral-800">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Client" value={fd.client} />
          <InfoRow label="Vendor" value={fd.vendor} />
          <InfoRow label="Factory" value={fd.factory} />
          <InfoRow label="Service Location" value={fd.serviceLocation} />
          <InfoRow label="Service Start Date" value={fd.serviceStartDate} />
          <InfoRow label="Service Type" value={fd.serviceType} />
        </div>
      </Section>

      {/* Section 2: Preparation */}
      <Section title="Section 2 — Preparation" icon={Package} accent="bg-neutral-50 text-neutral-800">
        {items.length > 0 ? (
          <div className="space-y-3 mb-4">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{item.itemName || `Item ${i + 1}`}</p>
                  {item.itemDescription && <p className="text-xs text-slate-500 mt-0.5">{item.itemDescription}</p>}
                </div>
                <div className="flex gap-4 text-xs text-center flex-shrink-0">
                  <div><p className="font-bold text-slate-800">{item.totalQuantity ?? "—"}</p><p className="text-slate-500">Total Qty</p></div>
                  <div><p className="font-bold text-[#222222]">{item.inspectionQuantity ?? "—"}</p><p className="text-slate-500">Inspection Qty</p></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No items recorded.</p>
        )}
        <PhotoGrid photos={fd.warehousePhotoEvidences} label="Warehouse Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
      </Section>

      {/* Section 3: Measurements */}
      <Section title="Section 3 — Measurements" icon={Ruler} accent="bg-purple-50 text-purple-800">
        {measurements.length > 0 ? (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Sample</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Carton L (cm)</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Carton W (cm)</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Carton H (cm)</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Product L (cm)</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Product W (cm)</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Retail Wt (kg)</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Gross Wt (kg)</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-medium text-slate-700">{m.sampleName || `#${i + 1}`}</td>
                    <td className="py-2 px-3 text-slate-600">{m.cartonLength ?? "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{m.cartonWidth ?? "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{m.cartonHeight ?? "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{m.productLength ?? "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{m.productWidth ?? "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{m.retailWeight ?? "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{m.cartonGrossWeight ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No measurements recorded.</p>
        )}
        <PhotoGrid photos={fd.measurementPhotos} label="Measurement Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
      </Section>

      {/* Section 4: Packaging */}
      <Section title="Section 4 — Packaging & Remarks" icon={Box} accent="bg-teal-50 text-teal-800">
        <div className="space-y-3 mb-4">
          {Object.entries(REMARK_LABELS).map(([key, label]) => {
            const val = fd[key]
            return (
              <div key={key} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-700">{label}</span>
                <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                  val && Number(val) >= 8 ? "bg-emerald-50 text-emerald-700" :
                  val && Number(val) >= 6 ? "bg-amber-50 text-amber-700" :
                  val ? "bg-red-50 text-red-700" : "text-slate-400"
                }`}>
                  {val ? `${val}/10` : "—"}
                </span>
              </div>
            )
          })}
        </div>
        <PhotoGrid photos={fd.packagingPhotos} label="Packaging Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
      </Section>

      {/* Section 5: Defects */}
      <Section title="Section 5 — Defects & AQL" icon={Bug} accent="bg-orange-50 text-orange-800">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <InfoRow label="Inspection Level" value={fd.inspectionLevel} />
          <InfoRow label="Sample Size" value={fd.sampleSize} />
        </div>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">AQL Level</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Max Allowed</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Found</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Critical", aql: fd.aqlCritical, max: fd.maxAllowedCritical, found: fd.criticalDefects },
                { label: "Major", aql: fd.aqlMajor, max: fd.maxAllowedMajor, found: fd.majorDefects },
                { label: "Minor", aql: fd.aqlMinor, max: fd.maxAllowedMinor, found: fd.minorDefects },
              ].map((row) => {
                const exceeded = row.found != null && row.max != null && Number(row.found) > Number(row.max)
                return (
                  <tr key={row.label} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-medium text-slate-700">{row.label}</td>
                    <td className="py-2 px-3 text-slate-600">{row.aql ?? "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{row.max ?? "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{row.found ?? "—"}</td>
                    <td className="py-2 px-3">
                      {row.found != null ? (
                        exceeded ? (
                          <span className="text-xs font-semibold text-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />Exceeded</span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Within Limit</span>
                        )
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {(fd.criticalDefectDetails || fd.majorDefectDetails || fd.minorDefectDetails) && (
          <div className="space-y-2 mb-4">
            {fd.criticalDefectDetails && <div className="bg-red-50 border border-red-100 rounded-lg p-3"><p className="text-xs font-semibold text-red-700 uppercase mb-1">Critical Defect Details</p><p className="text-sm text-red-900">{fd.criticalDefectDetails}</p></div>}
            {fd.majorDefectDetails && <div className="bg-amber-50 border border-amber-100 rounded-lg p-3"><p className="text-xs font-semibold text-amber-700 uppercase mb-1">Major Defect Details</p><p className="text-sm text-amber-900">{fd.majorDefectDetails}</p></div>}
            {fd.minorDefectDetails && <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3"><p className="text-xs font-semibold text-neutral-700 uppercase mb-1">Minor Defect Details</p><p className="text-sm text-neutral-900">{fd.minorDefectDetails}</p></div>}
          </div>
        )}
        <PhotoGrid photos={fd.defectPhotos} label="Defect Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
      </Section>

      {/* Section 6: Testing */}
      <Section title="Section 6 — On-site Testing" icon={FlaskConical} accent="bg-rose-50 text-rose-800">
        {tests.length > 0 ? (
          <div className="space-y-4">
            {tests.map((test, i) => {
              const passed = test.pass === true
              const failed = test.fail === true
              return (
                <div key={test.id || i} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{test.label || `Test ${i + 1}`}</p>
                      {test.detail && <p className="text-xs text-slate-500 mt-0.5">{test.detail}</p>}
                    </div>
                    {passed && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" /> PASS
                      </span>
                    )}
                    {failed && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">
                        <XCircle className="w-3.5 h-3.5" /> FAIL
                      </span>
                    )}
                    {!passed && !failed && (
                      <span className="text-xs text-slate-400">No decision</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(test.rightPhotos?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-600 mb-2">Right/Correct Photos ({test.rightPhotos!.length})</p>
                        <div className="grid grid-cols-2 gap-2">
                          {test.rightPhotos!.map((p, j) => {
                            const src = typeof p === "string" ? p : p?.data || p?.url
                            return src ? (
                              <img key={j} src={src} alt={`Right ${j + 1}`} onClick={() => setSelectedImage({src, alt: `Right ${j + 1}`})} onError={(e) => { e.currentTarget.style.display = "none" }} className="w-full h-24 object-cover rounded-lg border border-emerald-200 cursor-pointer transition-transform hover:scale-[1.02]" />
                            ) : null
                          })}
                        </div>
                      </div>
                    )}
                    {(test.wrongPhotos?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-2">Wrong/Incorrect Photos ({test.wrongPhotos!.length})</p>
                        <div className="grid grid-cols-2 gap-2">
                          {test.wrongPhotos!.map((p, j) => {
                            const src = typeof p === "string" ? p : p?.data || p?.url
                            return src ? (
                              <img key={j} src={src} alt={`Wrong ${j + 1}`} onClick={() => setSelectedImage({src, alt: `Wrong ${j + 1}`})} onError={(e) => { e.currentTarget.style.display = "none" }} className="w-full h-24 object-cover rounded-lg border border-red-200 cursor-pointer transition-transform hover:scale-[1.02]" />
                            ) : null
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No tests recorded.</p>
        )}
        <PhotoGrid photos={fd.testingPhotos} label="Testing Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
      </Section>

      {/* Section 7: Documentation */}
      <Section title="Section 7 — Documentation" icon={Camera} accent="bg-sky-50 text-sky-800">
        <div className="mb-4">
          <InfoRow label="Inspector Signature" value={fd.inspectorSignature} />
        </div>
        <PhotoGrid photos={fd.documentationPhotos} label="General Documentation Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
        <PhotoGrid photos={fd.photocopyDocuments} label="Photocopy Documents" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
        <PhotoGrid photos={fd.companyIdCards} label="Company ID Cards" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
      </Section>

      {/* Selfie Verification */}
      {(fd.beforeSelfiePhoto || fd.afterSelfiePhoto) && (
        <Section title="Selfie Verification" icon={Camera} accent="bg-violet-50 text-violet-800">
          <div className="flex flex-wrap gap-6">
            {([
              { key: 'before', photo: fd.beforeSelfiePhoto, takenAt: fd.beforeSelfieTakenAt, label: 'Before Inspection' },
              { key: 'after',  photo: fd.afterSelfiePhoto,  takenAt: fd.afterSelfieTakenAt,  label: 'After Inspection'  },
            ] as const).map(({ key, photo, takenAt, label }) => {
              const src = (photo as any)?.data || (photo as any)?.url || (typeof photo === 'string' ? photo : null)
              if (!src) return null
              return (
                <div key={key} className="flex flex-col items-center gap-2">
                  <div className="relative w-44 rounded-2xl overflow-hidden border-2 border-violet-200 shadow-md" style={{ aspectRatio: '0.8' }}>
                    <img
                      src={src}
                      alt={label}
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-violet-900/70 text-white text-[10px] font-bold text-center py-1 px-2">
                      {label}
                    </div>
                  </div>
                  {takenAt && (
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(takenAt as string).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Section 8: Review & Decision */}
      <Section title="Section 8 — Review & Final Decision" icon={Star} accent="bg-amber-50 text-amber-800">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm font-medium text-slate-700">Final Decision:</span>
          {fd.finalDecision === "Approved" ? (
            <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-100 px-4 py-1.5 rounded-full">
              <CheckCircle className="w-4 h-4" /> Approved
            </span>
          ) : fd.finalDecision === "Rejected" ? (
            <span className="flex items-center gap-1.5 text-sm font-bold text-red-700 bg-red-100 px-4 py-1.5 rounded-full">
              <XCircle className="w-4 h-4" /> Rejected
            </span>
          ) : (
            <span className="text-sm text-slate-400">{fd.finalDecision || "—"}</span>
          )}
        </div>
        {fd.reviewerRemarks && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-neutral-700 uppercase mb-1">Reviewer Remarks</p>
            <p className="text-sm text-neutral-900">{fd.reviewerRemarks}</p>
          </div>
        )}
      </Section>

      {/* Timestamps */}
      <div className="bg-white rounded-xl border border-slate-200 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Product Listed" value={product.createdAt ? new Date(product.createdAt).toLocaleString("en-IN") : undefined} />
          <InfoRow label="Inspected On" value={product.updatedAt ? new Date(product.updatedAt).toLocaleString("en-IN") : undefined} />
          <InfoRow label="Approval Status" value={statusLabels[status] || status} />
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
