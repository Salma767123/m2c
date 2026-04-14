'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Package, ShieldCheck, ClipboardList,
    CheckCircle, XCircle, AlertTriangle, FileText,
    Layers, Ruler, Truck, Zap, Camera, User
} from 'lucide-react'
import { Badge } from '@/components/UI/Badge'
import productService from '@/services/productService'

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

function PhotoGallery({ photos, title }: { photos?: any[]; title: string }) {
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
                        <div key={i} className="relative group aspect-square">
                            <img
                                src={src}
                                alt={p.name || `Photo ${i + 1}`}
                                className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-sm"
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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProductInspectionDetail({ productId }: Props) {
    const router = useRouter()
    const [product, setProduct] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
                <div className="flex gap-2 flex-shrink-0">
                    <Badge className={statusColors[approvalStatus] || 'bg-gray-100 text-gray-700'}>
                        {approvalStatus}
                    </Badge>
                </div>
            </div>

            {/* General Info Banner */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase mb-1">Vendor</p>
                        <p className="font-semibold text-sm">{formData.vendor || product.vendor?.companyName || '—'}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase mb-1">Client</p>
                        <p className="font-semibold text-sm">{formData.client || '—'}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase mb-1">Service Type</p>
                        <p className="font-semibold text-sm">{formData.serviceType || '—'}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase mb-1">Location / Date</p>
                        <p className="font-semibold text-sm">{formData.serviceLocation || '—'}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{formData.serviceStartDate}</p>
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
                                    <th className="p-3 border-b text-xs uppercase tracking-wider text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(formData.items || []).map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="p-3 font-medium text-slate-900">{item.itemName}</td>
                                        <td className="p-3 text-slate-500">{item.itemDescription}</td>
                                        <td className="p-3 font-bold text-center">{item.totalQuantity}</td>
                                        <td className="p-3 font-bold text-blue-600 text-center">{item.inspectionQuantity}</td>
                                        <td className="p-3 text-center">
                                            <StatusChip value={item.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <PhotoGallery photos={formData.warehousePhotoEvidences} title="Warehouse Photo Evidence" />
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
                    <PhotoGallery photos={formData.measurementPhotos} title="Measurement Photos" />
                </Section>

                {/* Section 3: Packaging & Workmanship */}
                <Section title="Packaging & Product Integrity" icon={Truck} accent="bg-amber-50 text-amber-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="space-y-3">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Shipper Carton Remark</p>
                                <p className="text-sm text-slate-800">{formData.shipperCartonRemark || 'No remarks provided'}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Retail Packaging Remark</p>
                                <p className="text-sm text-slate-800">{formData.retailPackagingRemark || 'No remarks provided'}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Product Type/Finish Remark</p>
                                <p className="text-sm text-slate-800">{formData.productTypeRemark || 'No remarks provided'}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Inner Carton Remark</p>
                                <p className="text-sm text-slate-800">{formData.innerCartonRemark || 'No remarks provided'}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Workmanship Remark</p>
                                <p className="text-sm text-slate-800">{formData.aqlWorkmanshipRemark || 'No remarks provided'}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">On-site Test Remark</p>
                                <p className="text-sm text-slate-800">{formData.onSiteTestsRemark || 'No remarks provided'}</p>
                            </div>
                        </div>
                    </div>
                    <PhotoGallery photos={formData.packagingPhotos} title="Packaging Photos" />
                </Section>

                {/* Section 4: Defects & AQL */}
                <Section title="Defects Analysis (AQL)" icon={XCircle} accent="bg-red-50 text-red-800">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        <InfoCard label="Insp. Level" value={formData.inspectionLevel} />
                        <InfoCard label="Sample Size" value={formData.sampleSize} />
                        <InfoCard label="AQL Crit" value={formData.aqlCritical} />
                        <InfoCard label="AQL Maj" value={formData.aqlMajor} />
                        <InfoCard label="AQL Min" value={formData.aqlMinor} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-red-700 text-sm">Critical Defects</h4>
                                <span className="text-xl font-black text-red-800">{formData.criticalDefects} / {formData.maxAllowedCritical}</span>
                            </div>
                            <p className="text-xs text-red-600 italic">{formData.criticalDefectDetails || 'No critical defects found'}</p>
                        </div>
                        <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-orange-700 text-sm">Major Defects</h4>
                                <span className="text-xl font-black text-orange-800">{formData.majorDefects} / {formData.maxAllowedMajor}</span>
                            </div>
                            <p className="text-xs text-orange-600 italic">{formData.majorDefectDetails || 'No major defects recorded'}</p>
                        </div>
                        <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-amber-700 text-sm">Minor Defects</h4>
                                <span className="text-xl font-black text-amber-800">{formData.minorDefects} / {formData.maxAllowedMinor}</span>
                            </div>
                            <p className="text-xs text-amber-600 italic">{formData.minorDefectDetails || 'No minor defects recorded'}</p>
                        </div>
                    </div>
                    <PhotoGallery photos={formData.defectPhotos} title="Defect Photos" />
                </Section>

                {/* Section 5: On-site Functional Tests */}
                <Section title="On-site Functional Tests" icon={Zap} accent="bg-purple-50 text-purple-800">
                    <div className="space-y-4 mb-6">
                        {(formData.tests || []).map((test: any, i: number) => (
                            <div key={i} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-slate-900">{test.label}</p>
                                        <p className="text-xs text-slate-500">{test.detail}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {test.pass && <StatusChip value="PASS" />}
                                        {test.fail && <StatusChip value="FAIL" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {(test.rightPhotos || []).map((p: any, j: number) => (
                                        <div key={`r-${j}`} className="aspect-square relative group">
                                            <img src={p.url || p.data} alt="Right" className="w-full h-full object-cover rounded-lg border border-green-200" />
                                            <div className="absolute top-1 left-1 bg-green-500/80 text-white text-[8px] px-1 rounded">RIGHT</div>
                                        </div>
                                    ))}
                                    {(test.wrongPhotos || []).map((p: any, j: number) => (
                                        <div key={`w-${j}`} className="aspect-square relative group">
                                            <img src={p.url || p.data} alt="Wrong" className="w-full h-full object-cover rounded-lg border border-red-200" />
                                            <div className="absolute top-1 left-1 bg-red-500/80 text-white text-[8px] px-1 rounded">WRONG</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {(!formData.tests || formData.tests.length === 0) && (
                            <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No specific on-site tests recorded.</p>
                        )}
                    </div>
                    <PhotoGallery photos={formData.testingPhotos} title="General Testing Photos" />
                </Section>

                {/* Section 6: Documentation & Identification */}
                <Section title="Final Documentation & Verification" icon={ClipboardList} accent="bg-emerald-50 text-emerald-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2 flex items-center gap-2">
                                    <User className="w-3 h-3" />
                                    Inspector Signature/Initials
                                </p>
                                <p className="text-lg font-display italic font-semibold text-slate-900">{formData.inspectorSignature || '—'}</p>
                            </div>
                            <PhotoGallery photos={formData.documentationPhotos} title="Documentation Photos" />
                        </div>
                        <div className="space-y-6">
                            <PhotoGallery photos={formData.photocopyDocuments} title="Photocopy Documents" />
                            <PhotoGallery photos={formData.companyIdCards} title="Company ID Cards" />
                        </div>
                    </div>
                </Section>

                {/* Section 7: Final Decision */}
                <div className={`rounded-2xl border-2 p-8 ${formData.finalDecision === 'Approved' ? 'bg-green-50 border-green-200' : formData.finalDecision === 'Rejected' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                        <div className={`p-4 rounded-full ${formData.finalDecision === 'Approved' ? 'bg-green-100' : formData.finalDecision === 'Rejected' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                            {formData.finalDecision === 'Approved' ? <CheckCircle className="w-12 h-12 text-green-600" /> : formData.finalDecision === 'Rejected' ? <XCircle className="w-12 h-12 text-red-600" /> : <AlertTriangle className="w-12 h-12 text-yellow-600" />}
                        </div>
                        <div className="flex-1">
                            <h2 className={`text-3xl font-black mb-2 ${formData.finalDecision === 'Approved' ? 'text-green-900' : formData.finalDecision === 'Rejected' ? 'text-red-900' : 'text-yellow-900'}`}>
                                Overall Decision: {formData.finalDecision?.toUpperCase() || 'UNKNOWN'}
                            </h2>
                            <p className="text-slate-700 font-medium mb-4">
                                Reviewer Remarks: {formData.reviewerRemarks || 'No final remarks provided by the inspector.'}
                            </p>
                            {product.rejectionReason && (
                                <div className="p-4 bg-white/50 rounded-xl border border-red-200 mt-4">
                                    <p className="text-xs font-bold text-red-600 uppercase mb-1">Official Rejection Reason</p>
                                    <p className="text-sm text-red-900">{product.rejectionReason}</p>
                                </div>
                            )}
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 text-center min-w-[120px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Report Date</p>
                            <p className="text-sm font-bold text-slate-900">{new Date(product.updatedAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                <div className="text-center py-6">
                    <button
                        onClick={() => window.print()}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 mx-auto"
                    >
                        <FileText className="w-4 h-4" />
                        Download / Print Report
                    </button>
                    <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">Confidential Inspection Report &copy; {new Date().getFullYear()} M2C</p>
                </div>
            </div>
        </div>
    )
}
