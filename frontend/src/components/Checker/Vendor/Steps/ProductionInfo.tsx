"use client"

import type { StepErrors } from "../validation"
import {
    READONLY_CLS,
    ErrorText,
    RequiredMark,
    inputCls,
} from "./fieldHelpers"

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
        </div>
    )
}
