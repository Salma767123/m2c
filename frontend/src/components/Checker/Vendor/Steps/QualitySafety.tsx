"use client"

import { SelectField } from "./fieldHelpers"

interface StepProps {
    formData: any
    setFormData: (data: any) => void
}

export default function QualitySafety({ formData, setFormData }: StepProps) {
    const options = ["Yes", "No"]

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Quality & Safety (Basic)</h2>
                <p className="text-slate-600">
                    General assessment of quality and safety processes in place.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Quality Check Process Available:</label>
                    <SelectField
                        value={formData.qualityCheckProcess}
                        onChange={(value) => setFormData({ ...formData, qualityCheckProcess: value })}
                        options={options}
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Safety Equipment Available:</label>
                    <SelectField
                        value={formData.safetyEquipment}
                        onChange={(value) => setFormData({ ...formData, safetyEquipment: value })}
                        options={options}
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Clean Working Environment:</label>
                    <SelectField
                        value={formData.cleanWorkingEnvironment}
                        onChange={(value) => setFormData({ ...formData, cleanWorkingEnvironment: value })}
                        options={options}
                    />
                </div>
            </div>
        </div>
    )
}
