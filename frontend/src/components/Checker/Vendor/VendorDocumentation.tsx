"use client"

import { Upload, X, FileText, Download, PenLine, CheckCircle2, Loader2, RotateCcw } from "lucide-react"
import { useRef, useState, useEffect, useCallback } from "react"
import SignatureCanvas from "react-signature-canvas"
import type SignatureCanvasType from "react-signature-canvas"
import { qcCheckerService } from "@/services/qcCheckerService"
import { generateFactoryInspectionPdf, pdfFileName } from "@/lib/factoryInspectionReportPdf"
import type { Verifications } from "@/components/Checker/Vendor/Steps/VI_VerifyField"
import type { InspectorMeta } from "@/components/Checker/Vendor/Steps/VI_Step8_FinalReview"
import type { FactoryEvidenceState } from "@/components/Checker/Vendor/Steps/VI_Step2_WarehouseFactory"

const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let { width, height } = img
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth }
        canvas.width = width; canvas.height = height
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

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

export interface VendorDocData {
  signedDocuments: any[]
  signedReport: any[]
  clientSignature: string
}

interface Props {
  vendor: any
  verifications: Verifications
  meta: InspectorMeta
  docData: VendorDocData
  onDocDataChange: (patch: Partial<VendorDocData>) => void
  errors?: Record<string, string>
  factoryEvidence?: FactoryEvidenceState | null
}

export default function VendorDocumentation({ vendor, verifications, meta, docData, onDocDataChange, errors = {}, factoryEvidence }: Props) {
  const signedDocInputRef = useRef<HTMLInputElement | null>(null)
  const sigPadRef = useRef<SignatureCanvasType | null>(null)
  const sigCanvasContainerRef = useRef<HTMLDivElement | null>(null)

  const [showDocModal, setShowDocModal] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sigCanvasSize, setSigCanvasSize] = useState({ width: 460, height: 200 })
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => { },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  useEffect(() => {
    if (!showSignModal) return
    const measure = () => {
      if (sigCanvasContainerRef.current) {
        const w = sigCanvasContainerRef.current.clientWidth
        if (w > 0) setSigCanvasSize({ width: w, height: Math.round(w * 0.42) })
      }
    }
    const t = setTimeout(measure, 50)
    window.addEventListener("resize", measure)
    return () => { clearTimeout(t); window.removeEventListener("resize", measure) }
  }, [showSignModal])

  const checker = qcCheckerService.getCheckerData?.() || null

  const buildMeta = () => ({
    inspectorName: meta.inspectorName || checker?.name || '',
    inspectionDate: meta.inspectionDate,
    overallResult: meta.overallResult,
    inspectorRemarks: meta.inspectorRemarks,
    checker: checker ? { name: checker.name, checkerId: checker.checkerId, email: checker.email, phone: checker.phone || checker.mobile } : null,
    location: coords,
    generatedAt: new Date(),
  })

  const gatherFactoryImages = async () => {
    // Vendor registration factory photos (stored as documents with type OTHER)
    const vendorDocs: any[] = Array.isArray(vendor?.documents) ? vendor.documents : []
    const vendorFactoryDocs = vendorDocs.filter((d: any) => d.type === 'OTHER' && d.documentUrl)
    const vendorResults = await Promise.all(
      vendorFactoryDocs.map(async (d: any) => {
        const dataUrl = await fetchImgDataUrl(d.documentUrl)
        return dataUrl ? { label: d.name || 'Factory Image', dataUrl } : null
      })
    )
    const vendorFactoryImages = vendorResults.filter((x): x is { label: string; dataUrl: string } => x !== null)

    // Inspector evidence photos (base64 data URLs captured in the crop modal)
    const inspectorEvidenceImages: Array<{ label: string; dataUrl: string }> = []
    if (factoryEvidence?.frontView?.url) inspectorEvidenceImages.push({ label: 'Front View', dataUrl: factoryEvidence.frontView.url })
    if (factoryEvidence?.nameBoard?.url) inspectorEvidenceImages.push({ label: 'Name Board', dataUrl: factoryEvidence.nameBoard.url })
    if (factoryEvidence?.routeMap?.url)  inspectorEvidenceImages.push({ label: 'Route Map',  dataUrl: factoryEvidence.routeMap.url })

    return { vendorFactoryImages, inspectorEvidenceImages }
  }

  const handleDownloadPdf = async (signatureDataUrl?: string) => {
    const reportMeta = buildMeta()
    const { vendorFactoryImages, inspectorEvidenceImages } = await gatherFactoryImages()
    const docPdf = generateFactoryInspectionPdf(vendor, verifications, reportMeta, {
      clientSignatureDataUrl: signatureDataUrl || null,
      vendorFactoryImages: vendorFactoryImages.length > 0 ? vendorFactoryImages : null,
      inspectorEvidenceImages: inspectorEvidenceImages.length > 0 ? inspectorEvidenceImages : null,
    })
    docPdf.save(pdfFileName(reportMeta, !!signatureDataUrl))
  }

  const handleSignedDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newDocs = await Promise.all(
      files.map(async (file) => {
        const isPdf = file.type === "application/pdf"
        const data = isPdf ? await readFileAsDataUrl(file) : await compressImage(file)
        return { file, name: file.name, url: data, data, isPdf, id: Date.now() + Math.random() }
      })
    )
    onDocDataChange({ signedDocuments: [...(docData.signedDocuments || []), ...newDocs] })
    if (e.target) e.target.value = ""
  }

  const removeSignedDoc = (id: number | string) => {
    onDocDataChange({ signedDocuments: (docData.signedDocuments || []).filter((d: any) => d.id !== id) })
  }

  const handleConfirmSignature = useCallback(async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) return
    setGenerating(true)
    try {
      const sigDataUrl = sigPadRef.current.toDataURL("image/png")
      const reportMeta = buildMeta()
      const { vendorFactoryImages, inspectorEvidenceImages } = await gatherFactoryImages()
      const docPdf = generateFactoryInspectionPdf(vendor, verifications, reportMeta, {
        clientSignatureDataUrl: sigDataUrl,
        vendorFactoryImages: vendorFactoryImages.length > 0 ? vendorFactoryImages : null,
        inspectorEvidenceImages: inspectorEvidenceImages.length > 0 ? inspectorEvidenceImages : null,
      })
      const pdfDataUrl = docPdf.output("datauristring")
      const name = pdfFileName(reportMeta, true)
      onDocDataChange({
        clientSignature: sigDataUrl,
        signedReport: [{ name, url: pdfDataUrl, data: pdfDataUrl, id: Date.now() }],
      })
      setShowSignModal(false)
    } finally {
      setGenerating(false)
    }
  }, [vendor, verifications, meta, coords]) // eslint-disable-line react-hooks/exhaustive-deps

  const downloadSignedReport = () => {
    const report = (docData.signedReport || [])[0]
    if (!report?.data) return
    const a = document.createElement("a")
    a.href = report.data
    a.download = report.name || "factory-inspection-report-signed.pdf"
    a.click()
  }

  const clearSignedReport = () => {
    onDocDataChange({ clientSignature: "", signedReport: [] })
  }

  const signedDocs = docData.signedDocuments || []
  const signedReport = docData.signedReport || []
  const hasSignedDoc = signedDocs.length > 0
  const hasSignedReport = signedReport.length > 0

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Documentation & Sign-off</h2>
        <p className="text-slate-600">Generate the factory inspection report, capture the client&apos;s signature, and finalise.</p>
      </div>

      {/* Two sign-off paths */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Manual Document</h3>
              <p className="text-sm text-slate-600">Download the full report PDF, then upload the manually-signed copy.</p>
            </div>
          </div>
          {hasSignedDoc && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 mb-3">
              <CheckCircle2 className="w-4 h-4" /> {signedDocs.length} signed document{signedDocs.length > 1 ? "s" : ""} uploaded
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowDocModal(true)}
            className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white transition-colors shadow-sm shadow-brand-500/10"
          >
            <FileText className="w-4 h-4" /> Open Document Center
          </button>
        </div>

        {/* Digital */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <PenLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Digital Signed Report</h3>
              <p className="text-sm text-slate-600">Draw the client&apos;s signature on-screen to auto-generate a digitally-signed report.</p>
            </div>
          </div>
          {hasSignedReport && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 mb-3">
              <CheckCircle2 className="w-4 h-4" /> Signed report generated
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSignModal(true)}
            className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 transition-colors"
          >
            <PenLine className="w-4 h-4" /> Open Signature Center
          </button>
        </div>
      </div>

      {/* Status hint */}
      <div className={`rounded-xl px-4 py-3 text-sm border ${
        hasSignedDoc || hasSignedReport
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : errors.signedDocuments
            ? "bg-red-50 border-red-300 text-red-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
      }`}>
        {hasSignedDoc || hasSignedReport
          ? "A signed document is attached. You can submit the inspection."
          : errors.signedDocuments || "At least one signed document is required — upload a signed copy or generate the digitally-signed report."}
      </div>

      {/* Document Center modal */}
      {showDocModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowDocModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Factory Inspection Report</h3>
              <button onClick={() => setShowDocModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <p className="text-sm text-slate-600 mb-3">Download the complete factory inspection report (all vendor data, verification results, inspector details, signature block).</p>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white transition-colors shadow-sm shadow-brand-500/10"
                >
                  <Download className="w-4 h-4" /> Download as PDF
                </button>
              </div>
              <div className="border-t border-slate-100 pt-5">
                <label className="block text-slate-700 font-semibold mb-1 text-sm">Upload signed document</label>
                <p className="text-slate-500 text-xs mb-3">After the client signs the printed report, upload the scanned copy here. Accepted: PDF, PNG, JPG.</p>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-brand-400 transition-colors cursor-pointer bg-slate-50/50">
                  <input
                    ref={signedDocInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/jpg,application/pdf,.pdf"
                    onChange={handleSignedDocUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => signedDocInputRef.current?.click()}
                    className="flex flex-col items-center justify-center w-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-xl"
                  >
                    <Upload className="w-7 h-7 text-slate-400 mb-2" />
                    <p className="text-slate-700 font-medium text-sm">Upload signed copy</p>
                    <p className="text-slate-400 text-xs mt-1">PDF, PNG, JPG</p>
                  </button>
                </div>
                {signedDocs.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {signedDocs.map((doc: any, index: number) => (
                      <div key={doc.id || index} className="relative group">
                        {doc.isPdf ? (
                          <a href={doc.url || doc.data} target="_blank" rel="noopener noreferrer"
                             className="aspect-square flex flex-col items-center justify-center gap-1.5 bg-slate-50 rounded-lg border border-slate-200 hover:border-brand-400 transition-colors p-2">
                            <FileText className="w-7 h-7 text-red-500 shrink-0" />
                            <span className="text-xs text-slate-600 text-center leading-tight line-clamp-2 break-all">{doc.name}</span>
                          </a>
                        ) : (
                          <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                            <img src={doc.url || doc.data} alt={`Signed ${index + 1}`} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeSignedDoc(doc.id)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setShowDocModal(false)}
                className="w-full px-4 py-2.5 rounded-xl font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Center modal */}
      {showSignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowSignModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900">Client Signature</h3>
                <p className="text-xs text-slate-500 mt-0.5">Draw signature using finger, stylus, or mouse</p>
              </div>
              <button onClick={() => setShowSignModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-700 font-semibold text-sm">Sign below</label>
                  <button
                    type="button"
                    onClick={() => sigPadRef.current?.clear()}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Clear
                  </button>
                </div>
                <div
                  ref={sigCanvasContainerRef}
                  className="w-full rounded-xl border-2 border-brand-300 bg-slate-50 overflow-hidden touch-none"
                  style={{ height: sigCanvasSize.height }}
                >
                  <SignatureCanvas
                    ref={sigPadRef}
                    penColor="#1e293b"
                    canvasProps={{
                      width: sigCanvasSize.width,
                      height: sigCanvasSize.height,
                      style: { width: "100%", height: "100%", display: "block" },
                    }}
                    backgroundColor="rgb(248,250,252)"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">Use your finger, stylus, or mouse to draw your signature</p>
              </div>
              {docData.clientSignature && !hasSignedReport && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Saved:</span>
                  <img src={docData.clientSignature} alt="Saved signature" className="h-10 object-contain" />
                </div>
              )}
              {hasSignedReport && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-3">
                    <CheckCircle2 className="w-4 h-4" /> Digitally-signed report generated
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={downloadSignedReport}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-brand-500 hover:bg-brand-600 text-white text-sm transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download report
                    </button>
                    <button
                      type="button"
                      onClick={clearSignedReport}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm transition-colors"
                    >
                      <X className="w-4 h-4" /> Re-sign
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignature}
                disabled={generating}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white transition-colors disabled:opacity-60"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Confirm &amp; Generate Report</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
