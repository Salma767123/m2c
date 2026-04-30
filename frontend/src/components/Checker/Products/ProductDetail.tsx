"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ProductDetailData, ProductImage, ProductVariant } from "@/types/inspection"
import {
    ArrowLeft,
    Package,
    Factory,
    Mail,
    Phone,
    MapPin,
    IndianRupee,
    Layers,
    FileText,
    RotateCw,
    CheckCircle,
    XCircle,
    Clock,
    UserCheck,
    X,
    ImageIcon,
} from "lucide-react"
import { qcCheckerService } from "@/services/qcCheckerService"

interface ProductDetailProps {
    productId: string
    onBack: () => void
    onStartInspection?: () => void
}

type Tab = "overview" | "images" | "activity"

const TAB_LABELS: Record<Tab, string> = {
    overview: "Overview",
    images: "Images & Variants",
    activity: "QC Activity",
}

// Mirrors the ProductApprovalStatus enum in backend/prisma/schema.prisma —
// products have no UNDER_REVIEW status (that is vendor-only).
const APPROVAL_COLOR: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    REINSPECTION: "bg-orange-100 text-orange-800 border-orange-200",
    QC_APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
}

const APPROVAL_LABELS: Record<string, string> = {
    PENDING: "Pending",
    REINSPECTION: "Reinspection",
    QC_APPROVED: "Approved by QC",
    APPROVED: "Approved by Admin",
    REJECTED: "Rejected",
}

const formatDate = (iso?: string | null) => {
    if (!iso) return "—"
    try {
        return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    } catch {
        return "—"
    }
}

const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return "—"
    return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ProductDetail({ productId, onBack, onStartInspection }: ProductDetailProps) {
    const [activeTab, setActiveTab] = useState<Tab>("overview")
    const [product, setProduct] = useState<ProductDetailData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lightbox, setLightbox] = useState<{ src: string; caption?: string } | null>(null)

    // Close lightbox on Escape + lock body scroll while it is open so the
    // background page can't move behind the overlay. Both are standard modal
    // a11y expectations and restore cleanly on close/unmount.
    useEffect(() => {
        if (!lightbox) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightbox(null)
        }
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        window.addEventListener("keydown", onKey)
        return () => {
            window.removeEventListener("keydown", onKey)
            document.body.style.overflow = previousOverflow
        }
    }, [lightbox])

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await qcCheckerService.getProductDetails(productId)
            if (res.success) {
                setProduct(res.data.product)
            } else {
                setError("Unable to load product details")
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load product details"
            setError(message)
        } finally {
            setLoading(false)
        }
    }, [productId])

    useEffect(() => {
        load()
    }, [load])

    if (loading) {
        return (
            <div className="p-8 max-w-6xl mx-auto font-sans animate-pulse">
                <div className="flex items-start justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                        <div className="space-y-2">
                            <div className="h-8 bg-slate-200 rounded w-56" />
                            <div className="flex items-center gap-3">
                                <div className="h-4 bg-slate-100 rounded w-24" />
                                <div className="h-6 bg-slate-200 rounded-full w-20" />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-10 bg-slate-200 rounded-lg w-24" />
                        <div className="h-10 bg-slate-200 rounded-lg w-36" />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                            <div className="h-48 bg-slate-200 rounded-xl" />
                            <div className="h-5 bg-slate-200 rounded w-40" />
                            <div className="h-4 bg-slate-100 rounded w-full" />
                            <div className="h-4 bg-slate-100 rounded w-3/4" />
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                            <div className="h-5 bg-slate-200 rounded w-32" />
                            <div className="grid grid-cols-2 gap-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="h-3 bg-slate-100 rounded w-20" />
                                        <div className="h-4 bg-slate-200 rounded w-28" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                            <div className="h-5 bg-slate-200 rounded w-28" />
                            <div className="h-4 bg-slate-100 rounded w-full" />
                            <div className="h-4 bg-slate-100 rounded w-2/3" />
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                            <div className="h-5 bg-slate-200 rounded w-24" />
                            <div className="h-4 bg-slate-100 rounded w-full" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !product) {
        return (
            <div className="p-8 max-w-3xl mx-auto">
                <button
                    onClick={onBack}
                    className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to products
                </button>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                    {error || "Product not found."}
                </div>
            </div>
        )
    }

    const canStartInspection = ["PENDING", "REINSPECTION"].includes(product.approvalStatus)
    const primaryImage =
        product.images?.find((i) => i.isPrimary)?.url ||
        product.images?.[0]?.url ||
        null

    return (
        <div className="min-h-screen font-sans bg-linear-to-br from-slate-50 to-blue-50/30">
            <div className="p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                            aria-label="Back to products list"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                                <span>SKU: <span className="font-mono">{product.baseSku}</span></span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${APPROVAL_COLOR[product.approvalStatus] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                                    {APPROVAL_LABELS[product.approvalStatus] || product.approvalStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={load}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                            aria-label="Refresh"
                        >
                            <RotateCw className="w-4 h-4" /> Refresh
                        </button>
                        {canStartInspection && onStartInspection && (
                            <button
                                onClick={onStartInspection}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                <FileText className="w-4 h-4" /> Start Inspection
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary Card */}
                <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white mb-6 shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryStat icon={<IndianRupee className="w-4 h-4" />} label="Base Price" value={formatCurrency(product.basePrice)} />
                        <SummaryStat icon={<Package className="w-4 h-4" />} label="Total Stock" value={String(product.totalStock ?? 0)} />
                        <SummaryStat icon={<Layers className="w-4 h-4" />} label="Variants" value={String(product.variants?.length ?? 0)} />
                        <SummaryStat icon={<Clock className="w-4 h-4" />} label="Listed" value={formatDate(product.createdAt)} />
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                    <div className="flex border-b border-slate-200 overflow-x-auto">
                        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                aria-current={activeTab === tab ? "page" : undefined}
                                className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab
                                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/40"
                                    : "text-slate-600 hover:text-slate-900"
                                    }`}
                            >
                                {TAB_LABELS[tab]}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {activeTab === "overview" && (
                            <OverviewTab product={product} primaryImage={primaryImage} />
                        )}
                        {activeTab === "images" && (
                            <ImagesTab product={product} onOpenLightbox={setLightbox} />
                        )}
                        {activeTab === "activity" && (
                            <QcActivityTab product={product} />
                        )}
                    </div>
                </div>
            </div>

            {lightbox && (
                <Lightbox
                    src={lightbox.src}
                    caption={lightbox.caption}
                    onClose={() => setLightbox(null)}
                />
            )}
        </div>
    )
}

function SummaryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div>
            <div className="flex items-center gap-1.5 text-xs text-white/80 mb-1">
                {icon}
                <span>{label}</span>
            </div>
            <p className="text-lg font-bold">{value}</p>
        </div>
    )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-2">
            <div className="mt-0.5 text-slate-400">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                <p className="text-sm text-slate-900 break-words">{value || "—"}</p>
            </div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">{title}</h3>
            {children}
        </div>
    )
}

function OverviewTab({ product, primaryImage }: { product: ProductDetailData; primaryImage: string | null }) {
    const v = product.vendor || {}
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                    {primaryImage ? (
                        <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <Package className="w-12 h-12 text-slate-300" />
                    )}
                </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Section title="Product">
                    <Row icon={<Package className="w-4 h-4" />} label="Category" value={product.category} />
                    <Row icon={<Layers className="w-4 h-4" />} label="Sub-category" value={product.subCategory} />
                    <Row icon={<IndianRupee className="w-4 h-4" />} label="Base Price" value={formatCurrency(product.basePrice)} />
                    <Row icon={<Package className="w-4 h-4" />} label="Total Stock" value={String(product.totalStock ?? 0)} />
                </Section>
                <Section title="Vendor">
                    <Row icon={<Factory className="w-4 h-4" />} label="Company" value={v.companyName} />
                    <Row icon={<Factory className="w-4 h-4" />} label="Owner" value={v.ownerName} />
                    <Row icon={<Mail className="w-4 h-4" />} label="Email" value={v.businessEmail || v.email} />
                    <Row icon={<Phone className="w-4 h-4" />} label="Phone" value={v.businessPhone} />
                    <Row
                        icon={<MapPin className="w-4 h-4" />}
                        label="Factory Location"
                        value={[v.factoryCity, v.factoryState].filter(Boolean).join(", ")}
                    />
                </Section>
                {product.description && (
                    <div className="sm:col-span-2">
                        <Section title="Description">
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{product.description}</p>
                        </Section>
                    </div>
                )}
                {product.rejectionReason && (
                    <div className="sm:col-span-2">
                        <Section title="Rejection Reason">
                            <p className="text-sm text-red-700 leading-relaxed bg-red-50 border border-red-200 rounded-lg p-3">
                                {product.rejectionReason}
                            </p>
                        </Section>
                    </div>
                )}
            </div>
        </div>
    )
}

type LightboxPayload = { src: string; caption?: string }
type OpenLightbox = (payload: LightboxPayload) => void

function ImagesTab({
    product,
    onOpenLightbox,
}: {
    product: ProductDetailData
    onOpenLightbox: OpenLightbox
}) {
    const images: ProductImage[] = product.images || []
    const variants: ProductVariant[] = product.variants || []
    const primaryProductImage = images.find((i) => i.isPrimary)?.url || images[0]?.url || null

    // Fallback cascade for the variant thumbnail: variant's own first image →
    // product primary → placeholder. Variants without dedicated images (e.g.,
    // size-only variants) still render with something useful.
    const variantThumb = (v: ProductVariant): string | null =>
        v.images?.[0] || primaryProductImage

    return (
        <div className="space-y-8">
            <Section title={`Images (${images.length})`}>
                {images.length === 0 ? (
                    <p className="text-sm text-slate-500">No images uploaded.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {images.map((img, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() =>
                                    onOpenLightbox({
                                        src: img.url,
                                        caption: img.alt || `${product.name} — image ${idx + 1}`,
                                    })
                                }
                                className="relative group text-left rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label={`View ${img.alt || `image ${idx + 1}`} in fullscreen`}
                            >
                                <img
                                    src={img.url}
                                    alt={img.alt || `${product.name} ${idx + 1}`}
                                    className="w-full h-32 object-cover border border-slate-200 group-hover:opacity-90 transition-opacity"
                                />
                                {img.isPrimary && (
                                    <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                        Primary
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </Section>

            <Section title={`Variants (${variants.length})`}>
                {variants.length === 0 ? (
                    <p className="text-sm text-slate-500">No variants defined.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left text-xs text-slate-600 uppercase tracking-wide">
                                    <th className="px-3 py-2 rounded-l-lg w-16">Image</th>
                                    <th className="px-3 py-2">SKU</th>
                                    <th className="px-3 py-2">Size</th>
                                    <th className="px-3 py-2">Color</th>
                                    <th className="px-3 py-2">Price</th>
                                    <th className="px-3 py-2 rounded-r-lg">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.map((v) => {
                                    const thumb = variantThumb(v)
                                    const caption = `${v.sku} — ${v.size} / ${v.color}`
                                    return (
                                        <tr key={v.id} className="border-b border-slate-100 last:border-0 align-middle">
                                            <td className="px-3 py-2">
                                                {thumb ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenLightbox({ src: thumb, caption })}
                                                        className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 block"
                                                        aria-label={`View image for ${caption}`}
                                                    >
                                                        <img
                                                            src={thumb}
                                                            alt={caption}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </button>
                                                ) : (
                                                    <div
                                                        className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center"
                                                        aria-label="No image"
                                                    >
                                                        <ImageIcon className="w-4 h-4 text-slate-300" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-xs">{v.sku}</td>
                                            <td className="px-3 py-2">{v.size}</td>
                                            <td className="px-3 py-2">
                                                <span className="inline-flex items-center gap-1.5">
                                                    {v.colorHex && (
                                                        <span
                                                            className="w-3 h-3 rounded-full border border-slate-200"
                                                            style={{ backgroundColor: v.colorHex }}
                                                        />
                                                    )}
                                                    {v.color}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">{formatCurrency(v.price)}</td>
                                            <td className="px-3 py-2">{v.stock}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>
        </div>
    )
}

function Lightbox({ src, caption, onClose }: { src: string; caption?: string; onClose: () => void }) {
    const closeButtonRef = useRef<HTMLButtonElement>(null)

    // Auto-focus the close button on open so keyboard users land on an
    // actionable control immediately, matching native dialog behaviour.
    useEffect(() => {
        closeButtonRef.current?.focus()
    }, [])

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={caption || "Image preview"}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Close image preview"
            >
                <X className="w-5 h-5" />
            </button>
            <div
                className="max-w-5xl max-h-[90vh] flex flex-col items-center gap-3"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt={caption || "Preview"}
                    className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
                />
                {caption && (
                    <p className="text-sm text-white/90 font-medium bg-black/40 px-3 py-1.5 rounded-full">
                        {caption}
                    </p>
                )}
            </div>
        </div>
    )
}

// Pretty-print a qcInspectionData value for display. Skips nested objects /
// arrays (which would need their own layout) and empty strings.
function summariseQcData(data: unknown): Array<{ key: string; value: string }> {
    if (!data || typeof data !== "object") return []
    const out: Array<{ key: string; value: string }> = []
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        if (v === null || v === undefined || v === "") continue
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            out.push({ key: k, value: String(v) })
        }
    }
    return out
}

function humanizeKey(key: string): string {
    return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase())
        .trim()
}

function QcActivityTab({ product }: { product: ProductDetailData }) {
    const status: string = product.approvalStatus
    const isReinspection = status === "REINSPECTION"
    const hasAction = Boolean(product.approvedAt || product.rejectionReason || product.qcInspectionData || isReinspection || (product.inspectionCycleNumber && product.inspectionCycleNumber > 1))
    const isRejected = status === "REJECTED"
    const isApproved = status === "QC_APPROVED" || status === "APPROVED"
    const qcSummary = summariseQcData(product.qcInspectionData)
    const qc = product.assignedQc

    if (!hasAction) {
        return (
            <div className="text-center py-10 text-slate-500 text-sm">
                No QC action recorded for this product yet.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Status banner */}
            <div
                className={`flex items-start gap-4 p-4 rounded-xl border ${isRejected
                    ? "bg-red-50 border-red-200"
                    : isApproved
                        ? "bg-emerald-50 border-emerald-200"
                        : isReinspection
                            ? "bg-amber-50 border-amber-200"
                            : "bg-slate-50 border-slate-200"
                    }`}
            >
                {isRejected ? (
                    <XCircle className="w-5 h-5 mt-0.5 text-red-600" />
                ) : isApproved ? (
                    <CheckCircle className="w-5 h-5 mt-0.5 text-emerald-600" />
                ) : isReinspection ? (
                    <RotateCw className="w-5 h-5 mt-0.5 text-amber-600" />
                ) : (
                    <Clock className="w-5 h-5 mt-0.5 text-slate-500" />
                )}
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isRejected ? "text-red-800" : isApproved ? "text-emerald-800" : "text-slate-800"}`}>
                        Current status: {status}
                    </p>
                    {product.approvedAt && (
                        <p className="text-xs text-slate-600 mt-1">
                            Decision recorded on {formatDate(product.approvedAt)}
                        </p>
                    )}
                    {isRejected && product.rejectionReason && (
                        <p className="text-sm text-red-700 mt-2 whitespace-pre-wrap">
                            <span className="font-semibold">Reason: </span>
                            {product.rejectionReason}
                        </p>
                    )}
                </div>
            </div>

            {/* Re-inspection info */}
            {isReinspection && product.inspectionCycleNumber && product.inspectionCycleNumber > 1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-amber-800">
                        Re-Inspection Cycle #{product.inspectionCycleNumber}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                        Previous inspection was rejected. Please re-evaluate this product thoroughly.
                    </p>
                    {product.previousInspectionData && product.previousInspectionData.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                            Previous reason: {product.previousInspectionData[product.previousInspectionData.length - 1]?.rejectionReason || 'N/A'}
                        </p>
                    )}
                </div>
            )}

            {/* Assigned QC */}
            {qc && (
                <Section title="Assigned QC Checker">
                    <Row icon={<UserCheck className="w-4 h-4" />} label="Name" value={qc.name} />
                    <Row icon={<Mail className="w-4 h-4" />} label="Email" value={qc.email} />
                </Section>
            )}

            {/* Inspection form summary */}
            {qcSummary.length > 0 && (
                <Section title="Inspection Form Summary">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        {qcSummary.map(({ key, value }) => (
                            <Row
                                key={key}
                                icon={<FileText className="w-4 h-4" />}
                                label={humanizeKey(key)}
                                value={value}
                            />
                        ))}
                    </div>
                </Section>
            )}

            {/* Timestamps */}
            <Section title="Timeline">
                <Row icon={<Clock className="w-4 h-4" />} label="Listed on" value={formatDate(product.createdAt)} />
                <Row icon={<Clock className="w-4 h-4" />} label="Last updated" value={formatDate(product.updatedAt)} />
            </Section>
        </div>
    )
}
