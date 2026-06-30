"use client"

import { Upload, X, FileText, Download, PenLine, CheckCircle2, Loader2, RotateCcw, User, ChevronDown } from "lucide-react"
import { useRef, useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import SignatureCanvas from "react-signature-canvas"
import type SignatureCanvasType from "react-signature-canvas"
import { qcCheckerService } from "@/services/qcCheckerService"
import {
  generateProductInspectionPdf,
  pdfFileName,
  type ReportMeta,
} from "@/lib/productInspectionReportPdf"

// Compress image before storing to keep payload manageable
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

// Read any file as a data URL (used for PDFs which cannot go through canvas)
const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

interface DocumentationProps {
  // The whole inspection formData is passed in; we read across many steps to
  // build the report, so keep this permissive.
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const statusButtonRef = useRef<HTMLButtonElement | null>(null)
  const statusMenuRef = useRef<HTMLDivElement | null>(null)

  const checker = qcCheckerService.getCheckerData?.() || null
  const inspectorName = checker?.name || formData.inspectorSignature || ''

  const INSPECTION_STATUS_OPTIONS = ['Approved', 'Rejected', 'On Hold', 'Re-Inspection']

  // Outside-click: close if click is outside both the trigger button and the portal menu
  useEffect(() => {
    if (!showStatusDropdown) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const inButton = statusButtonRef.current?.contains(target)
      const inMenu = statusMenuRef.current?.contains(target)
      if (!inButton && !inMenu) setShowStatusDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showStatusDropdown])

  // Compute portal position when dropdown opens; close on scroll/resize
  useEffect(() => {
    if (!showStatusDropdown || !statusButtonRef.current) return
    const rect = statusButtonRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    const close = () => setShowStatusDropdown(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [showStatusDropdown])
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [sigCanvasSize, setSigCanvasSize] = useState({ width: 460, height: 200 })

  // Best-effort GPS capture for the report's location field. Silent on failure.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => { },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  // Measure the canvas container width when the signature modal opens
  useEffect(() => {
    if (!showSignModal) return
    const measure = () => {
      if (sigCanvasContainerRef.current) {
        const w = sigCanvasContainerRef.current.clientWidth
        if (w > 0) setSigCanvasSize({ width: w, height: Math.round(w * 0.42) })
      }
    }
    // Small delay lets the modal finish painting before measuring
    const t = setTimeout(measure, 50)
    window.addEventListener("resize", measure)
    return () => { clearTimeout(t); window.removeEventListener("resize", measure) }
  }, [showSignModal])

  const buildMeta = (): ReportMeta => {
    const checker = qcCheckerService.getCheckerData?.() || null
    return {
      productName: formData?.items?.[0]?.itemName || formData?.vendor || "Product",
      vendorName: formData?.vendor || formData?.factory || "",
      checker: checker
        ? {
          name: checker.name,
          checkerId: checker.checkerId,
          email: checker.email,
          phone: checker.phone || checker.mobile || checker.businessPhone,
        }
        : null,
      location: coords,
      generatedAt: new Date(),
    }
  }

  // ── General Document: download the (unsigned) overview PDF ───────────────────
  const handleDownloadPdf = (signatureDataUrl?: string) => {
    const meta = buildMeta()
    const doc = generateProductInspectionPdf(formData, meta, {
      clientSignatureDataUrl: signatureDataUrl || null,
    })
    doc.save(pdfFileName(meta, !!signatureDataUrl))
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
    setFormData({
      ...formData,
      signedDocuments: [...(formData.signedDocuments || []), ...newDocs],
    })
    if (e.target) e.target.value = ""
  }

  const removeSignedDoc = (id: number | string) => {
    setFormData({
      ...formData,
      signedDocuments: (formData.signedDocuments || []).filter((d: any) => d.id !== id),
    })
  }

  // ── Digital signed report: capture pad → merge → generate ───────────────────
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
      setFormData({
        ...formData,
        clientSignature: sigDataUrl,
        signedReport: [{ name, url: pdfDataUrl, data: pdfDataUrl, id: Date.now() }],
      })
      setShowSignModal(false)
    } finally {
      setGenerating(false)
    }
  }, [formData, setFormData]) // eslint-disable-line react-hooks/exhaustive-deps

  const downloadSignedReport = () => {
    const report = (formData.signedReport || [])[0]
    if (!report?.data) return
    const a = document.createElement("a")
    a.href = report.data
    a.download = report.name || "signed-inspection-report.pdf"
    a.click()
  }

  const clearSignedReport = () => {
    setFormData({ ...formData, clientSignature: "", signedReport: [] })
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

      {/* Two sign-off paths */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Document */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">General Document</h3>
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

        {/* Digital Signed Report */}
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

      {/* Requirement hint */}
      <div
        className={`rounded-xl px-4 py-3 text-sm border ${hasSignedDoc || hasSignedReport
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

      {/* ── Inspector Details ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-bold text-slate-800">Inspector Details</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {/* Inspector Name — auto-filled */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Inspector Name</p>
              <div className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 text-sm">
                {inspectorName || '—'}
              </div>
            </div>
            {/* Inspection Date — auto-filled */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Inspection Date</p>
              <div className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 text-sm">
                {formData.serviceStartDate || new Date().toISOString().split('T')[0]}
              </div>
            </div>
            {/* Inspection Status — required dropdown (portal-rendered to escape overflow:hidden) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Inspection Status <span className="text-red-500">*</span>
              </label>
              <button
                ref={statusButtonRef}
                type="button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`w-full px-4 py-3 border rounded-xl bg-white text-left flex items-center justify-between text-sm transition-all duration-200 ${
                  errors.inspectionStatus
                    ? 'border-red-500 bg-red-50/40'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <span className={formData.inspectionStatus ? 'text-slate-900' : 'text-slate-400'}>
                  {formData.inspectionStatus || 'Select status…'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </button>
              {errors.inspectionStatus && (
                <p className="mt-1.5 text-xs text-red-600">{errors.inspectionStatus}</p>
              )}
              {showStatusDropdown && dropdownPos && typeof document !== 'undefined' && createPortal(
                <div
                  ref={statusMenuRef}
                  style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
                  className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                >
                  {INSPECTION_STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, inspectionStatus: status })
                        setShowStatusDropdown(false)
                      }}
                      className={`block w-full px-4 py-2.5 text-sm text-left transition-colors ${
                        formData.inspectionStatus === status
                          ? 'bg-brand-50 text-brand-600 font-semibold border-l-2 border-brand-500'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Document Center modal ─────────────────────────────────────────────── */}
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
              <h3 className="font-bold text-slate-900">Inspection Report</h3>
              <button onClick={() => setShowDocModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <p className="text-sm text-slate-600 mb-3">
                  Download the complete report (all inspection data, attached documents, checker details, location &amp; time, with a blank client-signature space).
                </p>
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
                          <a
                            href={doc.url || doc.data}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square flex flex-col items-center justify-center gap-1.5 bg-slate-50 rounded-lg border border-slate-200 hover:border-brand-400 transition-colors p-2"
                          >
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

      {/* ── Signature Center modal ────────────────────────────────────────────── */}
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
              {/* Signature pad */}
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

              {/* Already-captured signature preview (when re-opening) */}
              {formData.clientSignature && !hasSignedReport && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-xs font-medium text-slate-500 shrink-0">Saved:</span>
                  <img
                    src={formData.clientSignature}
                    alt="Saved signature"
                    className="h-10 object-contain"
                  />
                </div>
              )}

              {/* Generated report actions */}
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
