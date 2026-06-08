"use client"

import type { StepErrors } from "../validation"
import { inputCls, ErrorText, RequiredMark, READONLY_CLS, SelectField } from "./fieldHelpers"

interface StepProps {
    formData: any
    setFormData: (data: any) => void
    errors?: StepErrors
}

export default function InspectionInfo({ formData, setFormData, errors = {} }: StepProps) {
    const statusOptions = ["Approved", "Rejected"]
    const isRejected = formData.inspectionStatus === "Rejected"

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Inspection Info</h2>
                <p className="text-slate-600">
                    Log details regarding the outcome of the inspection.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Inspection Date<RequiredMark />
                    </label>
                    <input
                        type="date"
                        value={formData.inspectionDate || ""}
                        onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                        max={new Date().toISOString().split("T")[0]}
                        aria-invalid={!!errors.inspectionDate}
                        className={inputCls(!!errors.inspectionDate)}
                    />
                    <ErrorText msg={errors.inspectionDate} />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Inspector Name:</label>
                    <input
                        type="text"
                        value={formData.inspectorName || ""}
                        readOnly
                        aria-readonly="true"
                        title="Auto-filled from your logged-in QC Checker profile"
                        placeholder="Loading inspector..."
                        className={READONLY_CLS}
                    />
                    <ErrorText msg={errors.inspectorName} />
                    {!errors.inspectorName && (
                        <p className="mt-2 text-xs text-slate-500">Auto-filled from your logged-in checker profile.</p>
                    )}
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Inspection Status<RequiredMark />
                    </label>
                    <SelectField
                        value={formData.inspectionStatus || "Approved"}
                        onChange={(value) => setFormData({ ...formData, inspectionStatus: value })}
                        options={statusOptions}
                        hasError={!!errors.inspectionStatus}
                    />
                    <ErrorText msg={errors.inspectionStatus} />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Inspector Remarks{isRejected && <RequiredMark />}
                    </label>
                    <textarea
                        value={formData.inspectorRemarks || ""}
                        onChange={(e) => setFormData({ ...formData, inspectorRemarks: e.target.value })}
                        placeholder={isRejected ? "Required — reason for rejection" : "Enter any additional remarks (optional)"}
                        aria-invalid={!!errors.inspectorRemarks}
                        className={inputCls(!!errors.inspectorRemarks)}
                        rows={4}
                    />
                    <ErrorText msg={errors.inspectorRemarks} />
                </div>
            </div>
        </div>
    )
}
