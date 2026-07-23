"use client"

import { Upload, X, FileText, PenLine, CheckCircle2, Loader2, RotateCcw, Eye, Trash2, Download } from "lucide-react"
import { useRef, useState, useEffect, useCallback } from "react"
import SignatureCanvas from "react-signature-canvas"
import type SignatureCanvasType from "react-signature-canvas"
import { qcCheckerService } from "@/services/qcCheckerService"
import { formatCheckerName } from "@/lib/checkerUtils"
import {
  generateProductInspectionPdf,
  pdfFileName,
  type ReportMeta,
} from "@/lib/productInspectionReportPdf"
import { showSuccessToast } from "@/lib/toast-utils"
import { GEOFENCE_DISABLED, getCurrentCoords } from "@/lib/checkerLocation"

const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

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

interface DocumentationProps {
  formData: any
  setFormData: (data: any) => void
  errors?: Record<string, string>
}

export default function Documentation({ formData, setFormData, errors = {} }: DocumentationProps) {
  const signedDocInputRef = useRef<HTMLInputElement | null>(null)
  const sigPadRef = useRef<SignatureCanvasType | null>(null)
  const sigCanvasContainerRef = useRef<HTMLDivElement | null>(null)

  const [showDocModal, setShowDocModal] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [hasDownloaded, setHasDownloaded] = useState(false)
  const [sigCanvasSize, setSigCanvasSize] = useState({ width: 460, height: 200 })
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [confirmRemoveDoc, setConfirmRemoveDoc] = useState(false)
  const [confirmRemoveReport, setConfirmRemoveReport] = useState(false)

  // Position for the report's "GPS Location" row. Best-effort — a failure must not
  // block report generation; the submit path captures its own reading and is the one
  // that actually enforces the geofence.
  useEffect(() => {
    if (GEOFENCE_DISABLED) return
    getCurrentCoords().then(setCoords).catch(() => { })
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

  const buildMeta = (): ReportMeta => {
    // Prefer live assignedQc from the product API response (always current from DB).
    // Fall back to cached localStorage data only if assignedQc is unavailable.
    const liveQc = formData?.productData?.assignedQc || null
    const cachedChecker = qcCheckerService.getCheckerData?.() || null
    const checker = liveQc || cachedChecker
    return {
      productName: formData?.items?.[0]?.itemName || formData?.vendor || "Product",
      vendorName: formData?.vendor || formData?.factory || "",
      checker: checker
        ? {
          name: formatCheckerName(checker),
          checkerId: checker.checkerId,
          email: checker.email,
          phone: checker.phone || (checker as any).mobile || (checker as any).businessPhone,
        }
        : null,
      location: coords,
      // Pass the inspection start time so the signed PDF prints it too — the
      // report-page download already did, but buildMeta() omitted it (F-13).
      inspectionStartedAt: formData?.inspectionStartedAt,
      generatedAt: new Date(),
    }
  }

  const handleDownloadReport = async () => {
    setDownloading(true)
    try {
      const meta = buildMeta()
      const doc = generateProductInspectionPdf(formData, meta, { clientSignatureDataUrl: null })
      doc.save(pdfFileName(meta, false))
      setHasDownloaded(true)
    } finally {
      setDownloading(false)
    }
  }

  const handleSignedDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isPdf = file.type === "application/pdf"
    const data = isPdf ? await readFileAsDataUrl(file) : await compressImage(file)
    setFormData((prev: any) => ({
      ...prev,
      signedDocuments: [{ file, name: file.name, url: data, data, isPdf, id: Date.now() }],
    }))
    if (e.target) e.target.value = ""
    setShowDocModal(false)
    setHasDownloaded(false)
    showSuccessToast("Signed document uploaded successfully.")
  }

  const viewManualDoc = () => {
    const doc = signedDocs[0]
    if (!doc?.data) return
    const mimeType = doc.isPdf ? "application/pdf" : "image/jpeg"
    openDataUriInTab(doc.data, mimeType)
  }

  const removeManualDoc = () => {
    setFormData((prev: any) => ({ ...prev, signedDocuments: [] }))
    setConfirmRemoveDoc(false)
  }

  const handleConfirmSignature = useCallback(async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) return
    setGenerating(true)
    try {
      const sigDataUrl = sigPadRef.current.toDataURL("image/png")
      const meta = buildMeta()
      const doc = generateProductInspectionPdf(formData, meta, {
        clientSignatureDataUrl: sigDataUrl,
      })
      const pdfDataUrl = doc.output("datauristring")
      const name = pdfFileName(meta, true)
      setFormData((prev: any) => ({
        ...prev,
        clientSignature: sigDataUrl,
        signedReport: [{ name, url: pdfDataUrl, data: pdfDataUrl, id: Date.now() }],
      }))
      setShowSignModal(false)
    } finally {
      setGenerating(false)
    }
  }, [formData, setFormData]) // eslint-disable-line react-hooks/exhaustive-deps

  const viewSignedReport = () => {
    const report = (formData.signedReport || [])[0]
    if (!report?.data) return
    openDataUriInTab(report.data, "application/pdf")
  }

  const removeSignedReport = () => {
    setFormData((prev: any) => ({ ...prev, clientSignature: "", signedReport: [] }))
    setConfirmRemoveReport(false)
  }

  const closeDocModal = () => {
    setShowDocModal(false)
    setHasDownloaded(false)
  }

  const signedDocs = formData.signedDocuments || []
  const signedReport = formData.signedReport || []
  const hasSignedDoc = signedDocs.length > 0
  const hasSignedReport = signedReport.length > 0

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Final Documentation &amp; Sign-off</h2>
        <p className="text-slate-600">Generate the inspection report, capture the client&apos;s signature, and submit.</p>
      </div>

      {/* Two sign-off paths — mutually exclusive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Manual Document ── */}
        <div className={`rounded-2xl border bg-white p-6 flex flex-col gap-4 transition-opacity ${hasSignedReport ? "opacity-40 pointer-events-none select-none" : "border-slate-200"}`}>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Manual Signed Document</h3>
              <p className="text-sm text-slate-600">Download the report, get it signed, then upload the scanned copy.</p>
            </div>
          </div>

          {hasSignedDoc ? (
            <div className="space-y-3 mt-auto">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-bold text-emerald-800">Final Signed Document Uploaded</span>
              </div>

              {confirmRemoveDoc ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-sm font-semibold text-red-700">Remove this document?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={removeManualDoc}
                      className="flex-1 px-3 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white text-sm transition-colors"
                    >
                      Yes, Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveDoc(false)}
                      className="flex-1 px-3 py-2 rounded-lg font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={viewManualDoc}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white transition-colors shadow-sm shadow-brand-500/10"
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveDoc(true)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                    title="Remove document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDocModal(true)}
              className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white transition-colors shadow-sm shadow-brand-500/10"
            >
              <FileText className="w-4 h-4" /> Open Document Center
            </button>
          )}
        </div>

        {/* ── Digital Signed Report ── */}
        <div className={`rounded-2xl border bg-white p-6 flex flex-col gap-4 transition-opacity ${hasSignedDoc ? "opacity-40 pointer-events-none select-none" : "border-slate-200"}`}>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <PenLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Digital Signed Report</h3>
              <p className="text-sm text-slate-600">Draw the client&apos;s signature on-screen to auto-generate a digitally-signed report.</p>
            </div>
          </div>

          {hasSignedReport ? (
            <div className="space-y-3 mt-auto">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Signed report generated
              </div>

              {confirmRemoveReport ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-sm font-semibold text-red-700">Remove signed report and signature?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={removeSignedReport}
                      className="flex-1 px-3 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white text-sm transition-colors"
                    >
                      Yes, Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveReport(false)}
                      className="flex-1 px-3 py-2 rounded-lg font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={viewSignedReport}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white transition-colors shadow-sm shadow-brand-500/10"
                  >
                    <Eye className="w-4 h-4" /> View Signed Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveReport(true)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                    title="Remove signed report"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSignModal(true)}
              className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 transition-colors"
            >
              <PenLine className="w-4 h-4" /> Open Signature Center
            </button>
          )}
        </div>
      </div>

      {/* Status hint */}
      <div
        data-invalid={!hasSignedDoc && !hasSignedReport && errors.signedDocuments ? 'true' : undefined}
        className={`scroll-mt-24 rounded-xl px-4 py-3 text-sm border ${hasSignedDoc || hasSignedReport
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : errors.signedDocuments
            ? "bg-red-50 border-red-300 text-red-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
          }`}
      >
        {hasSignedDoc || hasSignedReport
          ? "A signed document is attached. You can submit the inspection."
          : errors.signedDocuments || "At least one signed document is required — upload a signed copy or generate the digitally-signed report."}
      </div>

      {/* ── Document Center modal ── */}
      {showDocModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeDocModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Document Center</h3>
              <button onClick={closeDocModal} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Step 1: Download Report */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <p className="text-sm font-bold text-slate-800">Download Inspection Report</p>
                </div>
                <p className="text-xs text-slate-500 pl-8">
                  Download the report, print it, have it signed by the client, then scan it.
                </p>
                <div className="pl-8">
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white transition-colors shadow-sm shadow-brand-500/10 disabled:opacity-60"
                  >
                    {downloading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
                    ) : (
                      <><Download className="w-4 h-4" /> Download Inspection Report</>
                    )}
                  </button>
                  {hasDownloaded && (
                    <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Report downloaded
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2: Upload Signed Copy — only shown after download */}
              {hasDownloaded && (
                <div className="space-y-3 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                    <p className="text-sm font-bold text-slate-800">Upload Signed Copy</p>
                  </div>
                  <p className="text-xs text-slate-500 pl-8">
                    Upload the scanned, signed copy. Accepted formats: PDF, PNG, JPG.
                  </p>
                  <input
                    ref={signedDocInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,application/pdf,.pdf"
                    onChange={handleSignedDocUpload}
                    className="hidden"
                  />
                  <div className="pl-8">
                    <div
                      className="border-2 border-dashed border-brand-300 rounded-xl p-6 text-center hover:border-brand-400 hover:bg-brand-50/50 transition-colors cursor-pointer"
                      onClick={() => signedDocInputRef.current?.click()}
                    >
                      <Upload className="w-7 h-7 text-brand-400 mb-2 mx-auto" />
                      <p className="text-slate-700 font-medium text-sm">Click to upload signed copy</p>
                      <p className="text-slate-400 text-xs mt-1">PDF, PNG, JPG</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Signature Center modal ── */}
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
                <h3 className="font-bold text-slate-900">Signature Center</h3>
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
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Use your finger, stylus, or mouse to draw your signature
                </p>
              </div>
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