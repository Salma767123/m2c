"use client"

import { Package, Image as ImageIcon } from "lucide-react"
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

interface StepProps {
    formData: any
    setFormData: (data: any) => void
    errors?: StepErrors
    // Captured by parent at autofill time so lock state is stable across
    // typing and step remounts.
    autofillSnapshot?: Record<string, boolean>
}

// Category to Inspect is admin-assigned via inspection.itemsToInspect — locked
// when present so the checker cannot mutate the assigned scope. Falls back to
// editable only if admin somehow left it empty (defensive).
export default function ProductionInfo({ formData, setFormData, errors = {}, autofillSnapshot = {} }: StepProps) {
    const categoryLocked = !!autofillSnapshot.categoryToInspect

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Production Info</h2>
                <p className="text-slate-600">
                    Details about the products manufactured and capacity.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Category to Inspect{!categoryLocked && <RequiredMark />}
                    </label>
                    {categoryLocked ? (
                        <input
                            type="text"
                            value={formData.categoryToInspect}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                        />
                    ) : (
                        <>
                            <input
                                type="text"
                                value={formData.categoryToInspect || ""}
                                onChange={(e) => setFormData({ ...formData, categoryToInspect: e.target.value })}
                                placeholder="Not assigned by admin — enter category"
                                aria-invalid={!!errors.categoryToInspect}
                                className={inputCls(!!errors.categoryToInspect, "bg-white")}
                            />
                            <ErrorText msg={errors.categoryToInspect} />
                        </>
                    )}
                </div>
                <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Products Manufactured<RequiredMark />
                    </label>
                    <input
                        type="text"
                        value={formData.productsManufactured || ""}
                        onChange={(e) => setFormData({ ...formData, productsManufactured: e.target.value })}
                        placeholder="Enter products manufactured (e.g. Cotton T-shirts, Jeans)"
                        aria-invalid={!!errors.productsManufactured}
                        className={inputCls(!!errors.productsManufactured)}
                    />
                    <ErrorText msg={errors.productsManufactured} />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Monthly Production Capacity<RequiredMark />
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={formData.monthlyProductionCapacity || ""}
                        onChange={(e) => setFormData({ ...formData, monthlyProductionCapacity: e.target.value })}
                        placeholder="e.g. 50000"
                        aria-invalid={!!errors.monthlyProductionCapacity}
                        className={inputCls(!!errors.monthlyProductionCapacity)}
                    />
                    <ErrorText msg={errors.monthlyProductionCapacity} />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Number of Production Workers<RequiredMark />
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={formData.numberOfProductionWorkers || ""}
                        onChange={(e) => setFormData({ ...formData, numberOfProductionWorkers: e.target.value })}
                        placeholder="e.g. 120"
                        aria-invalid={!!errors.numberOfProductionWorkers}
                        className={inputCls(!!errors.numberOfProductionWorkers)}
                    />
                    <ErrorText msg={errors.numberOfProductionWorkers} />
                </div>
            </div>

            <VendorProducts products={formData.vendorProducts} />
        </div>
    )
}

// Read-only list of the products the vendor registered, grouped by category,
// with the product name and any uploaded photos. Lets the checker match the
// declared catalogue against what they see on-site. Renders nothing when the
// vendor registered no products.
function VendorProducts({ products }: { products?: any[] }) {
    const list = Array.isArray(products) ? products : []
    if (list.length === 0) return null

    // Group by category, preserving first-seen order.
    const groups: { category: string; items: any[] }[] = []
    const indexByCategory = new Map<string, number>()
    for (const p of list) {
        const category = p?.category || "Uncategorised"
        if (!indexByCategory.has(category)) {
            indexByCategory.set(category, groups.length)
            groups.push({ category, items: [] })
        }
        groups[indexByCategory.get(category)!].items.push(p)
    }

    return (
        <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Vendor Products</h3>
                <p className="text-slate-500 text-sm">Registered by the vendor — read-only reference for on-site verification.</p>
            </div>

            <div className="space-y-6">
                {groups.map((group, gi) => (
                    <div key={gi}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{group.category}</p>
                        <div className="space-y-4">
                            {group.items.map((product, pi) => {
                                const photos: string[] = Array.isArray(product?.photos) ? product.photos.filter(Boolean) : []
                                return (
                                    <div key={pi} className="rounded-xl border border-slate-200 p-4 bg-white">
                                        <p className="text-sm font-semibold text-slate-800 mb-3">{product?.name || `Product ${pi + 1}`}</p>
                                        {photos.length > 0 ? (
                                            <div className="flex flex-wrap gap-3">
                                                {photos.map((url, idx) => (
                                                    <button key={idx} type="button" onClick={() => openDoc(url, product?.name || 'Product Photo')} className="block w-24">
                                                        {isImageUrl(url) ? (
                                                            <img src={url} alt={product?.name || "Product"} className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                                                        ) : (
                                                            <div className="w-24 h-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                                                                <ImageIcon className="w-7 h-7 text-slate-400" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="flex items-center gap-1.5 text-xs text-slate-400">
                                                <Package className="w-3.5 h-3.5" /> No photos provided
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
