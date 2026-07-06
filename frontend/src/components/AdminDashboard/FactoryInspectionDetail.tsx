'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    ArrowLeft, Building2, ShieldCheck, Factory, Award,
    CheckCircle, XCircle, AlertTriangle, Clock,
    FileText, ClipboardList, Package, Settings, Download, Camera, MapPin,
    Phone, Globe, Landmark, Tags, Briefcase, User, Users, Warehouse
} from 'lucide-react'
import { Badge } from '@/components/UI/Badge'
import vendorService from '@/services/vendorService'
import { generateFactoryInspectionPdf } from '@/lib/factoryInspectionReportPdf'
import type { FactoryImageEntry, FactoryReportMeta } from '@/lib/factoryInspectionReportPdf'
import { formatCheckerName } from '@/lib/checkerUtils'

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

// ── Label maps ─────────────────────────────────────────────────────────────────
const BIZ_TYPE: Record<string, string> = {
    proprietorship: 'Proprietorship',
    'pvt-ltd': 'Private Limited Company',
    'partnership-firm': 'Partnership Firm',
    llp: 'Limited Liability Partnership (LLP)',
    unregistered: 'Unregistered',
}
const OWN_TYPE: Record<string, string> = { owned: 'Owned', rented: 'Rented', lease: 'Lease' }
const EMP_COUNT: Record<string, string> = {
    '10-20': '10–20 employees', '20-50': '20–50 employees',
    '50-100': '50–100 employees', '100+': 'More than 100 employees',
}
const FACILITY_LABELS: Record<string, string> = {
    spinning: 'Spinning', weaving: 'Weaving', dyeing: 'Dyeing',
    printing: 'Printing', stitching: 'Stitching', finishing: 'Finishing',
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

function buildName(...parts: (string | undefined | null)[]): string {
    return parts.filter(Boolean).join(' ').trim() || '—'
}

// ── Verification types & helpers ───────────────────────────────────────────────
type VF = Record<string, { ok: boolean | null; remarks: string }>

function VerBadge({ k, vf }: { k: string; vf: VF }) {
    const v = vf[k]
    if (!v) return null
    if (v.ok === true) return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <CheckCircle className="w-2.5 h-2.5" />Verified
        </span>
    )
    if (v.ok === false) return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 shrink-0">
            <XCircle className="w-2.5 h-2.5" />Issue
        </span>
    )
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">Pending</span>
}

function VCard({ label, value, k, vf }: { label: string; value?: string | string[] | null; k?: string; vf?: VF }) {
    const ver = k && vf ? vf[k] : null
    const display = Array.isArray(value) ? (value.length === 0 ? '—' : value.join(', ')) : (value || '—')
    return (
        <div className="flex flex-col gap-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{label}</span>
                {k && vf && <VerBadge k={k} vf={vf} />}
            </div>
            <span className="text-sm font-semibold text-slate-900 break-words">{display}</span>
            {ver?.ok === false && ver.remarks && (
                <p className="text-xs text-red-600 mt-0.5 italic">{ver.remarks}</p>
            )}
        </div>
    )
}

function StepBadge({ prefixes, vf }: { prefixes: string[]; vf: VF }) {
    const entries = Object.entries(vf).filter(([k]) => prefixes.some(p => k.startsWith(p)))
    if (!entries.length) return null
    const ok   = entries.filter(([, v]) => v.ok === true).length
    const fail = entries.filter(([, v]) => v.ok === false).length
    if (fail > 0) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 shrink-0">{fail} issue{fail !== 1 ? 's' : ''}</span>
    if (ok === entries.length) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">All {ok} verified ✓</span>
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">{ok}/{entries.length} verified</span>
}

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

function SubHead({ title }: { title: string }) {
    return (
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-5 mb-2 pb-1 border-b border-slate-100 first:mt-0">
            {title}
        </p>
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
            const vendor: any = inspection.vendor || {}
            const vendorDocs: any[] = Array.isArray(vendor.documents) ? vendor.documents : []
            const imgResults = await Promise.all(
                vendorDocs.filter((d: any) => d.type === 'OTHER' && d.documentUrl)
                    .map(async (d: any): Promise<FactoryImageEntry | null> => {
                        const dataUrl = await fetchImgDataUrl(d.documentUrl)
                        return dataUrl ? { label: d.name || 'Factory Image', dataUrl } : null
                    })
            )
            const vendorFactoryImages = imgResults.filter((x): x is FactoryImageEntry => x !== null)
            const meta: FactoryReportMeta = {
                inspectorName: fd.inspectorName || formatCheckerName(inspection.checker),
                inspectionDate: fd.inspectionDate,
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
            })
            const vendorName = vendor.companyName || fd.vendorName || 'Report'
            pdf.save(`Factory_Report_${vendorName.replace(/\s+/g, '_')}_${inspectionId.slice(-8).toUpperCase()}.pdf`)
        }
        buildAndSave().catch(() => {})
    }, [autoDownload, loading, inspection, downloading, inspectionId])

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
            const vendor: any = inspection.vendor || {}
            const vendorDocs: any[] = Array.isArray(vendor.documents) ? vendor.documents : []
            const imgResults = await Promise.all(
                vendorDocs.filter((d: any) => d.type === 'OTHER' && d.documentUrl)
                    .map(async (d: any): Promise<FactoryImageEntry | null> => {
                        const dataUrl = await fetchImgDataUrl(d.documentUrl)
                        return dataUrl ? { label: d.name || 'Factory Image', dataUrl } : null
                    })
            )
            const vendorFactoryImages = imgResults.filter((x): x is FactoryImageEntry => x !== null)
            const meta: FactoryReportMeta = {
                inspectorName: fd.inspectorName || formatCheckerName(inspection.checker),
                inspectionDate: fd.inspectionDate,
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
    const vendor = inspection.vendor || {}

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
                        <p className="text-neutral-400 text-xs mt-0.5">{inspection.scheduledTime}</p>
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

                    {/* Section 1: Company Information */}
                    <Section title="1 — Company Information" icon={Briefcase} accent="bg-blue-50 text-blue-800"
                        badge={<StepBadge prefixes={['c_']} vf={vf} />}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <VCard label="Company Name" value={vendor.companyName} k="c_companyName" vf={vf} />
                            <VCard label="Business Type" value={BIZ_TYPE[vendor.businessType] || vendor.businessType} k="c_businessType" vf={vf} />
                            {vendor.gstNumber
                                ? <VCard label="GST Number" value={vendor.gstNumber} k="c_gstNumber" vf={vf} />
                                : <VCard label="GST Status" value="Unregistered — no GST number" k="c_unregistered" vf={vf} />
                            }
                            {vendor.panNumber && <VCard label="PAN Number" value={vendor.panNumber} k="c_panNumber" vf={vf} />}
                            {vendor.companyIdNumber && <VCard label="Company ID Number" value={vendor.companyIdNumber} k="c_companyIdNumber" vf={vf} />}
                            {vendor.iecCode && <VCard label="IEC Code" value={vendor.iecCode} k="c_iecCode" vf={vf} />}
                            {vendor.aadhaarNumber && <VCard label="Aadhaar Number" value={vendor.aadhaarNumber} k="c_aadhaarNumber" vf={vf} />}
                            {vendor.website && <VCard label="Website" value={vendor.website} k="c_website" vf={vf} />}
                        </div>
                        {(() => {
                            const COMPANY_DOC_TYPES = ['GST_CERTIFICATE', 'PAN_CARD', 'COMPANY_REGISTRATION', 'AADHAAR_CARD', 'TRADE_LICENSE', 'EXPORT_LICENSE']
                            const docs = Array.isArray(vendor.documents)
                                ? vendor.documents.filter((d: any) => COMPANY_DOC_TYPES.includes(d.type))
                                : []
                            if (!docs.length) return null
                            return (
                                <>
                                    <SubHead title="Company Documents" />
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {docs.map((doc: any, idx: number) => (
                                            <VCard
                                                key={idx}
                                                label={doc.name || doc.type || `Document ${idx + 1}`}
                                                value={doc.documentUrl ? 'Document on file' : '—'}
                                                k={`c_doc_${doc.type || idx}`}
                                                vf={vf}
                                            />
                                        ))}
                                    </div>
                                </>
                            )
                        })()}
                    </Section>

                    {/* Section 2: Warehouse & Factory Details */}
                    <Section title="2 — Warehouse & Factory Details" icon={Warehouse} accent="bg-teal-50 text-teal-800"
                        badge={<StepBadge prefixes={['w_']} vf={vf} />}>
                        <SubHead title="Legal Address & Factory Site" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <VCard label="Ownership Type" value={OWN_TYPE[vendor.ownershipType] || vendor.ownershipType} k="w_ownershipType" vf={vf} />
                            <VCard label="Warehousing Capacity" value={vendor.warehouseSize} k="w_warehouseSize" vf={vf} />
                            {vendor.warehouseAddress && <VCard label="Address Line 1" value={vendor.warehouseAddress} k="w_warehouseAddress" vf={vf} />}
                            {vendor.warehouseAddressLine2 && <VCard label="Address Line 2" value={vendor.warehouseAddressLine2} k="w_warehouseAddressLine2" vf={vf} />}
                            {vendor.warehouseAddressLine3 && <VCard label="Address Line 3" value={vendor.warehouseAddressLine3} k="w_warehouseAddressLine3" vf={vf} />}
                            {vendor.warehouseLandmark && <VCard label="Landmark" value={vendor.warehouseLandmark} k="w_warehouseLandmark" vf={vf} />}
                            {vendor.warehouseCity && <VCard label="City" value={vendor.warehouseCity} k="w_warehouseCity" vf={vf} />}
                            {vendor.warehouseState && <VCard label="State" value={vendor.warehouseState} k="w_warehouseState" vf={vf} />}
                            {vendor.warehouseZipCode && <VCard label="ZIP / Postal Code" value={vendor.warehouseZipCode} k="w_warehouseZipCode" vf={vf} />}
                            {vendor.warehouseCountry && <VCard label="Country" value={vendor.warehouseCountry} k="w_warehouseCountry" vf={vf} />}
                        </div>
                        {(() => {
                            const eq = (a: any, b: any) => (a || '').trim() === (b || '').trim()
                            const isSameAsLegal = (
                              !vendor.factoryAddress && !vendor.factoryCity
                            ) || (
                              eq(vendor.factoryAddress, vendor.warehouseAddress) &&
                              eq(vendor.factoryCity, vendor.warehouseCity) &&
                              eq(vendor.factoryState, vendor.warehouseState) &&
                              eq(vendor.factoryZipCode, vendor.warehouseZipCode) &&
                              eq(vendor.factoryCountry, vendor.warehouseCountry)
                            )
                            return (
                                <>
                                    <SubHead title="Warehouse Address" />
                                    {isSameAsLegal ? (
                                        <div className="col-span-full p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 font-medium">
                                            Warehouse Address is the same as the Legal Address &amp; Factory Site provided above.
                                            {vf['w_sameWarehouse'] && <span className="ml-2"><VerBadge k="w_sameWarehouse" vf={vf} /></span>}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {vendor.factoryAddress && <VCard label="Address Line 1" value={vendor.factoryAddress} k="w_factoryAddress" vf={vf} />}
                                            {vendor.factoryCity && <VCard label="City" value={vendor.factoryCity} k="w_factoryCity" vf={vf} />}
                                            {vendor.factoryState && <VCard label="State" value={vendor.factoryState} k="w_factoryState" vf={vf} />}
                                            {vendor.factoryZipCode && <VCard label="ZIP Code" value={vendor.factoryZipCode} k="w_factoryZipCode" vf={vf} />}
                                            {vendor.factoryCountry && <VCard label="Country" value={vendor.factoryCountry} k="w_factoryCountry" vf={vf} />}
                                            {vendor.mapLink && <VCard label="Map / Location Link" value={vendor.mapLink} k="w_mapLink" vf={vf} />}
                                        </div>
                                    )}
                                    {isSameAsLegal && vendor.mapLink && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                                            <VCard label="Map / Location Link" value={vendor.mapLink} k="w_mapLink" vf={vf} />
                                        </div>
                                    )}
                                </>
                            )
                        })()}
                        {(() => {
                            const factoryImgs = Array.isArray(vendor.documents)
                                ? vendor.documents.filter((d: any) => d.type === 'OTHER' && d.documentUrl)
                                : []
                            if (!factoryImgs.length) return null
                            return (
                                <>
                                    <SubHead title="Factory Photos (Vendor-Uploaded)" />
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {factoryImgs.map((doc: any, idx: number) => {
                                            const src = doc.documentUrl
                                            const caption = doc.name || `Photo ${idx + 1}`
                                            const isImg = /\.(png|jpe?g|gif|webp)(\?|$)/i.test(src)
                                            return isImg ? (
                                                <div key={idx} className="cursor-pointer" onClick={() => setSelectedImage({ src, alt: caption })}>
                                                    <img src={src} alt={caption} onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                        className="w-full h-24 object-cover rounded-xl border border-slate-200 hover:scale-[1.02] transition-transform" />
                                                    <p className="mt-1 text-[11px] text-slate-600 truncate font-medium">{caption}</p>
                                                    <div className="mt-0.5">{vf[`w_factoryImg_${idx}`] && <VerBadge k={`w_factoryImg_${idx}`} vf={vf} />}</div>
                                                </div>
                                            ) : (
                                                <VCard key={idx} label={caption} value="Document on file" k={`w_factoryImg_${idx}`} vf={vf} />
                                            )
                                        })}
                                    </div>
                                </>
                            )
                        })()}
                    </Section>

                    {/* Section 3: Owner Profile */}
                    <Section title="3 — Owner Profile" icon={User} accent="bg-violet-50 text-violet-800"
                        badge={<StepBadge prefixes={['o_']} vf={vf} />}>
                        <SubHead title="Owner Identity" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <VCard label="Owner Full Name"
                                value={buildName(vendor.ownerTitle, vendor.ownerFirstName, vendor.ownerMiddleName, vendor.ownerLastName) || vendor.ownerName}
                                k="o_ownerName" vf={vf} />
                            <VCard label="Designation" value={vendor.designation} k="o_designation" vf={vf} />
                            <VCard label="Primary Phone" value={vendor.ownerPhone} k="o_ownerPhone" vf={vf} />
                            {vendor.ownerPhone2 && <VCard label="Secondary Phone" value={vendor.ownerPhone2} k="o_ownerPhone2" vf={vf} />}
                            <VCard label="Primary Email" value={vendor.ownerEmail} k="o_ownerEmail" vf={vf} />
                            {vendor.ownerEmail2 && <VCard label="Secondary Email" value={vendor.ownerEmail2} k="o_ownerEmail2" vf={vf} />}
                            {(vendor.ownerLocalLandlineStd && vendor.ownerLandline) && (
                                <VCard label="Local Landline" value={`+91-${vendor.ownerLocalLandlineStd}-${vendor.ownerLandline}`} k="o_ownerLandline" vf={vf} />
                            )}
                            {vendor.ownerIntlLandline && <VCard label="International Landline" value={vendor.ownerIntlLandline} k="o_ownerIntlLandline" vf={vf} />}
                            <VCard label="Business Start Date" value={vendor.businessStartDate} k="o_businessStartDate" vf={vf} />
                            <VCard label="Number of Employees" value={EMP_COUNT[vendor.employeeCount] || vendor.employeeCount} k="o_employeeCount" vf={vf} />
                        </div>
                        {(vendor.ownerAddress || vendor.ownerCity || vendor.ownerState) && (
                            <>
                                <SubHead title="Owner Address" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {vendor.ownerAddress && <VCard label="Address" value={vendor.ownerAddress} k="o_ownerAddress" vf={vf} />}
                                    {vendor.ownerCity && <VCard label="City" value={vendor.ownerCity} k="o_ownerCity" vf={vf} />}
                                    {vendor.ownerState && <VCard label="State" value={vendor.ownerState} k="o_ownerState" vf={vf} />}
                                    {vendor.ownerZipCode && <VCard label="ZIP Code" value={vendor.ownerZipCode} k="o_ownerZipCode" vf={vf} />}
                                    {vendor.ownerCountry && <VCard label="Country" value={vendor.ownerCountry} k="o_ownerCountry" vf={vf} />}
                                </div>
                            </>
                        )}
                        {Array.isArray(vendor.additionalOwners) && vendor.additionalOwners.length > 0 && (
                            <>
                                <SubHead title="Additional Owners" />
                                <div className="space-y-4">
                                    {vendor.additionalOwners.map((owner: any, idx: number) => (
                                        <div key={idx} className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                                            <p className="text-xs font-bold text-slate-600 mb-3">Owner #{idx + 2}</p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                <VCard label="Full Name"
                                                    value={buildName(owner.title, owner.firstName, owner.middleName, owner.lastName)}
                                                    k={`o_add_${idx}_name`} vf={vf} />
                                                <VCard label="Designation" value={owner.designation} k={`o_add_${idx}_designation`} vf={vf} />
                                                {owner.email && <VCard label="Email" value={owner.email} k={`o_add_${idx}_email`} vf={vf} />}
                                                {owner.email2 && <VCard label="Secondary Email" value={owner.email2} k={`o_add_${idx}_email2`} vf={vf} />}
                                                {owner.phone && <VCard label="Phone" value={owner.phone} k={`o_add_${idx}_phone`} vf={vf} />}
                                                {owner.phone2 && <VCard label="Secondary Phone" value={owner.phone2} k={`o_add_${idx}_phone2`} vf={vf} />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </Section>

                    {/* Section 4: Vendor & Products */}
                    <Section title="4 — Vendor & Products" icon={Tags} accent="bg-indigo-50 text-indigo-800"
                        badge={<StepBadge prefixes={['vt_']} vf={vf} />}>
                        <SubHead title="Vendor Classification" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <VCard label="Vendor Types" value={vendor.vendorTypes} k="vt_vendorTypes" vf={vf} />
                            <VCard label="Product Categories" value={vendor.productCategories} k="vt_productCategories" vf={vf} />
                            {vendor.categoryRemarks && <VCard label="Category Remarks" value={vendor.categoryRemarks} k="vt_categoryRemarks" vf={vf} />}
                            {vendor.qualityControl && <VCard label="Quality Control Measures" value={vendor.qualityControl} k="vt_qualityControl" vf={vf} />}
                        </div>
                        {(vendor.marketFocus || vendor.primaryMarkets?.length > 0 || vendor.domesticMarkets?.length > 0) && (
                            <>
                                <SubHead title="Market Focus" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {vendor.marketFocus && <VCard label="Market Focus" value={vendor.marketFocus} k="vt_marketFocus" vf={vf} />}
                                    {vendor.primaryMarkets?.length > 0 && <VCard label="Primary Markets" value={vendor.primaryMarkets} k="vt_primaryMarkets" vf={vf} />}
                                    {vendor.domesticMarkets?.length > 0 && <VCard label="Domestic Markets" value={vendor.domesticMarkets} k="vt_domesticMarkets" vf={vf} />}
                                </div>
                            </>
                        )}
                        {Array.isArray(vendor.products) && vendor.products.length > 0 && (
                            <>
                                <SubHead title={`Registered Products (${vendor.products.length})`} />
                                <div className="space-y-4">
                                    {vendor.products.map((product: any, pIdx: number) => {
                                        const prefix = `vt_prod_${pIdx}`
                                        const productVfKeys = Object.keys(vf).filter(k => k.startsWith(`${prefix}_`))
                                        const ok = productVfKeys.filter(k => vf[k]?.ok === true).length
                                        const fail = productVfKeys.filter(k => vf[k]?.ok === false).length
                                        return (
                                            <div key={product.id || pIdx} className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-sm font-bold text-slate-700">#{pIdx + 1} — {product.name || '—'}</p>
                                                    {productVfKeys.length > 0 && (
                                                        fail > 0
                                                            ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">{fail} issue{fail !== 1 ? 's' : ''}</span>
                                                            : ok > 0
                                                                ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{ok}/{productVfKeys.length} verified</span>
                                                                : null
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    <VCard label="Category" value={product.category} k={`${prefix}_category`} vf={vf} />
                                                    <VCard label="Base SKU" value={product.baseSku} k={`${prefix}_baseSku`} vf={vf} />
                                                    <VCard label="Base Price" value={product.basePrice ? `₹${product.basePrice}` : undefined} k={`${prefix}_basePrice`} vf={vf} />
                                                    <VCard label="GST %" value={product.gstPercentage} k={`${prefix}_gstPercentage`} vf={vf} />
                                                    <VCard label="Total Stock" value={product.totalStock} k={`${prefix}_totalStock`} vf={vf} />
                                                    {product.uom && <VCard label="Unit of Measure" value={product.uom} k={`${prefix}_uom`} vf={vf} />}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </Section>

                    {/* Section 5: Manufacturing Facilities */}
                    {(() => {
                        const enabledFacilities: Record<string, boolean> = vendor.enabledFacilities || {}
                        const facilityDetails: Record<string, any> = vendor.facilityDetails || {}
                        const active = Object.keys(FACILITY_LABELS).filter(f => enabledFacilities[f])
                        if (!vendor.productionCapacity && active.length === 0) return null
                        return (
                            <Section title="5 — Manufacturing Facilities" icon={Factory} accent="bg-orange-50 text-orange-800"
                                badge={<StepBadge prefixes={['mf_']} vf={vf} />}>
                                {vendor.productionCapacity && (
                                    <>
                                        <SubHead title="Overall Production Capacity" />
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <VCard label="Monthly Production Capacity" value={vendor.productionCapacity} k="mf_productionCapacity" vf={vf} />
                                        </div>
                                    </>
                                )}
                                {active.length > 0 && (
                                    <>
                                        <SubHead title="Active Facilities" />
                                        <div className="space-y-4">
                                            {active.map(facilityKey => {
                                                const details = facilityDetails[facilityKey] || {}
                                                const prefix = `mf_${facilityKey}`
                                                return (
                                                    <div key={facilityKey} className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                            <p className="text-sm font-bold text-slate-700">{FACILITY_LABELS[facilityKey]}</p>
                                                            <VerBadge k={`${prefix}_active`} vf={vf} />
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                            {Object.entries(details).map(([key, val]) => {
                                                                if (!val || key === 'remarks') return null
                                                                return <VCard key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={String(val)} k={`${prefix}_${key}`} vf={vf} />
                                                            })}
                                                            {details.remarks && <VCard label="Remarks" value={details.remarks} k={`${prefix}_remarks`} vf={vf} />}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>
                                )}
                            </Section>
                        )
                    })()}

                    {/* Section 6: Certifications & Quality Control */}
                    {(() => {
                        const certifications: any[] = Array.isArray(vendor.certifications) ? vendor.certifications : []
                        const CERT_DOC_TYPES = ['EXPORT_LICENSE', 'FACTORY_LICENSE', 'POLLUTION_CERTIFICATE', 'FIRE_SAFETY_CERTIFICATE', 'BANK_STATEMENT', 'AUDITED_FINANCIALS']
                        const certDocs = Array.isArray(vendor.documents) ? vendor.documents.filter((d: any) => CERT_DOC_TYPES.includes(d.type)) : []
                        if (!certifications.length && !vendor.complianceStandards && !vendor.packagingCapabilities && !certDocs.length) return null
                        return (
                            <Section title="6 — Certifications & Quality Control" icon={Award} accent="bg-emerald-50 text-emerald-800"
                                badge={<StepBadge prefixes={['cert_', 'certDoc_']} vf={vf} />}>
                                {certifications.length > 0 && (
                                    <>
                                        <SubHead title="Quality Certifications" />
                                        <div className="space-y-4">
                                            {certifications.map((cert: any, idx: number) => {
                                                const prefix = `cert_${idx}`
                                                return (
                                                    <div key={cert.id || idx} className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                                                        <p className="text-xs font-bold text-slate-600 mb-3">Certificate #{idx + 1}: {cert.name}</p>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                            <VCard label="Certificate Name" value={cert.name} k={`${prefix}_name`} vf={vf} />
                                                            {cert.issuedBy && <VCard label="Issued By" value={cert.issuedBy} k={`${prefix}_issuedBy`} vf={vf} />}
                                                            {cert.certificateNumber && <VCard label="Certificate Number" value={cert.certificateNumber} k={`${prefix}_number`} vf={vf} />}
                                                            {cert.issuedDate && <VCard label="Issue Date" value={cert.issuedDate} k={`${prefix}_issuedDate`} vf={vf} />}
                                                            {cert.expiryDate && <VCard label="Expiry Date" value={cert.expiryDate} k={`${prefix}_expiryDate`} vf={vf} />}
                                                            {cert.description && <VCard label="Description" value={cert.description} k={`${prefix}_description`} vf={vf} />}
                                                            {cert.documentUrl && <VCard label="Certificate Document" value="Document on file" k={`${prefix}_document`} vf={vf} />}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>
                                )}
                                {(vendor.complianceStandards || vendor.packagingCapabilities) && (
                                    <>
                                        <SubHead title="Standards & Packaging" />
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {vendor.complianceStandards && <VCard label="Compliance Standards" value={vendor.complianceStandards} k="cert_complianceStandards" vf={vf} />}
                                            {vendor.packagingCapabilities && <VCard label="Packaging Capabilities" value={vendor.packagingCapabilities} k="cert_packagingCapabilities" vf={vf} />}
                                        </div>
                                    </>
                                )}
                                {certDocs.length > 0 && (
                                    <>
                                        <SubHead title="Supporting Documents" />
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {certDocs.map((doc: any, idx: number) => (
                                                <VCard key={idx} label={doc.name || doc.type || `Document ${idx + 1}`} value="Document on file" k={`certDoc_${doc.type || idx}`} vf={vf} />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </Section>
                        )
                    })()}

                    {/* Section 7: Contact & Trade Information */}
                    <Section title="7 — Contact & Trade Information" icon={Phone} accent="bg-purple-50 text-purple-800"
                        badge={<StepBadge prefixes={['ct_']} vf={vf} />}>
                        <SubHead title="Business Contact Details" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <VCard label="Primary Phone" value={vendor.businessPhone} k="ct_businessPhone" vf={vf} />
                            {vendor.phoneNumber2 && <VCard label="Secondary Phone" value={vendor.phoneNumber2} k="ct_phoneNumber2" vf={vf} />}
                            <VCard label="Primary Email" value={vendor.businessEmail} k="ct_businessEmail" vf={vf} />
                            {vendor.businessEmail2 && <VCard label="Secondary Email" value={vendor.businessEmail2} k="ct_businessEmail2" vf={vf} />}
                            {(vendor.localLandlineStd && vendor.landlineNumber) && (
                                <VCard label="Local Landline" value={`+91-${vendor.localLandlineStd}-${vendor.landlineNumber}`} k="ct_landline" vf={vf} />
                            )}
                            {vendor.intlLandline && <VCard label="International Landline" value={vendor.intlLandline} k="ct_intlLandline" vf={vf} />}
                        </div>
                        {(vendor.businessAddress || vendor.businessCity) && (
                            <>
                                <SubHead title="Factory Site / Legal Address" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {vendor.businessAddress && <VCard label="Address Line 1" value={vendor.businessAddress} k="ct_businessAddress" vf={vf} />}
                                    {vendor.addressLine2 && <VCard label="Address Line 2" value={vendor.addressLine2} k="ct_addressLine2" vf={vf} />}
                                    {vendor.addressLine3 && <VCard label="Address Line 3" value={vendor.addressLine3} k="ct_addressLine3" vf={vf} />}
                                    {vendor.landmark && <VCard label="Landmark" value={vendor.landmark} k="ct_landmark" vf={vf} />}
                                    {vendor.businessCity && <VCard label="City" value={vendor.businessCity} k="ct_businessCity" vf={vf} />}
                                    {vendor.businessState && <VCard label="State" value={vendor.businessState} k="ct_businessState" vf={vf} />}
                                    {vendor.businessZipCode && <VCard label="ZIP / Postal Code" value={vendor.businessZipCode} k="ct_businessZipCode" vf={vf} />}
                                    {vendor.businessCountry && <VCard label="Country" value={vendor.businessCountry} k="ct_businessCountry" vf={vf} />}
                                </div>
                            </>
                        )}
                        {vendor.mainContact && (
                            <>
                                <SubHead title="Main Contact Person" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <VCard label="Contact Name"
                                        value={buildName(vendor.mainContact.title, vendor.mainContact.firstName, vendor.mainContact.middleName, vendor.mainContact.lastName)}
                                        k="ct_mainContact_name" vf={vf} />
                                    {vendor.mainContact.designation && <VCard label="Designation" value={vendor.mainContact.designation} k="ct_mainContact_designation" vf={vf} />}
                                    {vendor.mainContact.department && <VCard label="Department" value={vendor.mainContact.department} k="ct_mainContact_department" vf={vf} />}
                                    {vendor.mainContact.email1 && <VCard label="Primary Email" value={vendor.mainContact.email1} k="ct_mainContact_email1" vf={vf} />}
                                    {vendor.mainContact.email2 && <VCard label="Secondary Email" value={vendor.mainContact.email2} k="ct_mainContact_email2" vf={vf} />}
                                    {vendor.mainContact.phone1 && <VCard label="Primary Phone" value={vendor.mainContact.phone1} k="ct_mainContact_phone1" vf={vf} />}
                                    {vendor.mainContact.phone2 && <VCard label="Secondary Phone" value={vendor.mainContact.phone2} k="ct_mainContact_phone2" vf={vf} />}
                                </div>
                            </>
                        )}
                        {Array.isArray(vendor.alternateContacts) && vendor.alternateContacts.length > 0 && (
                            <>
                                <SubHead title="Contact Person 2" />
                                <div className="space-y-4">
                                    {vendor.alternateContacts.map((contact: any, idx: number) => {
                                        const prefix = `ct_alt_${idx}`
                                        return (
                                            <div key={idx} className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                                                <p className="text-xs font-bold text-slate-600 mb-3">Contact Person {idx + 2}</p>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    <VCard label="Name"
                                                        value={buildName(contact.title, contact.firstName, contact.middleName, contact.lastName)}
                                                        k={`${prefix}_name`} vf={vf} />
                                                    {contact.designation && <VCard label="Designation" value={contact.designation} k={`${prefix}_designation`} vf={vf} />}
                                                    {contact.department && <VCard label="Department" value={contact.department} k={`${prefix}_department`} vf={vf} />}
                                                    {contact.email1 && <VCard label="Primary Email" value={contact.email1} k={`${prefix}_email1`} vf={vf} />}
                                                    {contact.phone1 && <VCard label="Primary Phone" value={contact.phone1} k={`${prefix}_phone1`} vf={vf} />}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                        {(vendor.tradeLicenseNumber || vendor.businessRegistrationNumber || vendor.taxIdentificationNumber) && (
                            <>
                                <SubHead title="Trade & Regulatory Details" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {vendor.tradeLicenseNumber && <VCard label="Trade License Number" value={vendor.tradeLicenseNumber} k="ct_tradeLicense" vf={vf} />}
                                    {vendor.businessRegistrationNumber && <VCard label="Business Registration Number" value={vendor.businessRegistrationNumber} k="ct_businessRegNumber" vf={vf} />}
                                    {vendor.taxIdentificationNumber && <VCard label="Tax Identification Number" value={vendor.taxIdentificationNumber} k="ct_taxId" vf={vf} />}
                                </div>
                            </>
                        )}
                        {(vendor.importExperience !== undefined || vendor.exportExperience !== undefined) && (
                            <>
                                <SubHead title="Import / Export Experience" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {vendor.importExperience !== undefined && <VCard label="Import Experience" value={vendor.importExperience ? 'Yes' : 'No'} k="ct_importExp" vf={vf} />}
                                    {vendor.importCountries?.length > 0 && <VCard label="Import Countries" value={vendor.importCountries} k="ct_importCountries" vf={vf} />}
                                    {vendor.exportExperience !== undefined && <VCard label="Export Experience" value={vendor.exportExperience ? 'Yes' : 'No'} k="ct_exportExp" vf={vf} />}
                                    {vendor.exportCountries?.length > 0 && <VCard label="Export Countries" value={vendor.exportCountries} k="ct_exportCountries" vf={vf} />}
                                </div>
                            </>
                        )}
                        {vendor.bankDetails && (
                            <>
                                <SubHead title="Banking Details" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <VCard label="Bank Name" value={vendor.bankDetails.bankName} k="ct_bankName" vf={vf} />
                                    <VCard label="Account Type" value={vendor.bankDetails.accountType} k="ct_accountType" vf={vf} />
                                    <VCard label="Account Holder Name" value={vendor.bankDetails.accountHolderName} k="ct_accountHolderName" vf={vf} />
                                    {vendor.bankDetails.accountNumber && (
                                        <VCard label="Account Number" value={`****${String(vendor.bankDetails.accountNumber).slice(-4)}`} k="ct_accountNumber" vf={vf} />
                                    )}
                                    <VCard label="IFSC Code" value={vendor.bankDetails.ifscCode} k="ct_ifscCode" vf={vf} />
                                    {vendor.bankDetails.swiftCode && <VCard label="SWIFT Code" value={vendor.bankDetails.swiftCode} k="ct_swiftCode" vf={vf} />}
                                    {vendor.bankDetails.branchName && <VCard label="Branch Name" value={vendor.bankDetails.branchName} k="ct_branchName" vf={vf} />}
                                    {vendor.bankDetails.branchAddress && <VCard label="Branch Address" value={vendor.bankDetails.branchAddress} k="ct_branchAddress" vf={vf} />}
                                </div>
                            </>
                        )}
                    </Section>

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
