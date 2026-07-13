'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    ArrowLeft, Building2, ShieldCheck, Factory,
    CheckCircle, XCircle, AlertTriangle, Clock,
    FileText, ClipboardList, Package, Settings, Download, Camera, MapPin
} from 'lucide-react'
import { Badge } from '@/components/UI/Badge'
import vendorService from '@/services/vendorService'
import { generateFactoryInspectionPdf } from '@/lib/factoryInspectionReportPdf'
import type { FactoryImageEntry, FactoryReportMeta } from '@/lib/factoryInspectionReportPdf'
import { formatCheckerName } from '@/lib/checkerUtils'
import { formatTime12 } from '@/lib/utils'
import VendorInspectionData from '@/components/AdminDashboard/Vendors/VendorInspectionData'

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
    } catch { return null }
}

interface Props {
    inspectionId: string
}

function stepForKey(key: string): string {
    if (key.startsWith('certDoc_') || key.startsWith('cert_')) return 'Step 6 – Certifications'
    if (key.startsWith('vt_')) return 'Step 4 – Vendor & Products'
    if (key.startsWith('mf_')) return 'Step 5 – Manufacturing'
    if (key.startsWith('ct_')) return 'Step 7 – Contact & Trade'
    if (key.startsWith('c_'))  return 'Step 1 – Company Info'
    if (key.startsWith('w_'))  return 'Step 2 – Warehouse & Factory'
    if (key.startsWith('o_'))  return 'Step 3 – Owner Profile'
    return 'Other'
}

// ── Verification types ─────────────────────────────────────────────────────────
type VF = Record<string, { ok: boolean | null; remarks: string }>

// ── UI Components ──────────────────────────────────────────────────────────────
function StatusChip({ value }: { value: string }) {
    const v = (value || '').toLowerCase()
    const isPass = ['yes', 'pass', 'passed', 'approved'].includes(v)
    const isFail = ['no', 'fail', 'failed', 'rejected'].includes(v)
    const color = isPass ? 'text-green-700 bg-green-50 border-green-200'
        : isFail ? 'text-red-700 bg-red-50 border-red-200'
        : 'text-amber-700 bg-amber-50 border-amber-200'
    const Icon = isPass ? CheckCircle : isFail ? XCircle : AlertTriangle
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
            <Icon className="w-3.5 h-3.5" />{value}
        </span>
    )
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex flex-col gap-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-semibold text-slate-900 break-words">{value || '—'}</span>
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

function YesNoRow({ label, value }: { label: string; value?: string }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
            <span className="text-sm text-slate-700">{label}</span>
            {value ? <StatusChip value={value} /> : <span className="text-slate-400 text-sm">—</span>}
        </div>
    )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FactoryInspectionDetail({ inspectionId }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const autoDownload = searchParams.get('download') === 'true'
    const [inspection, setInspection] = useState<any>(null)
    // The vendor nested on the inspection is a thin projection (id, companyName,
    // email, ownerName, businessPhone/City/State/Address only). The full vendor
    // record — company/owner/contact/certifications/documents/bank/etc. — is
    // fetched separately via getVendorById and merged, mirroring the admin
    // VendorInspectionDetail page so this report shows the SAME complete data.
    const [fullVendor, setFullVendor] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)
    const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null)
    const autoDownloadTriggered = useRef(false)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await vendorService.getInspectionById(inspectionId)
                if (res.success) {
                    setInspection(res.inspection)
                    // Fetch the complete vendor record for full-data parity.
                    const vId = res.inspection?.vendor?.id
                    if (vId) {
                        vendorService.getVendorById(vId)
                            .then((vr) => { if (vr?.vendor) setFullVendor(vr.vendor) })
                            .catch(() => { /* non-critical: fall back to thin projection */ })
                    }
                } else {
                    setError('Inspection not found')
                }
            } catch (e: any) {
                setError(e?.response?.data?.error || e.message || 'Failed to load inspection')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [inspectionId])

    useEffect(() => {
        if (!autoDownload || autoDownloadTriggered.current || loading || !inspection || downloading) return
        autoDownloadTriggered.current = true
        const buildAndSave = async () => {
            const rawItems = inspection.itemsToInspect
            const isFormData = rawItems && !Array.isArray(rawItems) && typeof rawItems === 'object'
            const fd: Record<string, any> = isFormData ? (rawItems as Record<string, any>) : {}
            const isNewFmt = isFormData && typeof fd.verifications === 'object' && fd.verifications !== null
            const vendor: any = { ...(inspection.vendor || {}), ...(fullVendor || {}) }
            const vendorDocs: any[] = Array.isArray(vendor.documents) ? vendor.documents : []
            const imgResults = await Promise.all(
                vendorDocs.filter((d: any) => d.type === 'OTHER' && d.documentUrl)
                    .map(async (d: any): Promise<FactoryImageEntry | null> => {
                        const dataUrl = await fetchImgDataUrl(d.documentUrl)
                        return dataUrl ? { label: d.name || 'Factory Image', dataUrl } : null
                    })
            )
            const vendorFactoryImages = imgResults.filter((x): x is FactoryImageEntry => x !== null)
            const [companyLogoDataUrl, ownerPhotoDataUrl, mainContactPhotoDataUrl] = await Promise.all([
                vendor.companyLogo ? fetchImgDataUrl(vendor.companyLogo) : Promise.resolve(null),
                vendor.ownerPhoto ? fetchImgDataUrl(vendor.ownerPhoto) : Promise.resolve(null),
                vendor.mainContact?.photo ? fetchImgDataUrl(vendor.mainContact.photo) : Promise.resolve(null),
            ])
            // Additional owners' photos — index-aligned with additionalOwners.
            const additionalOwnerPhotoDataUrls = await Promise.all(
                (Array.isArray(vendor.additionalOwners) ? vendor.additionalOwners : []).map(
                    (o: any) => (o?.photo ? fetchImgDataUrl(o.photo) : Promise.resolve(null)),
                ),
            )
            const meta: FactoryReportMeta = {
                inspectorName: fd.inspectorName || formatCheckerName(inspection.checker),
                inspectionDate: fd.inspectionDate,
                inspectionStartedAt: inspection.startedAt ?? undefined,
                overallResult: fd.inspectionStatus,
                inspectorRemarks: fd.inspectorRemarks || inspection.notes,
                checker: inspection.checker || null,
                location: inspection.checkerLatitude != null
                    ? { latitude: inspection.checkerLatitude, longitude: inspection.checkerLongitude! }
                    : null,
                generatedAt: new Date(),
            }
            const pdf = generateFactoryInspectionPdf(vendor, isNewFmt ? fd.verifications : {}, meta, {
                clientSignatureDataUrl: fd.clientSignature || null,
                vendorFactoryImages: vendorFactoryImages.length > 0 ? vendorFactoryImages : null,
                inspectorEvidenceImages: null,
                companyLogoDataUrl,
                ownerPhotoDataUrl,
                mainContactPhotoDataUrl,
                additionalOwnerPhotoDataUrls,
            })
            const vendorName = vendor.companyName || fd.vendorName || 'Report'
            pdf.save(`Factory_Report_${vendorName.replace(/\s+/g, '_')}_${inspectionId.slice(-8).toUpperCase()}.pdf`)
        }
        buildAndSave().catch(() => {})
    }, [autoDownload, loading, inspection, fullVendor, downloading, inspectionId])

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
    )

    if (error || !inspection) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
            <p className="text-slate-600 text-lg">{error || 'Inspection not found'}</p>
            <button onClick={() => router.back()} className="text-blue-600 underline text-sm">Go back</button>
        </div>
    )

    const status = inspection.status
    const isCompleted = status === 'COMPLETED'

    const handleDownloadPdf = async () => {
        if (!inspection) return
        setDownloading(true)
        try {
            const rawItems = inspection.itemsToInspect
            const isFormData = rawItems && !Array.isArray(rawItems) && typeof rawItems === 'object'
            const fd: Record<string, any> = isFormData ? (rawItems as Record<string, any>) : {}
            const isNewFmt = isFormData && typeof fd.verifications === 'object' && fd.verifications !== null
            const vendor: any = { ...(inspection.vendor || {}), ...(fullVendor || {}) }
            const vendorDocs: any[] = Array.isArray(vendor.documents) ? vendor.documents : []
            const imgResults = await Promise.all(
                vendorDocs.filter((d: any) => d.type === 'OTHER' && d.documentUrl)
                    .map(async (d: any): Promise<FactoryImageEntry | null> => {
                        const dataUrl = await fetchImgDataUrl(d.documentUrl)
                        return dataUrl ? { label: d.name || 'Factory Image', dataUrl } : null
                    })
            )
            const vendorFactoryImages = imgResults.filter((x): x is FactoryImageEntry => x !== null)
            const [companyLogoDataUrl, ownerPhotoDataUrl, mainContactPhotoDataUrl] = await Promise.all([
                vendor.companyLogo ? fetchImgDataUrl(vendor.companyLogo) : Promise.resolve(null),
                vendor.ownerPhoto ? fetchImgDataUrl(vendor.ownerPhoto) : Promise.resolve(null),
                vendor.mainContact?.photo ? fetchImgDataUrl(vendor.mainContact.photo) : Promise.resolve(null),
            ])
            // Additional owners' photos — index-aligned with additionalOwners.
            const additionalOwnerPhotoDataUrls = await Promise.all(
                (Array.isArray(vendor.additionalOwners) ? vendor.additionalOwners : []).map(
                    (o: any) => (o?.photo ? fetchImgDataUrl(o.photo) : Promise.resolve(null)),
                ),
            )
            const meta: FactoryReportMeta = {
                inspectorName: fd.inspectorName || formatCheckerName(inspection.checker),
                inspectionDate: fd.inspectionDate,
                inspectionStartedAt: inspection.startedAt ?? undefined,
                overallResult: fd.inspectionStatus,
                inspectorRemarks: fd.inspectorRemarks || inspection.notes,
                checker: inspection.checker || null,
                location: inspection.checkerLatitude != null
                    ? { latitude: inspection.checkerLatitude, longitude: inspection.checkerLongitude! }
                    : null,
                generatedAt: new Date(),
            }
            const pdf = generateFactoryInspectionPdf(vendor, isNewFmt ? fd.verifications : {}, meta, {
                clientSignatureDataUrl: fd.clientSignature || null,
                vendorFactoryImages: vendorFactoryImages.length > 0 ? vendorFactoryImages : null,
                inspectorEvidenceImages: null,
                companyLogoDataUrl,
                ownerPhotoDataUrl,
                mainContactPhotoDataUrl,
                additionalOwnerPhotoDataUrls,
            })
            const vendorName = vendor.companyName || fd.vendorName || 'Report'
            pdf.save(`Factory_Report_${vendorName.replace(/\s+/g, '_')}_${inspectionId.slice(-8).toUpperCase()}.pdf`)
        } catch {
            alert('Failed to generate PDF. Please try again.')
        } finally {
            setDownloading(false)
        }
    }

    const rawItems = inspection.itemsToInspect
    const isFormData = rawItems && !Array.isArray(rawItems) && typeof rawItems === 'object'
    const formData = isFormData ? rawItems : {}
    const assignedItems = Array.isArray(rawItems) ? rawItems : []

    // New format: submitted via the 9-step checker form
    const isNewFormat = isFormData && typeof formData.verifications === 'object' && formData.verifications !== null
    const vf: VF = isNewFormat ? (formData.verifications as VF) : {}
    const vendor = { ...(inspection.vendor || {}), ...(fullVendor || {}) }

    const statusColors: Record<string, string> = {
        COMPLETED: 'bg-green-100 text-green-800',
        IN_PROGRESS: 'bg-blue-100 text-blue-800',
        SCHEDULED: 'bg-amber-100 text-amber-800',
    }
    const resultColors: Record<string, string> = {
        PASSED: 'bg-green-100 text-green-800',
        FAILED: 'bg-red-100 text-red-800',
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Back + Title + Download */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">Factory Inspection Report</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {inspection.vendor?.companyName} &bull; Ref: {inspectionId.slice(-8).toUpperCase()}
                    </p>
                </div>
                <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#222222] rounded-lg hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
                >
                    <Download className="w-4 h-4" />
                    {downloading ? 'Generating...' : 'Download PDF'}
                </button>
                <div className="flex gap-2 flex-shrink-0">
                    <Badge className={statusColors[status] || 'bg-gray-100 text-gray-700'}>{status}</Badge>
                    {inspection.result && (
                        <Badge className={resultColors[inspection.result] || 'bg-gray-100 text-gray-700'}>
                            {inspection.result}
                        </Badge>
                    )}
                </div>
            </div>

            {/* PDF capture area */}
            <div className="space-y-6">

            {/* Assignment Banner */}
            <div className="bg-gradient-to-r from-[#222222] to-[#333333] rounded-2xl p-6 text-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div>
                        <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Vendor</p>
                        <p className="font-semibold text-sm">{inspection.vendor?.companyName || '—'}</p>
                        <p className="text-neutral-400 text-xs mt-0.5">{inspection.vendor?.email}</p>
                    </div>
                    <div>
                        <p className="text-neutral-400 text-xs font-medium uppercase mb-1">QC Checker</p>
                        <p className="font-semibold text-sm">{formatCheckerName(inspection.checker) || '—'}</p>
                        <p className="text-neutral-400 text-xs mt-0.5">{inspection.checker?.email}</p>
                    </div>
                    <div>
                        <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Scheduled</p>
                        <p className="font-semibold text-sm">{inspection.scheduledDate || '—'}</p>
                        <p className="text-neutral-400 text-xs mt-0.5">{formatTime12(inspection.scheduledTime)}</p>
                    </div>
                    <div>
                        <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Client / Priority</p>
                        <p className="font-semibold text-sm">{inspection.clientName || '—'}</p>
                        <p className="text-neutral-400 text-xs mt-0.5">Priority: {inspection.priority}</p>
                    </div>
                </div>
            </div>

            {/* ── NOT YET STARTED ── */}
            {status === 'SCHEDULED' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                    <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-amber-900 mb-1">Inspection Scheduled</h3>
                    <p className="text-amber-700 text-sm">The QC checker has not started the inspection yet.</p>
                </div>
            )}

            {/* ── IN PROGRESS ── */}
            {status === 'IN_PROGRESS' && !isFormData && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                    <Clock className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-blue-900 mb-1">Inspection In Progress</h3>
                    <p className="text-blue-700 text-sm">The QC checker has started but has not yet submitted the report.</p>
                </div>
            )}

            {/* ── COMPLETED / NEW FORMAT (9-step form) ── */}
            {(isCompleted || isFormData) && isNewFormat && (
                <div className="space-y-5">

                    {/* Full vendor registration data — identical info AND UI to
                        the admin Vendor Inspection page (VendorInspectionData).
                        Vendor-driven, so it renders the complete company /
                        warehouse & factory (incl. the 8-image gallery) / owner +
                        additional owners / products / facilities / certifications /
                        contact & bank details, matching that page exactly. */}
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

                    {/* Inspection Details */}
                    <Section title="Inspection Details" icon={ClipboardList} accent="bg-orange-50 text-orange-800">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                            <InfoCard label="Inspector Name" value={formData.inspectorName} />
                            <InfoCard label="Inspection Date" value={formData.inspectionDate} />
                            <div className="flex flex-col gap-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Overall Result</span>
                                {formData.inspectionStatus
                                    ? <StatusChip value={formData.inspectionStatus} />
                                    : <span className="text-sm font-semibold text-slate-400">—</span>}
                            </div>
                        </div>
                        {(formData.inspectorRemarks || inspection.notes) && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Inspector Remarks</p>
                                <p className="text-sm text-blue-900">{formData.inspectorRemarks || inspection.notes}</p>
                            </div>
                        )}
                    </Section>

                </div>
            )}

            {/* ── COMPLETED / OLD FORMAT (legacy form) ── */}
            {(isCompleted || isFormData) && !isNewFormat && (
                <div className="space-y-5">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-sm text-amber-800 font-medium">This inspection was submitted using the legacy form format.</p>
                    </div>

                    <Section title="Section 1 — Factory Details" icon={Factory} accent="bg-blue-50 text-blue-800">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <InfoCard label="Vendor Name" value={formData.vendorName} />
                            <InfoCard label="Factory Name" value={formData.factoryName} />
                            <InfoCard label="Factory Address" value={formData.factoryAddress} />
                            <InfoCard label="Contact Person" value={formData.contactPersonName} />
                            <InfoCard label="Primary Phone" value={formData.contactPhoneNumber} />
                        </div>
                    </Section>

                    <Section title="Section 2 — Legal & Registration" icon={ShieldCheck} accent="bg-indigo-50 text-indigo-800">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                            <InfoCard label="GST Number" value={formData.gstTaxId} />
                            {formData.panNumber && <InfoCard label={formData.businessType === 'proprietorship' ? 'Proprietor PAN Number' : 'Company PAN Number'} value={formData.panNumber} />}
                            {formData.iecCode && <InfoCard label="IEC Code" value={formData.iecCode} />}
                            {formData.companyIdNumber && <InfoCard label="CIN Number" value={formData.companyIdNumber} />}
                        </div>
                        {formData.docVerifications && Object.keys(formData.docVerifications).length > 0 && (
                            <div className="mt-2 space-y-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Document Verification</p>
                                {Object.entries(formData.docVerifications as Record<string, { verified: string; remarks: string }>).map(([idx, v]) => {
                                    const docList = Array.isArray(formData.vendorDocuments)
                                        ? formData.vendorDocuments.filter((d: any) => d?.type && d.type !== 'OTHER' && d?.documentUrl)
                                        : []
                                    const doc = docList[Number(idx)]
                                    const isProp = formData.businessType === 'proprietorship'
                                    const label = doc
                                        ? (doc.type === 'GST_CERTIFICATE' ? 'GST Certificate'
                                            : doc.type === 'PAN_CARD' ? (isProp ? 'Proprietor PAN Card' : 'Company PAN Card')
                                            : doc.type === 'COMPANY_REGISTRATION' ? 'Company Registration'
                                            : doc.name || doc.type)
                                        : `Document ${Number(idx) + 1}`
                                    return (
                                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800">{label}</p>
                                                {v.remarks && <p className="text-xs text-slate-500 mt-0.5">{v.remarks}</p>}
                                            </div>
                                            {v.verified === 'yes' && <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full"><CheckCircle className="w-3 h-3" /> Verified</span>}
                                            {v.verified === 'no' && <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-red-50 text-red-700 border border-red-200 rounded-full"><XCircle className="w-3 h-3" /> Not Verified</span>}
                                            {(!v.verified || v.verified === '') && <span className="shrink-0 px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-500 rounded-full">Not Checked</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </Section>

                    <Section title="Section 3 — Production Info" icon={Settings} accent="bg-purple-50 text-purple-800">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <InfoCard label="Products Manufactured" value={formData.productsManufactured} />
                            <InfoCard label="Monthly Production Capacity" value={formData.monthlyProductionCapacity} />
                            <InfoCard label="Production Workers" value={formData.numberOfProductionWorkers} />
                            <InfoCard label="Category to Inspect" value={formData.categoryToInspect} />
                        </div>
                    </Section>

                    <Section title="Section 4 — Basic Infrastructure Check" icon={Building2} accent="bg-teal-50 text-teal-800">
                        <YesNoRow label="Machinery Available" value={formData.machineryAvailable} />
                        <YesNoRow label="Electricity Available" value={formData.electricityAvailable} />
                        <YesNoRow label="Water Available" value={formData.waterAvailable} />
                        <YesNoRow label="Storage Area Available" value={formData.storageAreaAvailable} />
                    </Section>

                    <Section title="Section 5 — Quality & Safety" icon={ShieldCheck} accent="bg-emerald-50 text-emerald-800">
                        <YesNoRow label="Quality Check Process in Place" value={formData.qualityCheckProcess} />
                        <YesNoRow label="Safety Equipment Available" value={formData.safetyEquipment} />
                        <YesNoRow label="Clean Working Environment" value={formData.cleanWorkingEnvironment} />
                    </Section>

                    <Section title="Section 6 — Inspection Info" icon={ClipboardList} accent="bg-orange-50 text-orange-800">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                            <InfoCard label="Inspection Date" value={formData.inspectionDate} />
                            <InfoCard label="Inspector Name" value={formData.inspectorName} />
                            <div className="flex flex-col gap-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Inspection Status</span>
                                {formData.inspectionStatus
                                    ? <StatusChip value={formData.inspectionStatus} />
                                    : <span className="text-sm font-semibold text-slate-400">—</span>}
                            </div>
                        </div>
                        {(formData.inspectorRemarks || inspection.notes) && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Inspector Remarks</p>
                                <p className="text-sm text-blue-900">{formData.inspectorRemarks || inspection.notes}</p>
                            </div>
                        )}
                    </Section>

                    {((formData.factoryPhotos?.length > 0) || (formData.documentsUpload?.length > 0)) && (
                        <Section title="Section 7 — Evidence" icon={FileText} accent="bg-rose-50 text-rose-800">
                            {formData.factoryPhotos?.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Factory Photos ({formData.factoryPhotos.length})</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {formData.factoryPhotos.map((p: any, i: number) => {
                                            const src = p?.data || p?.url || null
                                            const isImage = src && typeof src === 'string' && (src.startsWith('data:image') || src.startsWith('http'))
                                            const caption = p?.label || p?.name || `Photo ${i + 1}`
                                            return isImage ? (
                                                <div key={i} className="cursor-pointer" onClick={() => setSelectedImage({ src, alt: caption })}>
                                                    <img src={src} alt={caption} onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                        className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-sm hover:scale-[1.02] transition-transform" />
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
                            {formData.documentsUpload?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Documents ({formData.documentsUpload.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.documentsUpload.map((doc: any, i: number) =>
                                            doc?.data ? (
                                                <a key={i} href={doc.data} download={doc.name || `Document_${i + 1}`}
                                                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    {doc.name || `Document ${i + 1}`}
                                                </a>
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

            {/* ── Selfie Verification ── */}
            {(formData.beforeSelfiePhoto || formData.afterSelfiePhoto) && (
                <Section title="Selfie Verification" icon={Camera} accent="bg-violet-50 text-violet-800">
                    <div className="flex flex-wrap gap-6">
                        {([
                            { key: 'before', photo: formData.beforeSelfiePhoto, takenAt: formData.beforeSelfieTakenAt, label: 'Before Inspection' },
                            { key: 'after',  photo: formData.afterSelfiePhoto,  takenAt: formData.afterSelfieTakenAt,  label: 'After Inspection' },
                        ] as const).map(({ key, photo, takenAt, label }) => {
                            const src = photo?.data || photo?.url || (typeof photo === 'string' ? photo : null)
                            if (!src) return null
                            return (
                                <div key={key} className="flex flex-col items-center gap-2">
                                    <div className="relative w-44 rounded-2xl overflow-hidden border-2 border-violet-200 shadow-md" style={{ aspectRatio: '0.8' }}>
                                        <img src={src} alt={label} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-0 inset-x-0 bg-violet-900/70 text-white text-[10px] font-bold text-center py-1 px-2">{label}</div>
                                    </div>
                                    {takenAt && (
                                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(takenAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </Section>
            )}

            {/* ── Location Verification ── */}
            {(inspection.locationVerified !== undefined || inspection.checkerLatitude != null) && (
                <Section title="Location Verification" icon={MapPin}
                    accent={inspection.locationVerified ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}>
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

            {/* ── Assigned Items ── */}
            {assignedItems.length > 0 && (
                <Section title="Items Assigned for Inspection" icon={Package} accent="bg-slate-50 text-slate-700">
                    <div className="space-y-3">
                        {assignedItems.map((item: any, i: number) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-900 text-sm">{item.itemName}</p>
                                    {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                                    {item.specifications && <p className="text-xs text-slate-600 mt-1 italic">{item.specifications}</p>}
                                </div>
                                <div className="flex gap-3 text-xs text-center flex-shrink-0">
                                    {item.aqlLevel && <div><p className="font-bold text-blue-600">{item.aqlLevel}</p><p className="text-slate-500">AQL</p></div>}
                                    {item.quantity && <div><p className="font-bold text-slate-800">{item.quantity}</p><p className="text-slate-500">Qty</p></div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Timestamps */}
            <div className="bg-white rounded-xl border border-slate-200 px-6 py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoCard label="Created At" value={inspection.createdAt ? new Date(inspection.createdAt).toLocaleDateString('en-IN') : undefined} />
                    <InfoCard label="Started At" value={inspection.startedAt ? new Date(inspection.startedAt).toLocaleString('en-IN') : undefined} />
                    <InfoCard label="Completed At" value={inspection.completedAt ? new Date(inspection.completedAt).toLocaleString('en-IN') : undefined} />
                    <InfoCard label="Estimated Duration" value={inspection.estimatedDuration} />
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
