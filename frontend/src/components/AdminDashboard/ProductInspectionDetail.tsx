'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, ShieldCheck,
    CheckCircle, XCircle, AlertTriangle,
    Truck, Camera, Download, FlaskConical, Star, Check, X, FileText, MapPin, Video, Factory
} from 'lucide-react'
import { Badge } from '@/components/UI/Badge'
import productService from '@/services/productService'
import { generateProductInspectionPdf } from '@/lib/productInspectionReportPdf'
import reinspectionService, { AuditLogEntry } from '@/services/reinspectionService'
import InspectionAuditTimeline from './ReInspection/InspectionAuditTimeline'
import ApproveProductModal, { type ApprovableProduct } from './Products/ApproveProductModal'
import ProductRejectionModal from './Products/ProductRejectionModal'
import { adminProductService } from '@/services/adminProductService'
import { hasPermission } from '@/lib/auth'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import { describeLocationVerification, inspectionTypeLabel } from "@/lib/checkerLocation"
import ManufacturerInfoCard from "@/components/Shared/ManufacturerInfoCard"
import { hasManufacturerInfo } from "@/lib/manufacturerInfo"

interface Props {
    productId: string
    /**
     * Where this report is opened from. In the Vendor Requests module a product
     * may not be inspected yet, so we show a "not inspected" state (with a link
     * to the full product detail) instead of a generic "report missing" error.
     */
    context?: 'qc-reports' | 'vendor-requests'
}

// ── Helper Components ──────────────────────────────────────────────────────────
function StatusChip({ value }: { value: string }) {
    const v = (value || '').toLowerCase()
    const isPass = ['yes', 'pass', 'passed', 'approved'].includes(v)
    const isFail = ['no', 'fail', 'failed', 'rejected'].includes(v)
    const color = isPass
        ? 'text-green-700 bg-green-50 border-green-200'
        : isFail
            ? 'text-red-700 bg-red-50 border-red-200'
            : 'text-amber-700 bg-amber-50 border-amber-200'
    const Icon = isPass ? CheckCircle : isFail ? XCircle : AlertTriangle
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
            <Icon className="w-3.5 h-3.5" />
            {value}
        </span>
    )
}

function InfoCard({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div className="flex flex-col gap-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-semibold text-slate-900 break-words">{value ?? '—'}</span>
        </div>
    )
}

function Section({ title, icon: Icon, accent, children }: {
    title: string; icon: any; accent: string; children: React.ReactNode
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-100 ${accent}`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <h3 className="font-bold text-sm tracking-wide">{title}</h3>
            </div>
            <div className="p-6">{children}</div>
        </div>
    )
}

function PhotoGallery({ photos, title, onImageClick }: { photos?: any[]; title: string; onImageClick?: (src: string, alt: string) => void }) {
    if (!photos || photos.length === 0) return null;
    return (
        <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" />
                {title} ({photos.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {photos.map((p: any, i: number) => {
                    const src = p?.data || p?.url || (typeof p === 'string' ? p : null)
                    return src ? (
                        <div key={i} className="relative group aspect-square cursor-pointer" onClick={() => { if (onImageClick) onImageClick(src, p.name || `Photo ${i + 1}`) }}>
                            <img
                                src={src}
                                alt={p.name || `Photo ${i + 1}`}
                                className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-sm transition-transform group-hover:scale-[1.02]"
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-slate-900/50 text-white text-[10px] px-2 py-1 rounded-b-xl truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                {p.name || `Photo ${i + 1}`}
                            </div>
                        </div>
                    ) : (
                        <div key={i} className="aspect-square flex items-center justify-center bg-slate-100 rounded-xl border border-dashed border-slate-300">
                            <span className="text-[10px] text-slate-400">No Image</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// Packaging remark-code → label (matches the inspection form + PDF generator).
const REMARK_LABELS: Record<number, string> = {
    1: "Critical Defect", 2: "Major Defect", 3: "Functional Fail",
    4: "Safety Issue", 5: "Non-Conformance", 6: "Minor Issue",
    7: "Re-inspection", 8: "Acceptable", 9: "Good", 10: "Excellent",
}

// Humanize a productVerifications key (e.g. "pv_spec_gsm" → "Spec Gsm").
function humanizeVerKey(key: string): string {
    return key.replace(/^pv_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

// camelCase / snake_case evidence key → Title Case (e.g. "factoryFrontView" → "Factory Front View").
function humanizeEvidenceKey(key: string): string {
    return key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProductInspectionDetail({ productId, context }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const autoDownload = searchParams.get('download') === 'true'
    const [product, setProduct] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)
    const [selectedImage, setSelectedImage] = useState<{src: string, alt: string} | null>(null)
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
    const autoDownloadTriggered = useRef(false)
    // Admin decision state — only used in the Vendor Requests context.
    const [showApproveModal, setShowApproveModal] = useState(false)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)

    const loadProduct = useCallback(async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setLoading(true)
        try {
            const res = await productService.getProduct(productId)
            if (res.success && res.data) {
                setProduct(res.data)
                setError(null)
                // Fetch audit trail (non-critical)
                reinspectionService.getAuditTrail('PRODUCT_INSPECTION', productId)
                    .then(r => setAuditLogs(r.logs || []))
                    .catch(() => {})
            } else {
                setError('Product report not found')
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load product report')
        } finally {
            setLoading(false)
        }
    }, [productId])

    useEffect(() => { loadProduct() }, [loadProduct])

    const handleReject = async (reason: string) => {
        setActionLoading(true)
        try {
            const res = await adminProductService.rejectProduct(productId, reason)
            if (res.success) {
                showSuccessToast('Product Rejected', 'The vendor has been notified of the rejection.')
                setShowRejectModal(false)
                await loadProduct({ silent: true })
            } else {
                showErrorToast('Rejection Failed', res.message || 'Unable to reject product.')
            }
        } catch (e: any) {
            showErrorToast('Rejection Failed', e.message || 'Unable to reject product.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleDownloadPdf = async () => {
        if (!product) return
        setDownloading(true)
        try {
            const fd = ((product as any).qcInspectionData || {}) as Record<string, any>
            const productName = (product as any).name || 'Report'
            const meta = {
                productName: (product as any).name,
                vendorName: (product as any).vendor?.companyName || fd.vendor,
                checker: (product as any).assignedQc || null,
                // Coordinates recorded when the CHECKER submitted, read from the stored
                // snapshot — never the viewer's own position.
                inspectionType: fd.inspectionType,
                location: fd.checkerLocation?.checkerLatitude != null
                    ? { latitude: fd.checkerLocation.checkerLatitude, longitude: fd.checkerLocation.checkerLongitude }
                    : undefined,
                generatedAt: new Date(),
            }
            const pdf = generateProductInspectionPdf(fd, meta, {})
            pdf.save(`Product_Report_${String(productName).replace(/\s+/g, '_')}_${productId.slice(-8).toUpperCase()}.pdf`)
        } catch {
            alert('Failed to generate PDF. Please try again.')
        } finally {
            setDownloading(false)
        }
    }

    useEffect(() => {
        if (!autoDownload || autoDownloadTriggered.current || loading || !product || downloading) return
        autoDownloadTriggered.current = true
        const fd = ((product as any).qcInspectionData || {}) as Record<string, any>
        const productName = (product as any).name || 'Report'
        const meta = {
            productName: (product as any).name,
            vendorName: (product as any).vendor?.companyName || fd.vendor,
            checker: (product as any).assignedQc || null,
            // Coordinates recorded when the CHECKER submitted, read from the stored
            // snapshot — never the viewer's own position.
            inspectionType: fd.inspectionType,
            location: fd.checkerLocation?.checkerLatitude != null
                ? { latitude: fd.checkerLocation.checkerLatitude, longitude: fd.checkerLocation.checkerLongitude }
                : undefined,
            generatedAt: new Date(),
        }
        try {
            const pdf = generateProductInspectionPdf(fd, meta, {})
            pdf.save(`Product_Report_${String(productName).replace(/\s+/g, '_')}_${productId.slice(-8).toUpperCase()}.pdf`)
        } catch { /* silent */ }
    }, [autoDownload, loading, product, downloading, productId])

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
        </div>
    )

    if (error || !product || !(product as any).qcInspectionData) {
        // Product loaded fine but simply hasn't been inspected yet — common when
        // an admin opens a still-PENDING vendor request. Guide them to the full
        // product detail rather than showing a bare "report missing" error.
        const notInspectedYet = !error && product && !(product as any).qcInspectionData
        const productName = (product as any)?.name
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
                <AlertTriangle className="w-12 h-12 text-amber-500" />
                <p className="text-slate-800 text-lg font-semibold">
                    {notInspectedYet ? 'No inspection report yet' : (error || 'QC Report data missing')}
                </p>
                {notInspectedYet && (
                    <p className="text-slate-500 text-sm max-w-md">
                        {productName ? `"${productName}" ` : 'This product '}
                        hasn&apos;t been inspected yet, so there is no QC report to display. Once a QC checker submits the inspection, the report will appear here.
                    </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                    {notInspectedYet && context === 'vendor-requests' && (
                        <button
                            onClick={() => router.push(`/admin/dashboard/products/view/${productId}`)}
                            className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
                        >
                            View Product Details
                        </button>
                    )}
                    <button onClick={() => router.back()} className="text-slate-600 hover:text-slate-900 underline text-sm">Go back</button>
                </div>
            </div>
        )
    }

    const formData = (product as any).qcInspectionData
    const checkerLocation = (formData?.checkerLocation ?? null) as {
        checkerLatitude?: number | null
        checkerLongitude?: number | null
        vendorLatitude?: number | null
        vendorLongitude?: number | null
        distanceMeters?: number | null
        verified?: boolean
    } | null
    const inspectionType = (formData?.inspectionType as string | undefined) ?? undefined
    const locationVerification = describeLocationVerification({
        inspectionType,
        locationVerified: checkerLocation?.verified,
        locationDistanceM: checkerLocation?.distanceMeters,
        checkerLatitude: checkerLocation?.checkerLatitude,
    })
    const approvalStatus = (product as any).approvalStatus

    // Admin decision actions belong here (the QC report) — but only when this
    // page is opened from the Vendor Requests approval queue, never from the
    // read-only QC Reports module.
    const canDecide = context === 'vendor-requests'
    const approvableProduct: ApprovableProduct = {
        id: (product as any).id,
        name: (product as any).name,
        vendor: (product as any).vendor ? { companyName: (product as any).vendor.companyName } : null,
        basePrice: (product as any).basePrice ?? 0,
        originalPrice: (product as any).originalPrice ?? null,
        variants: (product as any).variants ?? null,
    }

    const statusColors: Record<string, string> = {
        QC_APPROVED: 'bg-green-50 text-green-700 border border-green-200',
        APPROVED: 'bg-green-50 text-green-700 border border-green-200',
        REJECTED: 'bg-red-50 text-red-700 border border-red-200',
        REINSPECTION: 'bg-amber-50 text-amber-700 border border-amber-200',
        PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
    }
    const statusLabels: Record<string, string> = {
        QC_APPROVED: 'Approved by QC', APPROVED: 'Approved', REJECTED: 'Rejected',
        REINSPECTION: 'Re-inspection', PENDING: 'Pending',
    }

    // ── New-schema inspection data (matches the 7-step form + PDF generator) ────
    const productVerifications: [string, any][] = Object.entries(formData.productVerifications || {})
    const packagingItems: any[] = Array.isArray(formData.packagingItems) ? formData.packagingItems : []
    const testGroups: any[] = Array.isArray(formData.testGroups) ? formData.testGroups : []
    const additionalEvidence: Record<string, any[]> =
        formData.additionalEvidence && typeof formData.additionalEvidence === 'object' ? formData.additionalEvidence : {}
    const inspectionStatus: string = formData.inspectionStatus || ''

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">Product Quality Report</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {product.name} &bull; SKU: {product.baseSku}
                    </p>
                </div>

                {/* Admin decision — the approve / reject / re-inspection call, made
                    after reviewing this report. Only in the Vendor Requests queue. */}
                {canDecide && approvalStatus === 'QC_APPROVED' && hasPermission('vendor_product_requests:approve') && (
                    <>
                        <button
                            onClick={() => setShowRejectModal(true)}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                            <X className="w-4 h-4" />
                            Reject
                        </button>
                        <button
                            onClick={() => setShowApproveModal(true)}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            <Check className="w-4 h-4" />
                            Approve
                        </button>
                    </>
                )}
                {canDecide && approvalStatus === 'REJECTED' && hasPermission('reinspection_review:view') && (
                    <Link
                        href={`/admin/dashboard/reinspection-review/product/${productId}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50 transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        Review &amp; Re-Inspect
                    </Link>
                )}
                {canDecide && approvalStatus === 'REINSPECTION' && (
                    <Badge className="bg-orange-50 text-orange-700 border border-orange-200">Awaiting QC Re-Inspection</Badge>
                )}

                <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1"
                >
                    <Download className="w-4 h-4" />
                    {downloading ? 'Generating...' : 'Download PDF'}
                </button>
                <div className="flex gap-2 flex-shrink-0">
                    <Badge className={statusColors[approvalStatus] || 'bg-slate-100 text-slate-700'}>
                        {statusLabels[approvalStatus] || approvalStatus}
                    </Badge>
                </div>
            </div>

            {/* PDF capture area */}
            <div className="space-y-6">

            {/* General Info Banner */}
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-6 text-white">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <div>
                        <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Vendor</p>
                        <p className="font-semibold text-sm">{formData.vendor || product.vendor?.companyName || '—'}</p>
                    </div>
                    <div>
                        <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Service Type</p>
                        <p className="font-semibold text-sm">{formData.serviceType || '—'}</p>
                    </div>
                    <div>
                        <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Location / Date</p>
                        <p className="font-semibold text-sm">{formData.serviceLocation || '—'}</p>
                        <p className="text-neutral-400 text-xs mt-0.5">{formData.serviceStartDate}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Section 1: Product Verification */}
                <Section title="Product Verification" icon={ShieldCheck} accent="bg-slate-50 text-slate-700">
                    {productVerifications.length > 0 ? (
                        <div className="mb-6 overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-600 font-semibold">
                                    <tr>
                                        <th className="p-3 border-b text-xs uppercase tracking-wider">Field</th>
                                        <th className="p-3 border-b text-xs uppercase tracking-wider text-center">Status</th>
                                        <th className="p-3 border-b text-xs uppercase tracking-wider">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productVerifications.map(([key, entry]) => {
                                        const ok = entry?.ok
                                        return (
                                            <tr key={key} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-900">{humanizeVerKey(key)}</td>
                                                <td className="p-3 text-center">
                                                    {ok === true ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle className="w-3.5 h-3.5" />Verified</span>
                                                    ) : ok === false ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><XCircle className="w-3.5 h-3.5" />Not Verified</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Not Checked</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-slate-600">{entry?.remarks || '—'}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm mb-4">No product fields were verified.</p>
                    )}
                    <PhotoGallery photos={formData.productEvidencePhotos} title="Product Evidence Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                </Section>

                {/* Section 2: Packaging Inspection */}
                <Section title="Packaging Inspection" icon={Truck} accent="bg-slate-50 text-slate-700">
                    {packagingItems.length > 0 ? (
                        <div className="mb-6 overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-600 font-semibold">
                                    <tr>
                                        <th className="p-3 border-b text-xs uppercase tracking-wider">Item</th>
                                        <th className="p-3 border-b text-xs uppercase tracking-wider text-center">Inspected</th>
                                        <th className="p-3 border-b text-xs uppercase tracking-wider">Remark Code</th>
                                        <th className="p-3 border-b text-xs uppercase tracking-wider">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {packagingItems.map((item, i) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="p-3 font-medium text-slate-900">{(item.label || '').split('—')[0].trim() || `Item ${i + 1}`}</td>
                                            <td className="p-3 text-center">
                                                {item.verified === true ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle className="w-3.5 h-3.5" />Yes</span>
                                                ) : item.verified === false ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><XCircle className="w-3.5 h-3.5" />No</span>
                                                ) : <span className="text-xs text-slate-400">—</span>}
                                            </td>
                                            <td className="p-3 text-slate-600">{item.remarkCode != null ? `${item.remarkCode} — ${REMARK_LABELS[item.remarkCode] || ''}` : '—'}</td>
                                            <td className="p-3 text-slate-600">{item.remarks || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm mb-4">No packaging items recorded.</p>
                    )}
                    <PhotoGallery photos={formData.packagingPhotos} title="Packaging Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                </Section>

                {/* Section 5: Defects & AQL — compact AQL table + defect-detail cards (mirrors Checker portal) */}
                <Section title="Defects & AQL" icon={XCircle} accent="bg-slate-50 text-slate-700">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        <InfoCard label="Inspection Level" value={formData.inspectionLevel} />
                        <InfoCard label="Sample Size" value={formData.sampleSize} />
                    </div>

                    <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">AQL Level</th>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Max Allowed</th>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Found</th>
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { label: 'Critical', aql: formData.aqlCritical, max: formData.maxAllowedCritical, found: formData.criticalDefects },
                                    { label: 'Major', aql: formData.aqlMajor, max: formData.maxAllowedMajor, found: formData.majorDefects },
                                    { label: 'Minor', aql: formData.aqlMinor, max: formData.maxAllowedMinor, found: formData.minorDefects },
                                ].map((row) => {
                                    const exceeded = row.found != null && row.max != null && Number(row.found) > Number(row.max)
                                    return (
                                        <tr key={row.label} className="border-b border-slate-100">
                                            <td className="py-2 px-3 font-medium text-slate-700">{row.label}</td>
                                            <td className="py-2 px-3 text-slate-600">{row.aql ?? '—'}</td>
                                            <td className="py-2 px-3 text-slate-600">{row.max ?? '—'}</td>
                                            <td className="py-2 px-3 text-slate-600">{row.found ?? '—'}</td>
                                            <td className="py-2 px-3">
                                                {row.found != null ? (
                                                    exceeded ? (
                                                        <span className="text-xs font-semibold text-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />Exceeded</span>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Within Limit</span>
                                                    )
                                                ) : <span className="text-slate-400">—</span>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {(formData.criticalDefectDetails || formData.majorDefectDetails || formData.minorDefectDetails) && (
                        <div className="space-y-2 mb-4">
                            {formData.criticalDefectDetails && (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-red-700 uppercase mb-1">Critical Defect Details</p>
                                    <p className="text-sm text-red-900">{formData.criticalDefectDetails}</p>
                                </div>
                            )}
                            {formData.majorDefectDetails && (
                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Major Defect Details</p>
                                    <p className="text-sm text-amber-900">{formData.majorDefectDetails}</p>
                                </div>
                            )}
                            {formData.minorDefectDetails && (
                                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-neutral-700 uppercase mb-1">Minor Defect Details</p>
                                    <p className="text-sm text-neutral-900">{formData.minorDefectDetails}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <PhotoGallery photos={formData.defectPhotos} title="Defect Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                </Section>

                {/* Section 4: On-site Testing — grouped testGroups */}
                <Section title="On-site Testing" icon={FlaskConical} accent="bg-slate-50 text-slate-700">
                    {testGroups.length > 0 ? (
                        <div className="space-y-6">
                            {testGroups.map((group: any, gi: number) => {
                                const groupTests: any[] = Array.isArray(group.tests) ? group.tests : []
                                const gPass = groupTests.filter((t) => t.pass).length
                                const gFail = groupTests.filter((t) => t.fail).length
                                return (
                                    <div key={gi}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <p className="font-bold text-sm text-slate-800">{group.label || `Group ${gi + 1}`}</p>
                                            <span className="text-xs text-emerald-600 font-semibold">{gPass} passed</span>
                                            <span className="text-xs text-red-600 font-semibold">{gFail} failed</span>
                                        </div>
                                        <div className="space-y-4">
                                            {groupTests.map((test: any, i: number) => {
                                                const passed = test.pass === true
                                                const failed = test.fail === true
                                                const rightPhotos: any[] = Array.isArray(test.rightPhotos) ? test.rightPhotos : []
                                                const wrongPhotos: any[] = Array.isArray(test.wrongPhotos) ? test.wrongPhotos : []
                                                return (
                                                    <div key={test.id || i} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div>
                                                                <p className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                                                    {test.label || (test.isOther ? test.subject : "") || `Test ${i + 1}`}
                                                                    {test.isOther && <span className="text-[10px] font-bold uppercase tracking-wide text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">Custom</span>}
                                                                </p>
                                                                {test.isOther && test.subject && <p className="text-xs text-slate-500 mt-0.5">Subject: {test.subject}</p>}
                                                                {test.remarks && <p className="text-xs text-slate-500 mt-0.5">{test.remarks}</p>}
                                                            </div>
                                                            {passed && (
                                                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> PASS
                                                                </span>
                                                            )}
                                                            {failed && (
                                                                <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">
                                                                    <XCircle className="w-3.5 h-3.5" /> FAIL
                                                                </span>
                                                            )}
                                                            {!passed && !failed && (
                                                                <span className="text-xs text-slate-400">No decision</span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {rightPhotos.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-medium text-emerald-600 mb-2">Right/Correct Photos ({rightPhotos.length})</p>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {rightPhotos.map((p: any, j: number) => {
                                                                            const src = typeof p === 'string' ? p : p?.data || p?.url
                                                                            return src ? (
                                                                                <img
                                                                                    key={j}
                                                                                    src={src}
                                                                                    alt={`Right ${j + 1}`}
                                                                                    onClick={() => setSelectedImage({ src, alt: `Right ${j + 1}` })}
                                                                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                                                    className="w-full h-24 object-cover rounded-lg border border-emerald-200 cursor-pointer transition-transform hover:scale-[1.02]"
                                                                                />
                                                                            ) : null
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {wrongPhotos.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-medium text-red-600 mb-2">Wrong/Incorrect Photos ({wrongPhotos.length})</p>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {wrongPhotos.map((p: any, j: number) => {
                                                                            const src = typeof p === 'string' ? p : p?.data || p?.url
                                                                            return src ? (
                                                                                <img
                                                                                    key={j}
                                                                                    src={src}
                                                                                    alt={`Wrong ${j + 1}`}
                                                                                    onClick={() => setSelectedImage({ src, alt: `Wrong ${j + 1}` })}
                                                                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                                                    className="w-full h-24 object-cover rounded-lg border border-red-200 cursor-pointer transition-transform hover:scale-[1.02]"
                                                                                />
                                                                            ) : null
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                            {Object.entries(additionalEvidence).some(([, ph]) => Array.isArray(ph) && ph.length > 0) && (
                                <div className="pt-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Additional Evidence</p>
                                    {Object.entries(additionalEvidence)
                                        .filter(([, ph]) => Array.isArray(ph) && ph.length > 0)
                                        .map(([key, ph]) => (
                                            <PhotoGallery
                                                key={key}
                                                photos={ph}
                                                title={humanizeEvidenceKey(key)}
                                                onImageClick={(src, alt) => setSelectedImage({ src, alt })}
                                            />
                                        ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">No tests recorded.</p>
                    )}
                </Section>

                {/* Documentation — mirrors Checker portal */}
                <Section title="Documentation" icon={Camera} accent="bg-slate-50 text-slate-700">
                    <div className="mb-4">
                        <InfoCard label="Inspector Signature" value={formData.inspectorSignature} />
                    </div>
                    <PhotoGallery photos={formData.documentationPhotos} title="General Documentation Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                    <PhotoGallery photos={formData.photocopyDocuments} title="Photocopy Documents" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                    <PhotoGallery photos={formData.companyIdCards} title="Company ID Cards" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                </Section>

                {/* Who made the item — shown when the vendor supplied it. */}
                {hasManufacturerInfo((product as any).manufacturerInfo) && (
                    <Section title="Manufacturer Information" icon={Factory} accent="bg-slate-50 text-slate-700">
                        <ManufacturerInfoCard info={(product as any).manufacturerInfo} variant="plain" />
                    </Section>
                )}

                {/* Inspection type + where the checker was when they submitted. Product
                    QC has no lat/lng columns, so this rides inside qcInspectionData —
                    see backend/utils/locationUtils.buildLocationSnapshot. */}
                {(checkerLocation || inspectionType) && (
                    <Section title="Inspection Type & Location" icon={MapPin}
                        accent={
                            locationVerification.state === 'verified' ? 'bg-emerald-50 text-emerald-800'
                                : locationVerification.state === 'mismatch' ? 'bg-red-50 text-red-800'
                                    : locationVerification.state === 'virtual' ? 'bg-sky-50 text-sky-800'
                                        : 'bg-amber-50 text-amber-800'
                        }>
                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-200">
                                {inspectionTypeLabel(inspectionType)}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                                locationVerification.state === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : locationVerification.state === 'mismatch' ? 'bg-red-50 text-red-700 border-red-200'
                                        : locationVerification.state === 'virtual' ? 'bg-sky-50 text-sky-700 border-sky-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                                {locationVerification.state === 'verified'
                                    ? <CheckCircle className="w-3.5 h-3.5" />
                                    : locationVerification.state === 'virtual'
                                        ? <Video className="w-3.5 h-3.5" />
                                        : <XCircle className="w-3.5 h-3.5" />}
                                {locationVerification.label}
                            </span>
                            {locationVerification.detail && (
                                <span className="text-xs text-slate-500">{locationVerification.detail}</span>
                            )}
                        </div>
                        {locationVerification.showCoords && checkerLocation && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <InfoCard label="Checker Latitude" value={checkerLocation.checkerLatitude?.toFixed(6)} />
                                <InfoCard label="Checker Longitude" value={checkerLocation.checkerLongitude?.toFixed(6)} />
                                <InfoCard label="Vendor Latitude" value={checkerLocation.vendorLatitude?.toFixed(6)} />
                                <InfoCard label="Vendor Longitude" value={checkerLocation.vendorLongitude?.toFixed(6)} />
                            </div>
                        )}
                    </Section>
                )}

                <Section title="Review & Final Decision" icon={Star} accent="bg-slate-50 text-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="rounded-xl border border-slate-200 p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Inspector&apos;s Decision</p>
                            {inspectionStatus === 'Approved' ? (
                                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-100 px-4 py-1.5 rounded-full"><CheckCircle className="w-4 h-4" /> Approved</span>
                            ) : inspectionStatus === 'Rejected' ? (
                                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-700 bg-red-100 px-4 py-1.5 rounded-full"><XCircle className="w-4 h-4" /> Rejected</span>
                            ) : inspectionStatus ? (
                                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 bg-amber-100 px-4 py-1.5 rounded-full"><AlertTriangle className="w-4 h-4" /> {inspectionStatus}</span>
                            ) : (
                                <span className="text-sm text-slate-400">—</span>
                            )}
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Final Status</p>
                            <Badge className={statusColors[approvalStatus] || 'bg-slate-100 text-slate-700'}>
                                {statusLabels[approvalStatus] || approvalStatus}
                            </Badge>
                        </div>
                    </div>

                    {formData.reviewerRemarks && (
                        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-4">
                            <p className="text-xs font-semibold text-neutral-700 uppercase mb-1">Reviewer Remarks</p>
                            <p className="text-sm text-neutral-900">{formData.reviewerRemarks}</p>
                        </div>
                    )}

                    {product.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-red-700 uppercase mb-1">Official Rejection Reason</p>
                            <p className="text-sm text-red-900">{product.rejectionReason}</p>
                        </div>
                    )}
                </Section>

            </div>

            </div>{/* end PDF capture area */}

            <div className="text-center py-6">
                <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="px-6 py-2.5 bg-brand-500 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-600 transition-all flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4" />
                    {downloading ? 'Generating...' : 'Download PDF'}
                </button>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">Confidential Inspection Report &copy; {new Date().getFullYear()} M2C</p>
            </div>

            {/* Fullscreen Image Modal */}
            {/* Audit Trail */}
            {auditLogs.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50 text-slate-700">
                        <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                        <h3 className="font-bold text-sm tracking-wide">Inspection Audit Trail</h3>
                    </div>
                    <div className="p-6">
                        <InspectionAuditTimeline logs={auditLogs} />
                    </div>
                </div>
            )}

            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-5xl max-h-screen">
                        <button
                            onClick={(e) => {e.stopPropagation(); setSelectedImage(null)}}
                            className="absolute -top-10 -right-4 p-2 text-white hover:text-slate-300"
                        >
                            <XCircle className="w-8 h-8" />
                        </button>
                        <img
                            src={selectedImage.src}
                            alt={selectedImage.alt}
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <p className="text-center text-white mt-4 text-sm font-medium">{selectedImage.alt}</p>
                    </div>
                </div>
            )}

            {/* Admin decision modals — Approve (with pricing) reuses the shared
                modal used by the product tables; Reject captures a reason. */}
            {canDecide && (
                <ApproveProductModal
                    product={showApproveModal ? approvableProduct : null}
                    open={showApproveModal}
                    onClose={() => setShowApproveModal(false)}
                    onApproved={() => { setShowApproveModal(false); loadProduct({ silent: true }) }}
                />
            )}

            {canDecide && (
                <ProductRejectionModal
                    isOpen={showRejectModal}
                    onClose={() => setShowRejectModal(false)}
                    onConfirm={handleReject}
                    isLoading={actionLoading}
                    product={{
                        id: (product as any).id,
                        name: (product as any).name,
                        sku: (product as any).baseSku,
                        vendorName: (product as any).vendor?.companyName,
                    }}
                />
            )}
        </div>
    )
}