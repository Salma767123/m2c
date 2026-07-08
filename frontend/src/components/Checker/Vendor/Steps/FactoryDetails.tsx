"use client"

import { Image as ImageIcon, User, MapPin, ExternalLink, Building2, Users } from "lucide-react"
import { openDoc } from "@/lib/docViewerBus"
import type { StepErrors } from "../validation"
import {
    READONLY_CLS,
    ErrorText,
    RequiredMark,
    inputCls,
} from "./fieldHelpers"

const isImageUrl = (url?: string | null) =>
    !!url && /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url)

const OWNERSHIP_LABELS: Record<string, string> = {
    owned: "Owned",
    rented: "Rented",
    lease: "Leased",
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
    "proprietorship": "Proprietorship",
    "pvt-ltd": "Private Limited (Pvt. Ltd.)",
    "partnership-firm": "Partnership Firm",
    "llp": "LLP",
    "unregistered": "Unregistered",
}

interface StepProps {
    formData: any
    setFormData: (data: any) => void
    errors?: StepErrors
    autofillSnapshot?: Record<string, boolean>
}

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
                    General information regarding the vendor and factory. Vendor-sourced fields are shown read-only for reference.
                </p>
            </div>

            {/* ── Inspector-filled fields ─────────────────────────────────── */}
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
                        <input type="text" value={formData.factoryName} readOnly aria-readonly="true" className={READONLY_CLS} />
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
                        <input type="text" value={formData.contactPersonName} readOnly aria-readonly="true" className={READONLY_CLS} />
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
                        <input type="tel" value={formData.contactPhoneNumber} readOnly aria-readonly="true" className={READONLY_CLS} />
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
                        <textarea value={formData.factoryAddress} readOnly aria-readonly="true" className={READONLY_CLS} rows={3} />
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

// ── Media Section ──────────────────────────────────────────────────────────────

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
                    <button type="button" onClick={() => openDoc(logo!, 'Company Logo')} className="inline-block">
                        <img src={logo!} alt="Company logo" className="w-28 h-28 object-contain rounded-xl border border-slate-200 bg-white p-2" />
                    </button>
                </div>
            )}

            {factoryImages.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Factory Images</p>
                    <div className="flex flex-wrap gap-3">
                        {factoryImages.map((img, idx) => (
                            <button key={idx} type="button" onClick={() => openDoc(img.url, img.label || 'Factory Photo')} className="group block w-28 text-left">
                                {isImageUrl(img.url) ? (
                                    <img src={img.url} alt={img.label} className="w-28 h-28 object-cover rounded-xl border border-slate-200" />
                                ) : (
                                    <div className="w-28 h-28 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                                        <ImageIcon className="w-8 h-8 text-slate-400" />
                                    </div>
                                )}
                                <p className="mt-1 text-[11px] text-slate-500 truncate group-hover:text-slate-700">{img.label}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFullName(c: Record<string, any>): string {
    const parts = [c.firstName, c.middleName, c.lastName].filter(Boolean)
    return parts.length > 0 ? parts.join(" ") : (c.name || "")
}

function getDesignation(c: Record<string, any>): string {
    if (c.designation === "Others" && c.customDesignation) return c.customDesignation
    return c.designation || ""
}

function getDepartment(c: Record<string, any>): string {
    if (c.department === "Others" && c.customDepartment) return c.customDepartment
    return c.department || ""
}

function formatLocalLandline(std?: string, number?: string, assembled?: string): string {
    if (assembled && assembled.trim()) return assembled
    if (std && number) return `(${std}) ${number}`
    return ""
}

function formatIntlLandline(cc?: string, std?: string, number?: string, assembled?: string): string {
    if (assembled && assembled.trim()) return assembled
    const parts = [cc ? `+${cc}` : "", std, number].filter(Boolean)
    return parts.length > 0 ? parts.join(" ") : ""
}

// ── Shared read-only field ──────────────────────────────────────────────────────

function ReadField({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
    if (!value || !String(value).trim()) return null
    return (
        <div>
            <label className="block text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wide">{label}</label>
            <input
                type="text"
                value={String(value)}
                readOnly
                aria-readonly="true"
                className={`${READONLY_CLS}${mono ? " font-mono tracking-wide" : ""}`}
            />
        </div>
    )
}

// ── Contact Card (for main & alternate contact persons) ────────────────────────

function ContactCard({ label, contact }: { label: string; contact: Record<string, any> }) {
    const fullName = getFullName(contact)
    const designation = getDesignation(contact)
    const department = getDepartment(contact)
    const localLL = formatLocalLandline(contact.localLandlineStd, contact.localLandline)
    const intlLL = formatIntlLandline(contact.intlLandlineCountryCode, contact.intlLandlineStd, contact.intlLandlineNumber)
    const photo = contact.photo || null

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                    {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={fullName || label} className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-6 h-6 text-slate-300" />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
                    {fullName && <p className="text-sm font-semibold text-slate-900 truncate">{fullName}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {designation && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200 rounded-full">
                                {designation}
                            </span>
                        )}
                        {department && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full">
                                {department}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ReadField label="Primary Phone" value={contact.phone || contact.phone1} />
                <ReadField label="Secondary Phone" value={contact.phone2} />
                <ReadField label="Primary Email" value={contact.email || contact.email1} />
                <ReadField label="Secondary Email" value={contact.email2} />
                {localLL && <ReadField label="Local Landline Number" value={localLL} />}
                {intlLL && <ReadField label="International Landline Number" value={intlLL} />}
            </div>
        </div>
    )
}

// ── Owner Card ─────────────────────────────────────────────────────────────────
// All owners use consistent "Primary / Secondary" labels regardless of isPrimary.

function OwnerCard({ label, name, designation, phone, phone2, email, email2, localLL, intlLL, photo, isPrimary = false }: {
    label: string
    name?: string
    designation?: string
    phone?: string
    phone2?: string
    email?: string
    email2?: string
    localLL?: string
    intlLL?: string
    photo?: string | null
    isPrimary?: boolean
}) {
    if (!name && !phone && !email) return null
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                    {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={name || label} className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-6 h-6 text-slate-300" />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
                    {name && <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>}
                    {designation && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200 rounded-full">
                            {designation}
                        </span>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ReadField label="Primary Phone" value={phone} />
                <ReadField label="Secondary Phone" value={phone2} />
                <ReadField label="Primary Email" value={email} />
                <ReadField label="Secondary Email" value={email2} />
                {localLL && <ReadField label="Local Landline Number" value={localLL} />}
                {intlLL && <ReadField label="International Landline Number" value={intlLL} />}
            </div>
        </div>
    )
}

// ── Vendor Contact Details (read-only reference block) ────────────────────────

function VendorContactDetails({ contact }: { contact?: Record<string, any> | null }) {
    if (!contact) return null

    // Business-level landlines
    const bizLocalLL = formatLocalLandline(contact.localLandlineStd, undefined, contact.landlineNumber)
    const bizIntlLL = formatIntlLandline(undefined, undefined, undefined, contact.intlLandline)

    // Owner-level landlines
    const ownerLocalLL = formatLocalLandline(contact.ownerLocalLandlineStd, undefined, contact.ownerLandline)
    const ownerIntlLL = formatIntlLandline(undefined, undefined, undefined, contact.ownerIntlLandline)

    const altContacts: any[] = Array.isArray(contact.alternateContacts) ? contact.alternateContacts : []
    const main = contact.mainContact && typeof contact.mainContact === "object" ? contact.mainContact : null
    const additionalOwners: any[] = Array.isArray(contact.additionalOwners) ? contact.additionalOwners : []

    const businessTypeLabel = BUSINESS_TYPE_LABELS[contact.businessType || ""] || contact.businessType || ""
    const ownershipLabel = OWNERSHIP_LABELS[contact.factoryOwnershipType || ""] || contact.factoryOwnershipType || ""

    return (
        <div className="space-y-8">

            {/* ── Factory Location Reference ─────────────────────────── */}
            <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-brand-500" />
                        Factory Details
                    </h3>
                    <p className="text-slate-500 text-sm mt-0.5">From vendor registration — read-only reference.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {businessTypeLabel && (
                        <ReadField label="Business Type" value={businessTypeLabel} />
                    )}
                    {ownershipLabel && (
                        <ReadField label="Factory Ownership Type" value={ownershipLabel} />
)}
                    <ReadField label="City" value={contact.factoryCity} />
                    <ReadField label="State" value={contact.factoryState} />
                    <ReadField label="ZIP Code" value={contact.factoryZipCode} />
                    <ReadField label="Country" value={contact.factoryCountry} />
                    {contact.aadhaarNumber && contact.businessType === "unregistered" && (
                        <ReadField label="Aadhaar Number" value={contact.aadhaarNumber} mono />
                    )}
                </div>
                {contact.mapLink && (
                    <div>
                        <label className="block text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wide">Map Link</label>
                        <a
                            href={contact.mapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
                        >
                            <MapPin className="w-4 h-4" />
                            View on Map
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                )}
            </div>

            {/* ── Contact Information ────────────────────────────────── */}
            <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                    <h3 className="text-lg font-bold text-slate-900">Contact Information</h3>
                    <p className="text-slate-500 text-sm mt-0.5">Company-level contact details from vendor registration.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ReadField label="Primary Phone" value={contact.businessPhone} />
                    <ReadField label="Secondary Phone" value={contact.phoneNumber2} />
                    <ReadField label="Primary Email" value={contact.businessEmail} />
                    <ReadField label="Secondary Email" value={contact.businessEmail2} />
                    {bizLocalLL && <ReadField label="Local Landline Number" value={bizLocalLL} />}
                    {bizIntlLL && <ReadField label="International Landline Number" value={bizIntlLL} />}
                </div>
            </div>

            {/* ── Owner Information ──────────────────────────────────── */}
            {(contact.ownerName || contact.ownerPhone || contact.ownerEmail) && (
                <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-3">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-brand-500" />
                            Owner Information
                        </h3>
                        <p className="text-slate-500 text-sm mt-0.5">Primary owner information from vendor registration.</p>
                    </div>
                    <OwnerCard
                        label="Owner 1"
                        isPrimary
                        name={contact.ownerName}
                        designation={contact.ownerDesignation}
                        phone={contact.ownerPhone}
                        phone2={contact.ownerPhone2}
                        email={contact.ownerEmail}
                        email2={contact.ownerEmail2}
                        localLL={ownerLocalLL}
                        intlLL={ownerIntlLL}
                        photo={contact.ownerPhoto}
                    />
                </div>
            )}

            {/* ── Additional Owners ─────────────────────────────────── */}
            {additionalOwners.length > 0 && (
                <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-3">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-brand-500" />
                            Additional Owners
                        </h3>
                        <p className="text-slate-500 text-sm mt-0.5">{additionalOwners.length} additional record{additionalOwners.length > 1 ? "s" : ""} from vendor registration.</p>
                    </div>
                    <div className="space-y-3">
                        {additionalOwners.map((owner: any, idx: number) => {
                            if (!owner || (!owner.name && !owner.phone && !owner.email)) return null
                            return (
                                <OwnerCard
                                    key={idx}
                                    label={`Owner ${idx + 2}`}
                                    name={owner.name || [owner.firstName, owner.lastName].filter(Boolean).join(" ")}
                                    designation={owner.designation}
                                    phone={owner.phone || owner.phone1}
                                    phone2={owner.phone2}
                                    email={owner.email || owner.email1}
                                    email2={owner.email2}
                                    photo={owner.photo || null}
                                />
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Main Contact Person ────────────────────────────────── */}
            {main && (main.firstName || main.lastName || main.name || main.phone || main.phone1 || main.email || main.email1) && (
                <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-3">
                        <h3 className="text-lg font-bold text-slate-900">Contact Person Information</h3>
                        <p className="text-slate-500 text-sm mt-0.5">Designated contact persons from vendor registration.</p>
                    </div>
                    <ContactCard label="Main Contact Person" contact={main} />
                </div>
            )}

            {/* ── Alternate Contact Persons ──────────────────────────── */}
            {altContacts.length > 0 && (
                <div className={`space-y-3${!(main && (main.firstName || main.lastName || main.name || main.phone || main.phone1 || main.email || main.email1)) ? " mt-4" : ""}`}>
                    {!(main && (main.firstName || main.lastName || main.name || main.phone || main.phone1 || main.email || main.email1)) && (
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">Contact Person Information</h3>
                            <p className="text-slate-500 text-sm mt-0.5">Designated contact persons from vendor registration.</p>
                        </div>
                    )}
                    {altContacts.map((alt, idx) =>
                        alt && (alt.firstName || alt.lastName || alt.name || alt.phone || alt.phone1 || alt.email || alt.email1) ? (
                            <ContactCard key={idx} label={`Contact Person ${idx + 2}`} contact={alt} />
                        ) : null
                    )}
                </div>
            )}
        </div>
    )
}
