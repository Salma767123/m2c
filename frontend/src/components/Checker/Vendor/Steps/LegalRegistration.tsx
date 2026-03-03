"use client"

interface StepProps {
    formData: any
    setFormData: (data: any) => void
}

export default function LegalRegistration({ formData, setFormData }: StepProps) {
    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Legal & Registration</h2>
                <p className="text-slate-600">
                    Verify business and factory registrations.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Business Registration Number:</label>
                    <input
                        type="text"
                        value={formData.businessRegistrationNumber}
                        onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
                        placeholder="Enter business registration number"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">GST / Tax ID:</label>
                    <input
                        type="text"
                        value={formData.gstTaxId}
                        onChange={(e) => setFormData({ ...formData, gstTaxId: e.target.value })}
                        placeholder="Enter GST / Tax ID"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Factory License Number:</label>
                    <input
                        type="text"
                        value={formData.factoryLicenseNumber}
                        onChange={(e) => setFormData({ ...formData, factoryLicenseNumber: e.target.value })}
                        placeholder="Enter factory license number"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
        </div>
    )
}
