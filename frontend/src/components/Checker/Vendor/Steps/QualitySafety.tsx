"use client"

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
                    <select
                        value={formData.qualityCheckProcess}
                        onChange={(e) => setFormData({ ...formData, qualityCheckProcess: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Safety Equipment Available:</label>
                    <select
                        value={formData.safetyEquipment}
                        onChange={(e) => setFormData({ ...formData, safetyEquipment: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Clean Working Environment:</label>
                    <select
                        value={formData.cleanWorkingEnvironment}
                        onChange={(e) => setFormData({ ...formData, cleanWorkingEnvironment: e.target.value })}
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
