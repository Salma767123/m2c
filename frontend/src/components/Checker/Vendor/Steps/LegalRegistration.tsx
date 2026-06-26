"use client"

import { FileText, ExternalLink, CheckCircle, XCircle, MinusCircle } from "lucide-react"
import type { StepErrors } from "../validation"
import {
    READONLY_CLS,
    ErrorText,
    RequiredMark,
    inputCls,
} from "./fieldHelpers"

const isImageUrl = (url?: string | null) =>
    !!url && /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url)

const DOC_TYPE_LABELS: Record<string, string> = {
    COMPANY_REGISTRATION: "Company Registration",
    GST_CERTIFICATE: "GST Certificate",
    PAN_CARD: "PAN Card",
    AADHAAR_CARD: "Aadhaar Card",
    TRADE_LICENSE: "Trade License",
    EXPORT_LICENSE: "Export License",
    FACTORY_LICENSE: "Factory License",
    POLLUTION_CERTIFICATE: "Pollution Certificate",
    FIRE_SAFETY_CERTIFICATE: "Fire Safety Certificate",
    BANK_STATEMENT: "Bank Statement",
    AUDITED_FINANCIALS: "Audited Financials",
    PRODUCT_CATALOG: "Product Catalog",
    QUALITY_CERTIFICATES: "Quality Certificates",
    INSURANCE_CERTIFICATE: "Insurance Certificate",
    IEC_CERTIFICATE: "IEC Certificate",
}

// Maps document type to the corresponding registration number field in formData
const DOC_TYPE_TO_NUMBER: Record<string, { label: string; field: string }> = {
    GST_CERTIFICATE: { label: "GST No.", field: "gstTaxId" },
    PAN_CARD: { label: "PAN No.", field: "panNumber" },
    IEC_CERTIFICATE: { label: "IEC Code", field: "iecCode" },
    COMPANY_REGISTRATION: { label: "Company ID / CIN", field: "companyIdNumber" },
}

interface StepProps {
    formData: any
    setFormData: (data: any) => void
    errors?: StepErrors
    autofillSnapshot?: Record<string, boolean>
}

export default function LegalRegistration({ formData, setFormData, errors = {}, autofillSnapshot = {} }: StepProps) {
    const gstLocked = !!autofillSnapshot.gstTaxId

    // Legal docs for verification (factory images with type OTHER are on Step 1)
    const legalDocs = (Array.isArray(formData.vendorDocuments) ? formData.vendorDocuments : [])
        .filter((d: any) => d?.type && d.type !== "OTHER" && d?.documentUrl)

    const setDocVerification = (idx: number, field: "verified" | "remarks", value: string) => {
        const current = formData.docVerifications || {}
        setFormData({
            ...formData,
            docVerifications: {
                ...current,
                [idx]: {
                    verified: current[idx]?.verified ?? "",
                    remarks: current[idx]?.remarks ?? "",
                    [field]: value,
                },
            },
        })
    }

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Legal & Registration</h2>
                <p className="text-slate-600">
                    Verify business registration numbers and uploaded documents against on-site evidence.
                </p>
            </div>

            {/* ── Registration Numbers ────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* GST — editable only when vendor left it blank */}
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        GST Number{!gstLocked && <RequiredMark />}
                    </label>
                    {gstLocked ? (
                        <input
                            type="text"
                            value={formData.gstTaxId}
                            readOnly
                            aria-readonly="true"
                            className={`${READONLY_CLS} font-mono tracking-wide`}
                        />
                    ) : (
                        <>
                            <input
                                type="text"
                                value={formData.gstTaxId || ""}
                                onChange={(e) => setFormData({ ...formData, gstTaxId: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.gstTaxId}
                                className={`${inputCls(!!errors.gstTaxId)} font-mono`}
                            />
                            <ErrorText msg={errors.gstTaxId} />
                        </>
                    )}
                </div>

                {/* PAN — read-only from registration */}
                {formData.panNumber && (
                    <div>
                        <label className="block text-slate-700 font-semibold mb-3 text-sm">{formData.businessType === 'proprietorship' ? 'Proprietor PAN Number' : 'Company PAN Number'}</label>
                        <input
                            type="text"
                            value={formData.panNumber}
                            readOnly
                            aria-readonly="true"
                            className={`${READONLY_CLS} font-mono tracking-wide`}
                        />
                        <p className="text-xs text-slate-400 mt-1">From vendor registration — read only</p>
                    </div>
                )}

                {/* IEC Code — read-only from registration */}
                {formData.iecCode && (
                    <div>
                        <label className="block text-slate-700 font-semibold mb-3 text-sm">IEC Code</label>
                        <input
                            type="text"
                            value={formData.iecCode}
                            readOnly
                            aria-readonly="true"
                            className={`${READONLY_CLS} font-mono tracking-wide`}
                        />
                        <p className="text-xs text-slate-400 mt-1">Import / Export Code — from vendor registration</p>
                    </div>
                )}

                {/* CIN / Company ID — read-only from registration */}
                {formData.companyIdNumber && (
                    <div>
                        <label className="block text-slate-700 font-semibold mb-3 text-sm">
                            {formData.businessType === "pvt-ltd" ? "CIN" :
                             formData.businessType === "partnership-firm" ? "Partnership Deed No." :
                             formData.businessType === "llp" ? "LLPIN" : "Company ID Number"}
                        </label>
                        <input
                            type="text"
                            value={formData.companyIdNumber}
                            readOnly
                            aria-readonly="true"
                            className={`${READONLY_CLS} font-mono tracking-wide`}
                        />
                        <p className="text-xs text-slate-400 mt-1">From vendor registration — read only</p>
                    </div>
                )}
            </div>

            {/* ── Document Verification ───────────────────────────────── */}
            {legalDocs.length > 0 && (
                <div className="space-y-5">
                    <div className="border-b border-slate-200 pb-3">
                        <h3 className="text-lg font-bold text-slate-900">Registration Documents Verification</h3>
                        <p className="text-slate-500 text-sm">
                            Review each uploaded document against the on-site evidence and mark its verification status.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {legalDocs.map((doc: any, idx: number) => {
                            const isProp = formData.businessType === 'proprietorship'
                            const label = doc.type === 'PAN_CARD'
                                ? (isProp ? 'Proprietor PAN Card' : 'Company PAN Card')
                                : (DOC_TYPE_LABELS[doc.type] || doc.name || doc.type)
                            const numberMetaLabel = doc.type === 'PAN_CARD'
                                ? (isProp ? 'Proprietor PAN No.' : 'Company PAN No.')
                                : DOC_TYPE_TO_NUMBER[doc.type]?.label
                            const verif = (formData.docVerifications || {})[idx] || { verified: "", remarks: "" }
                            const isVerified = verif.verified === "yes"
                            const isRejected = verif.verified === "no"
                            const isUnchecked = !verif.verified || verif.verified === ""
                            const numberMeta = DOC_TYPE_TO_NUMBER[doc.type]
                            const docNumber = numberMeta ? formData[numberMeta.field] : null

                            return (
                                <div
                                    key={idx}
                                    className={`rounded-xl border-2 p-5 transition-all ${
                                        isVerified
                                            ? "border-emerald-300 bg-emerald-50/50"
                                            : isRejected
                                            ? "border-red-300 bg-red-50/40"
                                            : "border-slate-200 bg-white"
                                    }`}
                                >
                                    {/* Top row: thumbnail + name + number + open link */}
                                    <div className="flex items-start gap-4 mb-4">
                                        {isImageUrl(doc.documentUrl) ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={doc.documentUrl}
                                                alt={label}
                                                className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                                <FileText className="w-6 h-6 text-slate-400" />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-bold text-slate-900">{label}</p>
                                            {docNumber && (
                                                <p className="text-sm font-mono text-slate-600 mt-0.5">
                                                    <span className="text-slate-400 font-sans font-medium">{numberMetaLabel}: </span>
                                                    {docNumber}
                                                </p>
                                            )}
                                            {doc.name && doc.name !== label && (
                                                <p className="text-xs text-slate-400 mt-0.5 truncate">{doc.name}</p>
                                            )}
                                        </div>

                                        <a
                                            href={doc.documentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors shrink-0"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Open
                                        </a>
                                    </div>

                                    {/* Status badge (current state at a glance) */}
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status:</span>
                                        {isVerified && (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg">
                                                <CheckCircle className="w-4 h-4" /> Verified
                                            </span>
                                        )}
                                        {isRejected && (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-bold bg-red-100 text-red-700 border border-red-200 rounded-lg">
                                                <XCircle className="w-4 h-4" /> Not Verified
                                            </span>
                                        )}
                                        {isUnchecked && (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium bg-slate-100 text-slate-500 border border-slate-200 rounded-lg">
                                                <MinusCircle className="w-4 h-4" /> Not Checked Yet
                                            </span>
                                        )}
                                    </div>

                                    {/* Verification toggle buttons */}
                                    <div className="flex gap-3 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setDocVerification(idx, "verified", "yes")}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                                                isVerified
                                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
                                            }`}
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Verified
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDocVerification(idx, "verified", "no")}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                                                isRejected
                                                    ? "bg-red-600 border-red-600 text-white shadow-sm"
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-red-400 hover:text-red-700 hover:bg-red-50"
                                            }`}
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Not Verified
                                        </button>
                                    </div>

                                    {/* Remarks */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                            Remarks <span className="font-normal text-slate-400">(optional — discrepancy, observations, notes)</span>
                                        </label>
                                        <textarea
                                            value={verif.remarks}
                                            onChange={(e) => setDocVerification(idx, "remarks", e.target.value)}
                                            placeholder="Any discrepancy, comment, or observation about this document…"
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
