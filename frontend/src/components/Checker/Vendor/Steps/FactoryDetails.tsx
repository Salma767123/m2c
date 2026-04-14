"use client"

interface StepProps {
    formData: any
    setFormData: (data: any) => void
}

export default function FactoryDetails({ formData, setFormData }: StepProps) {
    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Factory Details</h2>
                <p className="text-slate-600">
                    General information regarding the vendor and factory.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Vendor Name:</label>
                    <input
                        type="text"
                        value={formData.vendorName}
                        onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        readOnly
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Vendor Code:</label>
                    <input
                        type="text"
                        value={formData.vendorCode || ""}
                        readOnly
                        aria-readonly="true"
                        placeholder="Loading..."
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-100 text-slate-700 font-mono cursor-not-allowed focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Factory Name:</label>
                    <input
                        type="text"
                        value={formData.factoryName}
                        onChange={(e) => setFormData({ ...formData, factoryName: e.target.value })}
                        placeholder="Enter factory name"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Contact Person Name:</label>
                    <input
                        type="text"
                        value={formData.contactPersonName}
                        onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                        placeholder="Enter contact person name"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Contact Phone Number:</label>
                    <input
                        type="text"
                        value={formData.contactPhoneNumber}
                        onChange={(e) => setFormData({ ...formData, contactPhoneNumber: e.target.value })}
                        placeholder="Enter contact phone number"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Factory Address:</label>
                    <textarea
                        value={formData.factoryAddress}
                        onChange={(e) => setFormData({ ...formData, factoryAddress: e.target.value })}
                        placeholder="Enter factory address"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                    />
                </div>
            </div>
        </div>
    )
}
