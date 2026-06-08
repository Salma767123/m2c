"use client"

import { Upload, X, FileText, Download, PenLine, CheckCircle2, Loader2, IdCard } from "lucide-react"
import { useRef, useState, useEffect } from "react"
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

interface DocumentationProps {
  // The whole inspection formData is passed in; we read across many steps to
  // build the report, so keep this permissive.
  formData: any
  setFormData: (data: any) => void
}

export default function Documentation({ formData, setFormData }: DocumentationProps) {
  const companyIdInputRef = useRef<HTMLInputElement | null>(null)
  const signedDocInputRef = useRef<HTMLInputElement | null>(null)
  const clientSigInputRef = useRef<HTMLInputElement | null>(null)

  const [showDocModal, setShowDocModal] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  // Best-effort GPS capture for the report's location field. Silent on failure.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => { },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

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
        const data = await compressImage(file)
        return { file, name: file.name, url: data, data, id: Date.now() + Math.random() }
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

  // ── Digital signed report: upload client signature → merge → generate ────────
  const handleClientSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setGenerating(true)
    try {
      const sigDataUrl = await compressImage(file, 600, 0.85)
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
    } finally {
      setGenerating(false)
      if (e.target) e.target.value = ""
    }
  }

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

  const handleCompanyIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newImages = await Promise.all(
      files.map(async (file) => {
        const data = await compressImage(file)
        return { file, name: file.name, url: data, data, id: Date.now() + Math.random() }
      })
    )
    setFormData({
      ...formData,
      companyIdCards: [...(formData.companyIdCards || []), ...newImages],
    })
    if (e.target) e.target.value = ""
  }

  const removeCompanyIdCard = (id: number | string) => {
    setFormData({
      ...formData,
      companyIdCards: (formData.companyIdCards || []).filter((d: any) => d.id !== id),
    })
  }

  const signedDocs = formData.signedDocuments || []
  const signedReport = formData.signedReport || []
  const companyIds = formData.companyIdCards || []
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
              <p className="text-sm text-slate-600">Upload the client&apos;s signature to auto-generate a digitally-signed report.</p>
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
          : "bg-amber-50 border-amber-200 text-amber-700"
          }`}
      >
        {hasSignedDoc || hasSignedReport
          ? "A signed document is attached. You can submit the inspection."
          : "At least one signed document is required — upload a signed copy or generate the digitally-signed report."}
      </div>

      {/* Company ID Card */}
      <div>
        <label className="flex items-center gap-2 text-slate-700 font-semibold mb-3 text-sm">
          <IdCard className="w-4 h-4 text-brand-600" />
          Company ID Card <span className="text-red-500">*</span>
        </label>
        <p className="text-slate-600 text-xs mb-3">Required: identification card of the person met on-site</p>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-brand-400 transition-colors cursor-pointer bg-slate-50/50 max-w-md">
          <input
            ref={companyIdInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleCompanyIdUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => companyIdInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full"
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-700 font-medium text-sm">Upload ID card</p>
          </button>
        </div>
        {companyIds.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4 max-w-2xl">
            {companyIds.map((image: any, index: number) => (
              <div key={image.id || index} className="relative group">
                <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <img src={image.url || image.data} alt={`ID ${index + 1}`} className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => removeCompanyIdCard(image.id)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
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
                <p className="text-slate-500 text-xs mb-3">After the client signs the printed report, upload the scanned copy here.</p>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-brand-400 transition-colors cursor-pointer bg-slate-50/50">
                  <input
                    ref={signedDocInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleSignedDocUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => signedDocInputRef.current?.click()}
                    className="flex flex-col items-center justify-center w-full"
                  >
                    <Upload className="w-7 h-7 text-slate-400 mb-2" />
                    <p className="text-slate-700 font-medium text-sm">Upload signed copy</p>
                  </button>
                </div>
                {signedDocs.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {signedDocs.map((image: any, index: number) => (
                      <div key={image.id || index} className="relative group">
                        <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                          <img src={image.url || image.data} alt={`Signed ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSignedDoc(image.id)}
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
              <h3 className="font-bold text-slate-900">Digital Signed Report</h3>
              <button onClick={() => setShowSignModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <p className="text-sm text-slate-600">
                Upload an image of the client&apos;s signature. It will be merged into the full report and a digitally-signed PDF is generated automatically.
              </p>

              {/* Step 1: signature upload */}
              <div>
                <label className="block text-slate-700 font-semibold mb-2 text-sm">Client&apos;s digital signature</label>
                <div className="border-2 border-dashed border-brand-300 rounded-xl p-6 text-center hover:border-brand-400 transition-colors cursor-pointer bg-brand-50/40">
                  <input
                    ref={clientSigInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleClientSignatureUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => clientSigInputRef.current?.click()}
                    disabled={generating}
                    className="flex flex-col items-center justify-center w-full disabled:opacity-60"
                  >
                    {generating ? (
                      <Loader2 className="w-7 h-7 text-brand-500 mb-2 animate-spin" />
                    ) : (
                      <PenLine className="w-7 h-7 text-brand-500 mb-2" />
                    )}
                    <p className="text-slate-700 font-medium text-sm">
                      {generating ? "Generating signed report…" : "Upload signature image"}
                    </p>
                  </button>
                </div>
              </div>

              {/* Signature preview */}
              {formData.clientSignature && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">Signature:</span>
                  <img
                    src={formData.clientSignature}
                    alt="Client signature"
                    className="h-14 object-contain border border-slate-200 rounded-lg bg-white px-2"
                  />
                </div>
              )}

              {/* Step 2: generated report */}
              {hasSignedReport && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-3">
                    <CheckCircle2 className="w-4 h-4" /> Digitally-signed report generated
                  </div>
                  <div className="flex gap-3">
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
                      <X className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setShowSignModal(false)}
                className="w-full px-4 py-2.5 rounded-xl font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
