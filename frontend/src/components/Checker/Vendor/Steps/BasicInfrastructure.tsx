"use client"

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
                    <select
                        value={formData.machineryAvailable}
                        onChange={(e) => setFormData({ ...formData, machineryAvailable: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Electricity Availability:</label>
                    <select
                        value={formData.electricityAvailable}
                        onChange={(e) => setFormData({ ...formData, electricityAvailable: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Water Availability:</label>
                    <select
                        value={formData.waterAvailable}
                        onChange={(e) => setFormData({ ...formData, waterAvailable: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Storage Area Available:</label>
                    <select
                        value={formData.storageAreaAvailable}
                        onChange={(e) => setFormData({ ...formData, storageAreaAvailable: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    )
}
