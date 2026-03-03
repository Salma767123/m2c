"use client"

interface StepProps {
    formData: any
    setFormData: (data: any) => void
}

export default function InspectionInfo({ formData, setFormData }: StepProps) {
    const statusOptions = ["Approved", "Conditionally Approved", "Rejected"]

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
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Inspection Date:</label>
                    <input
                        type="date"
                        value={formData.inspectionDate}
                        onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Inspector Name:</label>
                    <input
                        type="text"
                        value={formData.inspectorName}
                        onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                        placeholder="Enter inspector name"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Inspection Status:</label>
                    <select
                        value={formData.inspectionStatus}
                        onChange={(e) => setFormData({ ...formData, inspectionStatus: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {statusOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Inspector Remarks:</label>
                    <textarea
                        value={formData.inspectorRemarks}
                        onChange={(e) => setFormData({ ...formData, inspectorRemarks: e.target.value })}
                        placeholder="Enter any additional remarks"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={4}
                    />
                </div>
            </div>
        </div>
    )
}
