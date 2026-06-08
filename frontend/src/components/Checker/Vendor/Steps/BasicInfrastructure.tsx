"use client"

import { SelectField } from "./fieldHelpers"

interface StepProps {
    formData: any
    setFormData: (data: any) => void
}

export default function BasicInfrastructure({ formData, setFormData }: StepProps) {
    const options = ["Yes", "No"]

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Basic Infrastructure Check</h2>
                <p className="text-slate-600">
                    Verify the availability of key infrastructure elements.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Machinery Available:</label>
                    <SelectField
                        value={formData.machineryAvailable}
                        onChange={(value) => setFormData({ ...formData, machineryAvailable: value })}
                        options={options}
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Electricity Availability:</label>
                    <SelectField
                        value={formData.electricityAvailable}
                        onChange={(value) => setFormData({ ...formData, electricityAvailable: value })}
                        options={options}
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Water Availability:</label>
                    <SelectField
                        value={formData.waterAvailable}
                        onChange={(value) => setFormData({ ...formData, waterAvailable: value })}
                        options={options}
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Storage Area Available:</label>
                    <SelectField
                        value={formData.storageAreaAvailable}
                        onChange={(value) => setFormData({ ...formData, storageAreaAvailable: value })}
                        options={options}
                    />
                </div>
            </div>
        </div>
    )
}
