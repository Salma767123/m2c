'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    ArrowLeft, Package, ShieldCheck,
    CheckCircle, XCircle, AlertTriangle,
    Layers, Ruler, Truck, Camera, Download, FlaskConical, Star
} from 'lucide-react'
import { Badge } from '@/components/UI/Badge'
import productService from '@/services/productService'
import { downloadReportPdf } from '@/lib/reportPdfDownload'
import { getStoredAuth } from '@/lib/auth'

interface Props {
    productId: string
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
                            <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-2 py-1 rounded-b-xl truncate opacity-0 group-hover:opacity-100 transition-opacity">
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

const REMARK_LABELS: Record<string, string> = {
    shipperCartonRemark: "Shipper Carton Packaging",
    innerCartonRemark: "Inner Carton Packaging",
    retailPackagingRemark: "Retail Packaging",
    productTypeRemark: "Product Type (style, size, color, material, labeling)",
    aqlWorkmanshipRemark: "AQL (Workmanship / Appearance / Function)",
    onSiteTestsRemark: "On-site Tests"
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProductInspectionDetail({ productId }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const autoDownload = searchParams.get('download') === 'true'
    const [product, setProduct] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)
    const [selectedImage, setSelectedImage] = useState<{src: string, alt: string} | null>(null)
    const reportRef = useRef<HTMLDivElement>(null)
    const autoDownloadTriggered = useRef(false)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await productService.getProduct(productId)
                if (res.success && res.data) {
                    setProduct(res.data)
                } else {
                    setError('Product report not found')
                }
            } catch (e: any) {
                setError(e.message || 'Failed to load product report')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [productId])

    const handleDownloadPdf = async () => {
        if (!reportRef.current) return
        setDownloading(true)
        try {
            const productName = (product as any)?.name || 'Report'
            const adminUser = getStoredAuth()?.user
            const downloadedBy = adminUser ? `${adminUser.name || 'Admin'} <${adminUser.email}>` : undefined
            await downloadReportPdf({
                element: reportRef.current,
                title: 'Product Quality Report',
                submittedDate: (product as any)?.updatedAt
                    ? new Date((product as any).updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                    : '—',
                filename: `Product_Report_${String(productName).replace(/\s+/g, '_')}_${productId.slice(-8).toUpperCase()}_Internal.pdf`,
                variant: 'internal',
                downloadedBy,
            })
        } catch {
            alert('Failed to generate PDF. Please try again.')
        } finally {
            setDownloading(false)
        }
    }

    useEffect(() => {
        if (!autoDownload || autoDownloadTriggered.current || loading || !product || downloading) return
        let cancelled = false
        const tryDownload = () => {
            if (cancelled) return
            if (!reportRef.current) {
                setTimeout(tryDownload, 300)
                return
            }
            autoDownloadTriggered.current = true
            const productName = (product as any)?.name || 'Report'
            const adminUser = getStoredAuth()?.user
            const downloadedBy = adminUser ? `${adminUser.name || 'Admin'} <${adminUser.email}>` : undefined
            downloadReportPdf({
                element: reportRef.current,
                title: 'Product Quality Report',
                submittedDate: (product as any)?.updatedAt
                    ? new Date((product as any).updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                    : '—',
                filename: `Product_Report_${String(productName).replace(/\s+/g, '_')}_${productId.slice(-8).toUpperCase()}_Internal.pdf`,
                variant: 'internal',
                downloadedBy,
            }).catch(() => { /* silent */ })
        }
        const timer = setTimeout(tryDownload, 500)
        return () => { cancelled = true; clearTimeout(timer) }
    }, [autoDownload, loading, product, downloading, productId])

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
    )

    if (error || !product || !(product as any).qcInspectionData) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
            <p className="text-slate-600 text-lg">{error || 'QC Report data missing'}</p>
            <button onClick={() => router.back()} className="text-blue-600 underline text-sm">Go back</button>
        </div>
    )

    const formData = (product as any).qcInspectionData
    const approvalStatus = (product as any).approvalStatus

    const statusColors: Record<string, string> = {
        APPROVED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-red-100 text-red-800',
        PENDING: 'bg-amber-100 text-amber-800',
    }

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
                <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#222222] rounded-lg hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
                >
                    <Download className="w-4 h-4" />
                    {downloading ? 'Generating...' : 'Download PDF'}
                </button>
                <div className="flex gap-2 flex-shrink-0">
                    <Badge className={statusColors[approvalStatus] || 'bg-gray-100 text-gray-700'}>
                        {approvalStatus}
                    </Badge>
                </div>
            </div>

            {/* PDF capture area */}
            <div ref={reportRef} className="space-y-6">

            {/* General Info Banner */}
            <div className="bg-gradient-to-r from-[#222222] to-[#333333] rounded-2xl p-6 text-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div>
                        <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Vendor</p>
                        <p className="font-semibold text-sm">{formData.vendor || product.vendor?.companyName || '—'}</p>
                    </div>
                    <div>
                        <p className="text-neutral-400 text-xs font-medium uppercase mb-1">Client</p>
                        <p className="font-semibold text-sm">{formData.client || '—'}</p>
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
                {/* Section 1: Preparation */}
                <Section title="Preparation & Quantitative Data" icon={Layers} accent="bg-blue-50 text-blue-800">
                    <div className="mb-6 overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-600 font-semibold">
                                <tr>
                                    <th className="p-3 border-b text-xs uppercase tracking-wider">Item Name</th>
                                    <th className="p-3 border-b text-xs uppercase tracking-wider">Description</th>
                                    <th className="p-3 border-b text-xs uppercase tracking-wider text-center">Total Qty</th>
                                    <th className="p-3 border-b text-xs uppercase tracking-wider text-center">Insp. Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(formData.items || []).map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="p-3 font-medium text-slate-900">{item.itemName}</td>
                                        <td className="p-3 text-slate-500">{item.itemDescription}</td>
                                        <td className="p-3 font-bold text-center">{item.totalQuantity}</td>
                                        <td className="p-3 font-bold text-blue-600 text-center">{item.inspectionQuantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <PhotoGallery photos={formData.warehousePhotoEvidences} title="Warehouse Photo Evidence" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                </Section>

                {/* Section 2: Measurements */}
                <Section title="Measurements & Dimensions" icon={Ruler} accent="bg-indigo-50 text-indigo-800">
                    <div className="mb-6 overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-indigo-50/50 text-indigo-800 font-semibold">
                                <tr>
                                    <th className="p-3 border-b text-xs uppercase tracking-wider">Sample Name</th>
                                    <th className="p-3 border-b text-xs uppercase tracking-wider text-center">Carton (L×W×H) cm</th>
                                    <th className="p-3 border-b text-xs uppercase tracking-wider text-center">Product (L×W) cm</th>
                                    <th className="p-3 border-b text-xs uppercase tracking-wider text-center">Retail Wt (kg)</th>
                                    <th className="p-3 border-b text-xs uppercase tracking-wider text-center">Gross Wt (kg)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(formData.measurements || []).map((m: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="p-3 font-medium text-slate-900">{m.sampleName}</td>
                                        <td className="p-3 text-center text-slate-600">
                                            {m.cartonLength || 0} × {m.cartonWidth || 0} × {m.cartonHeight || 0}
                                        </td>
                                        <td className="p-3 text-center text-slate-600">
                                            {m.productLength || 0} × {m.productWidth || 0}
                                        </td>
                                        <td className="p-3 font-bold text-center text-indigo-600">{m.retailWeight || 0}</td>
                                        <td className="p-3 font-bold text-center text-indigo-600">{m.cartonGrossWeight || 0}</td>
                                    </tr>
                                ))}
                                {(!formData.measurements || formData.measurements.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400 italic bg-slate-50/50">
                                            No measurement samples were recorded for this inspection.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PhotoGallery photos={formData.measurementPhotos} title="Measurement Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                </Section>

                {/* Section 3: Packaging & Workmanship */}
                <Section title="Packaging & Product Integrity" icon={Truck} accent="bg-teal-50 text-teal-800">
                    <div className="space-y-3 mb-6">
                        {Object.entries(REMARK_LABELS).map(([key, label]) => {
                            const val = formData[key]
                            return (
                                <div key={key} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                                    <span className="text-sm text-slate-700">{label}</span>
                                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                                        val && Number(val) >= 8 ? "bg-emerald-50 text-emerald-700" :
                                        val && Number(val) >= 6 ? "bg-amber-50 text-amber-700" :
                                        val ? "bg-red-50 text-red-700" : "text-slate-400"
                                    }`}>
                                        {val ? `${val}/10` : "—"}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                    <PhotoGallery photos={formData.packagingPhotos} title="Packaging Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                </Section>

                {/* Section 5: Defects & AQL — compact AQL table + defect-detail cards (mirrors Checker portal) */}
                <Section title="Defects & AQL" icon={XCircle} accent="bg-orange-50 text-orange-800">
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

                {/* Section 6: On-site Testing — mirrors Checker portal */}
                <Section title="On-site Testing" icon={FlaskConical} accent="bg-rose-50 text-rose-800">
                    {(formData.tests && formData.tests.length > 0) ? (
                        <div className="space-y-4">
                            {formData.tests.map((test: any, i: number) => {
                                const passed = test.pass === true
                                const failed = test.fail === true
                                return (
                                    <div key={test.id || i} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="font-semibold text-slate-900 text-sm">{test.label || `Test ${i + 1}`}</p>
                                                {test.detail && <p className="text-xs text-slate-500 mt-0.5">{test.detail}</p>}
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
                                            {(test.rightPhotos?.length ?? 0) > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-emerald-600 mb-2">Right/Correct Photos ({test.rightPhotos.length})</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {test.rightPhotos.map((p: any, j: number) => {
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
                                            {(test.wrongPhotos?.length ?? 0) > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-red-600 mb-2">Wrong/Incorrect Photos ({test.wrongPhotos.length})</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {test.wrongPhotos.map((p: any, j: number) => {
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
                    ) : (
                        <p className="text-slate-400 text-sm">No tests recorded.</p>
                    )}
                    <div className="mt-4">
                        <PhotoGallery photos={formData.testingPhotos} title="Testing Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                    </div>
                </Section>

                {/* Documentation — mirrors Checker portal */}
                <Section title="Documentation" icon={Camera} accent="bg-sky-50 text-sky-800">
                    <div className="mb-4">
                        <InfoCard label="Inspector Signature" value={formData.inspectorSignature} />
                    </div>
                    <PhotoGallery photos={formData.documentationPhotos} title="General Documentation Photos" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                    <PhotoGallery photos={formData.photocopyDocuments} title="Photocopy Documents" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                    <PhotoGallery photos={formData.companyIdCards} title="Company ID Cards" onImageClick={(src, alt) => setSelectedImage({src, alt})} />
                </Section>

                {/* Review & Final Decision — mirrors Checker portal */}
                <Section title="Review & Final Decision" icon={Star} accent="bg-amber-50 text-amber-800">
                    <div className="flex items-center gap-4 mb-4 flex-wrap">
                        <span className="text-sm font-medium text-slate-700">Final Decision:</span>
                        {formData.finalDecision === 'Approved' ? (
                            <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-100 px-4 py-1.5 rounded-full">
                                <CheckCircle className="w-4 h-4" /> Approved
                            </span>
                        ) : formData.finalDecision === 'Rejected' ? (
                            <span className="flex items-center gap-1.5 text-sm font-bold text-red-700 bg-red-100 px-4 py-1.5 rounded-full">
                                <XCircle className="w-4 h-4" /> Rejected
                            </span>
                        ) : (
                            <span className="text-sm text-slate-400">{formData.finalDecision || '—'}</span>
                        )}
                        <span className="ml-auto text-xs text-slate-500">
                            Report Date: <span className="font-semibold text-slate-700">{product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('en-IN') : '—'}</span>
                        </span>
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
                    className="px-6 py-2.5 bg-[#222222] text-white rounded-xl font-semibold shadow-lg hover:bg-[#333333] transition-all flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4" />
                    {downloading ? 'Generating...' : 'Download PDF'}
                </button>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">Confidential Inspection Report &copy; {new Date().getFullYear()} M2C</p>
            </div>

            {/* Fullscreen Image Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-5xl max-h-screen">
                        <button 
                            onClick={(e) => {e.stopPropagation(); setSelectedImage(null)}}
                            className="absolute -top-10 -right-4 p-2 text-white hover:text-gray-300"
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
        </div>
    )
}
