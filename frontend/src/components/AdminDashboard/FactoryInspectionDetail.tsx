'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Building2, ShieldCheck, Factory,
    CheckCircle, XCircle, AlertTriangle, Clock,
    FileText, ClipboardList, Package, Settings
} from 'lucide-react'
import { Badge } from '@/components/UI/Badge'
import vendorService from '@/services/vendorService'

interface Props {
    inspectionId: string
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

function InfoCard({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex flex-col gap-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-semibold text-slate-900 break-words">{value || '—'}</span>
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
    const [inspection, setInspection] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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

    // itemsToInspect is the ORIGINAL ARRAY when assigned (admin side)
    // After checker completes, it becomes the FORM DATA OBJECT
    const rawItems = inspection.itemsToInspect
    const isFormData = rawItems && !Array.isArray(rawItems) && typeof rawItems === 'object'
    const formData = isFormData ? rawItems : {} // QC's filled-in form
    const assignedItems = Array.isArray(rawItems) ? rawItems : [] // original assigned items

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
            {/* Back + Title */}
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
                <div className="flex gap-2 flex-shrink-0">
                    <Badge className={statusColors[status] || 'bg-gray-100 text-gray-700'}>
                        {status}
                    </Badge>
                    {inspection.result && (
                        <Badge className={resultColors[inspection.result] || 'bg-gray-100 text-gray-700'}>
                            {inspection.result}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Assignment Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div>
                        <p className="text-blue-200 text-xs font-medium uppercase mb-1">Vendor</p>
                        <p className="font-semibold text-sm">{inspection.vendor?.companyName || '—'}</p>
                        <p className="text-blue-200 text-xs mt-0.5">{inspection.vendor?.email}</p>
                    </div>
                    <div>
                        <p className="text-blue-200 text-xs font-medium uppercase mb-1">QC Checker</p>
                        <p className="font-semibold text-sm">{inspection.checker?.name || '—'}</p>
                        <p className="text-blue-200 text-xs mt-0.5">{inspection.checker?.email}</p>
                    </div>
                    <div>
                        <p className="text-blue-200 text-xs font-medium uppercase mb-1">Scheduled</p>
                        <p className="font-semibold text-sm">{inspection.scheduledDate || '—'}</p>
                        <p className="text-blue-200 text-xs mt-0.5">{inspection.scheduledTime}</p>
                    </div>
                    <div>
                        <p className="text-blue-200 text-xs font-medium uppercase mb-1">Client / Priority</p>
                        <p className="font-semibold text-sm">{inspection.clientName || '—'}</p>
                        <p className="text-blue-200 text-xs mt-0.5">Priority: {inspection.priority}</p>
                    </div>
                </div>
            </div>

            {/* ── NOT YET STARTED ── */}
            {status === 'SCHEDULED' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                    <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-amber-900 mb-1">Inspection Scheduled</h3>
                    <p className="text-amber-700 text-sm">
                        The QC checker has not started the inspection yet.
                    </p>
                </div>
            )}

            {/* ── IN PROGRESS ── */}
            {status === 'IN_PROGRESS' && !isFormData && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                    <Clock className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-blue-900 mb-1">Inspection In Progress</h3>
                    <p className="text-blue-700 text-sm">
                        The QC checker has started the inspection but has not submitted the report yet.
                    </p>
                </div>
            )}

            {/* ── COMPLETED / HAS FORM DATA ── Show all 7 sections ── */}
            {(isCompleted || isFormData) && (
                <div className="space-y-5">
                    {/* Section 1: Factory Details */}
                    <Section title="Section 1 — Factory Details" icon={Factory} accent="bg-blue-50 text-blue-800">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <InfoCard label="Vendor Name" value={formData.vendorName} />
                            <InfoCard label="Factory Name" value={formData.factoryName} />
                            <InfoCard label="Factory Address" value={formData.factoryAddress} />
                            <InfoCard label="Contact Person" value={formData.contactPersonName} />
                            <InfoCard label="Contact Phone" value={formData.contactPhoneNumber} />
                        </div>
                    </Section>

                    {/* Section 2: Legal & Registration */}
                    <Section title="Section 2 — Legal & Registration" icon={ShieldCheck} accent="bg-indigo-50 text-indigo-800">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <InfoCard label="Business Reg. No." value={formData.businessRegistrationNumber} />
                            <InfoCard label="GST / Tax ID" value={formData.gstTaxId} />
                            <InfoCard label="Factory License No." value={formData.factoryLicenseNumber} />
                        </div>
                    </Section>

                    {/* Section 3: Production Info */}
                    <Section title="Section 3 — Production Info" icon={Settings} accent="bg-purple-50 text-purple-800">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <InfoCard label="Products Manufactured" value={formData.productsManufactured} />
                            <InfoCard label="Monthly Production Capacity" value={formData.monthlyProductionCapacity} />
                            <InfoCard label="Production Workers" value={formData.numberOfProductionWorkers} />
                            <InfoCard label="Category to Inspect" value={formData.categoryToInspect} />
                        </div>
                    </Section>

                    {/* Section 4: Basic Infrastructure */}
                    <Section title="Section 4 — Basic Infrastructure Check" icon={Building2} accent="bg-teal-50 text-teal-800">
                        <YesNoRow label="Machinery Available" value={formData.machineryAvailable} />
                        <YesNoRow label="Electricity Available" value={formData.electricityAvailable} />
                        <YesNoRow label="Water Available" value={formData.waterAvailable} />
                        <YesNoRow label="Storage Area Available" value={formData.storageAreaAvailable} />
                    </Section>

                    {/* Section 5: Quality & Safety */}
                    <Section title="Section 5 — Quality & Safety" icon={ShieldCheck} accent="bg-emerald-50 text-emerald-800">
                        <YesNoRow label="Quality Check Process in Place" value={formData.qualityCheckProcess} />
                        <YesNoRow label="Safety Equipment Available" value={formData.safetyEquipment} />
                        <YesNoRow label="Clean Working Environment" value={formData.cleanWorkingEnvironment} />
                    </Section>

                    {/* Section 6: Inspection Info */}
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

                    {/* Section 7: Evidence */}
                    {((formData.factoryPhotos?.length > 0) || (formData.documentsUpload?.length > 0)) && (
                        <Section title="Section 7 — Evidence" icon={FileText} accent="bg-rose-50 text-rose-800">
                            {formData.factoryPhotos?.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
                                        Factory Photos ({formData.factoryPhotos.length})
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {formData.factoryPhotos.map((p: any, i: number) => {
                                            const src = p?.data || p?.url || null
                                            return src && typeof src === 'string' && src.startsWith('data:image') ? (
                                                <div key={i} className="relative group">
                                                    <img
                                                        src={src}
                                                        alt={p.name || `Photo ${i + 1}`}
                                                        className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-sm"
                                                    />
                                                    <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-2 py-1 rounded-b-xl truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {p.name}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div key={i} className="flex items-center justify-center h-32 bg-slate-100 rounded-xl border border-dashed border-slate-300">
                                                    <span className="text-xs text-slate-500 text-center px-2">{p?.name || `Photo ${i + 1}`}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                            {formData.documentsUpload?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
                                        Documents ({formData.documentsUpload.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.documentsUpload.map((doc: any, i: number) =>
                                            doc?.data ? (
                                                <a
                                                    key={i}
                                                    href={doc.data}
                                                    download={doc.name || `Document_${i + 1}`}
                                                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                                                >
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

            {/* ── Assigned Items (original admin assignment) ── */}
            {assignedItems.length > 0 && (
                <Section title="Items Assigned for Inspection" icon={Package} accent="bg-slate-50 text-slate-700">
                    <div className="space-y-3">
                        {assignedItems.map((item: any, i: number) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-900 text-sm">{item.itemName}</p>
                                    {item.description && (
                                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                                    )}
                                    {item.specifications && (
                                        <p className="text-xs text-slate-600 mt-1 italic">{item.specifications}</p>
                                    )}
                                </div>
                                <div className="flex gap-3 text-xs text-center flex-shrink-0">
                                    {item.aqlLevel && (
                                        <div>
                                            <p className="font-bold text-blue-600">{item.aqlLevel}</p>
                                            <p className="text-slate-500">AQL</p>
                                        </div>
                                    )}
                                    {item.quantity && (
                                        <div>
                                            <p className="font-bold text-slate-800">{item.quantity}</p>
                                            <p className="text-slate-500">Qty</p>
                                        </div>
                                    )}
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
        </div>
    )
}
