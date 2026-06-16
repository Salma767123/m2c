"use client"

import { Image as ImageIcon } from "lucide-react"
import type { StepErrors } from "../validation"
import {
    READONLY_CLS,
    ErrorText,
    RequiredMark,
    inputCls,
} from "./fieldHelpers"

const isImageUrl = (url?: string | null) =>
    !!url && /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url)

interface StepProps {
    formData: any
    setFormData: (data: any) => void
    errors?: StepErrors
    // Captured by parent at autofill time so lock state is stable across
    // typing and step remounts.
    autofillSnapshot?: Record<string, boolean>
}

// Vendor Name / Vendor Code are always server-supplied and never editable.
// The remaining fields lock only when the vendor provided a value, so the
// checker can still fill in anything the vendor left blank from on-site
// verification.
export default function FactoryDetails({ formData, setFormData, errors = {}, autofillSnapshot = {} }: StepProps) {
    const factoryNameLocked = !!autofillSnapshot.factoryName
    const contactNameLocked = !!autofillSnapshot.contactPersonName
    const contactPhoneLocked = !!autofillSnapshot.contactPhoneNumber
    const addressLocked = !!autofillSnapshot.factoryAddress

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Factory Details</h2>
                <p className="text-slate-600">
                    General information regarding the vendor and factory.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Vendor Name:</label>
                    <input
                        type="text"
                        value={formData.vendorName || ""}
                        readOnly
                        aria-readonly="true"
                        className={READONLY_CLS}
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Vendor Code:</label>
                    <input
                        type="text"
                        value={formData.vendorCode || ""}
                        readOnly
                        aria-readonly="true"
                        placeholder="Loading..."
                        className={`${READONLY_CLS} text-slate-700 font-mono`}
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Factory Name{!factoryNameLocked && <RequiredMark />}
                    </label>
                    {factoryNameLocked ? (
                        <input
                            type="text"
                            value={formData.factoryName}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                        />
                    ) : (
                        <>
                            <input
                                type="text"
                                value={formData.factoryName || ""}
                                onChange={(e) => setFormData({ ...formData, factoryName: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.factoryName}
                                className={inputCls(!!errors.factoryName)}
                            />
                            <ErrorText msg={errors.factoryName} />
                        </>
                    )}
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Contact Person Name{!contactNameLocked && <RequiredMark />}
                    </label>
                    {contactNameLocked ? (
                        <input
                            type="text"
                            value={formData.contactPersonName}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                        />
                    ) : (
                        <>
                            <input
                                type="text"
                                value={formData.contactPersonName || ""}
                                onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.contactPersonName}
                                className={inputCls(!!errors.contactPersonName)}
                            />
                            <ErrorText msg={errors.contactPersonName} />
                        </>
                    )}
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Contact Phone Number{!contactPhoneLocked && <RequiredMark />}
                    </label>
                    {contactPhoneLocked ? (
                        <input
                            type="tel"
                            inputMode="tel"
                            value={formData.contactPhoneNumber}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                        />
                    ) : (
                        <>
                            <input
                                type="tel"
                                inputMode="tel"
                                value={formData.contactPhoneNumber || ""}
                                onChange={(e) => setFormData({ ...formData, contactPhoneNumber: e.target.value })}
                                placeholder="+91 98765 43210"
                                aria-invalid={!!errors.contactPhoneNumber}
                                className={inputCls(!!errors.contactPhoneNumber)}
                            />
                            <ErrorText msg={errors.contactPhoneNumber} />
                        </>
                    )}
                </div>
                <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Factory Address{!addressLocked && <RequiredMark />}
                    </label>
                    {addressLocked ? (
                        <textarea
                            value={formData.factoryAddress}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                            rows={3}
                        />
                    ) : (
                        <>
                            <textarea
                                value={formData.factoryAddress || ""}
                                onChange={(e) => setFormData({ ...formData, factoryAddress: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.factoryAddress}
                                className={inputCls(!!errors.factoryAddress)}
                                rows={3}
                            />
                            <ErrorText msg={errors.factoryAddress} />
                        </>
                    )}
                </div>
            </div>

            <VendorMedia logo={formData.vendorCompanyLogo} documents={formData.vendorDocuments} />

            <VendorContactDetails contact={formData.vendorContact} />
        </div>
    )
}

// Read-only media the vendor uploaded during registration. The company logo and
// any factory images (stored as DocumentType OTHER) belong with Factory Details
// so the checker can match them against what they see on-site. Renders nothing
// when the vendor supplied no logo or factory images.
function VendorMedia({ logo, documents }: { logo?: string | null; documents?: any[] }) {
    const factoryImages = (Array.isArray(documents) ? documents : [])
        .filter((d) => d?.type === "OTHER" && d?.documentUrl)
        .map((d) => ({ label: d.name || "Factory Image", url: d.documentUrl as string }))

    const hasLogo = !!logo && String(logo).trim() !== ""
    if (!hasLogo && factoryImages.length === 0) return null

    return (
        <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Factory Images & Logo</h3>
                <p className="text-slate-500 text-sm">Uploaded by the vendor — read-only reference for on-site verification.</p>
            </div>

            {hasLogo && (
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company Logo</p>
                    <a href={logo!} target="_blank" rel="noopener noreferrer" className="inline-block">
                        <img src={logo!} alt="Company logo" className="w-28 h-28 object-contain rounded-xl border border-slate-200 bg-white p-2" />
                    </a>
                </div>
            )}

            {factoryImages.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Factory Images</p>
                    <div className="flex flex-wrap gap-3">
                        {factoryImages.map((img, idx) => (
                            <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="group block w-28">
                                {isImageUrl(img.url) ? (
                                    <img src={img.url} alt={img.label} className="w-28 h-28 object-cover rounded-xl border border-slate-200" />
                                ) : (
                                    <div className="w-28 h-28 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                                        <ImageIcon className="w-8 h-8 text-slate-400" />
                                    </div>
                                )}
                                <p className="mt-1 text-[11px] text-slate-500 truncate group-hover:text-slate-700">{img.label}</p>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// Read-only reference block listing all contact details the vendor last saved
// during registration, so the checker can verify them on-site.
function VendorContactDetails({ contact }: { contact?: Record<string, any> | null }) {
    if (!contact) return null

    // Only fields the vendor actually provided are shown — a blank secondary
    // email/phone is omitted entirely rather than rendered as an empty "—" row.
    const ReadField = ({ label, value }: { label: string; value?: string | null }) => {
        if (!value || !String(value).trim()) return null
        return (
            <div>
                <label className="block text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wide">{label}</label>
                <input
                    type="text"
                    value={String(value)}
                    readOnly
                    aria-readonly="true"
                    className={READONLY_CLS}
                />
            </div>
        )
    }

    const altContacts: any[] = Array.isArray(contact.alternateContacts) ? contact.alternateContacts : []
    const main = contact.mainContact && typeof contact.mainContact === "object" ? contact.mainContact : null

    return (
        <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Vendor Contact Details</h3>
                <p className="text-slate-500 text-sm">Last saved by the vendor — read-only reference for verification.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ReadField label="Primary Number 1" value={contact.businessPhone} />
                <ReadField label="Primary Number 2" value={contact.phoneNumber2} />
                <ReadField label="Landline" value={contact.landlineNumber} />
                <ReadField label="Login Email" value={contact.loginEmail} />
                <ReadField label="Business Email 1" value={contact.businessEmail} />
                <ReadField label="Business Email 2" value={contact.businessEmail2} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ReadField label="Owner Name" value={contact.ownerName} />
                <ReadField label="Owner Phone 1" value={contact.ownerPhone} />
                <ReadField label="Owner Phone 2" value={contact.ownerPhone2} />
                <ReadField label="Owner Landline" value={contact.ownerLandline} />
                <ReadField label="Owner Email 1" value={contact.ownerEmail} />
                <ReadField label="Owner Email 2" value={contact.ownerEmail2} />
            </div>

            {main && (main.name || main.phone || main.email) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <ReadField label="Main Contact Name" value={main.name} />
                    <ReadField label="Main Contact Phone" value={main.phone} />
                    <ReadField label="Main Contact Email" value={main.email} />
                </div>
            )}

            {altContacts.length > 0 && (
                <div className="space-y-4">
                    <p className="text-sm font-semibold text-slate-700">Alternate Contacts</p>
                    {altContacts.map((alt, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-5 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                            <ReadField label={`Contact ${idx + 1} Name`} value={alt?.name} />
                            <ReadField label="Phone" value={alt?.phone} />
                            <ReadField label="Email" value={alt?.email} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
