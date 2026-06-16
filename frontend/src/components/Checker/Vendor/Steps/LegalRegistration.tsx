"use client"

import { FileText, Download } from "lucide-react"
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
}

interface StepProps {
    formData: any
    setFormData: (data: any) => void
    errors?: StepErrors
    // Per-field snapshot: true iff the vendor supplied a value at autofill
    // time. Captured once by the parent so typing into an empty field can't
    // silently re-lock it, and lock state survives step remounts.
    autofillSnapshot?: Record<string, boolean>
}

export default function LegalRegistration({ formData, setFormData, errors = {}, autofillSnapshot = {} }: StepProps) {
    const bizRegLocked = !!autofillSnapshot.businessRegistrationNumber
    const gstLocked = !!autofillSnapshot.gstTaxId
    const licenseLocked = !!autofillSnapshot.factoryLicenseNumber

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Legal & Registration</h2>
                <p className="text-slate-600">
                    Verify business and factory registrations.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Business Registration Number{!bizRegLocked && <RequiredMark />}
                    </label>
                    {bizRegLocked ? (
                        <input
                            type="text"
                            value={formData.businessRegistrationNumber}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                        />
                    ) : (
                        <>
                            <input
                                type="text"
                                value={formData.businessRegistrationNumber || ""}
                                onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.businessRegistrationNumber}
                                className={inputCls(!!errors.businessRegistrationNumber)}
                            />
                            <ErrorText msg={errors.businessRegistrationNumber} />
                        </>
                    )}
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        GST / Tax ID{!gstLocked && <RequiredMark />}
                    </label>
                    {gstLocked ? (
                        <input
                            type="text"
                            value={formData.gstTaxId}
                            readOnly
                            aria-readonly="true"
                            className={`${READONLY_CLS} font-mono`}
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
                <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Factory License Number{!licenseLocked && <RequiredMark />}
                    </label>
                    {licenseLocked ? (
                        <input
                            type="text"
                            value={formData.factoryLicenseNumber}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                        />
                    ) : (
                        <>
                            <input
                                type="text"
                                value={formData.factoryLicenseNumber || ""}
                                onChange={(e) => setFormData({ ...formData, factoryLicenseNumber: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.factoryLicenseNumber}
                                className={inputCls(!!errors.factoryLicenseNumber)}
                            />
                            <ErrorText msg={errors.factoryLicenseNumber} />
                        </>
                    )}
                </div>
            </div>

            <VendorLegalDocuments documents={formData.vendorDocuments} />
        </div>
    )
}

// Read-only list of the registration/legal documents the vendor uploaded.
// Factory images (DocumentType OTHER) are shown on Step 1, so they're excluded
// here to avoid duplicating the same media across steps. Renders nothing when
// the vendor uploaded no legal documents.
function VendorLegalDocuments({ documents }: { documents?: any[] }) {
    const docs = (Array.isArray(documents) ? documents : [])
        .filter((d) => d?.type && d.type !== "OTHER" && d?.documentUrl)

    if (docs.length === 0) return null

    return (
        <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Registration Documents</h3>
                <p className="text-slate-500 text-sm">Uploaded by the vendor — read-only reference for verification.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {docs.map((doc, idx) => {
                    const label = DOC_TYPE_LABELS[doc.type] || doc.name || doc.type
                    return (
                        <a
                            key={idx}
                            href={doc.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 bg-white hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
                        >
                            {isImageUrl(doc.documentUrl) ? (
                                <img src={doc.documentUrl} alt={label} className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" />
                            ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                    <FileText className="w-6 h-6 text-slate-400" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                                {doc.name && <p className="text-xs text-slate-500 truncate">{doc.name}</p>}
                            </div>
                            <Download className="w-4 h-4 text-slate-400 group-hover:text-brand-500 shrink-0" />
                        </a>
                    )
                })}
            </div>
        </div>
    )
}
