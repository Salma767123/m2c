"use client"

interface StepProps {
    formData: any
    setFormData: (data: any) => void
}

export default function ProductionInfo({ formData, setFormData }: StepProps) {
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
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Category to Inspect:</label>
                    <input
                        type="text"
                        value={formData.categoryToInspect || ""}
                        onChange={(e) => setFormData({ ...formData, categoryToInspect: e.target.value })}
                        placeholder="Enter category to inspect"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Products Manufactured:</label>
                    <input
                        type="text"
                        value={formData.productsManufactured}
                        onChange={(e) => setFormData({ ...formData, productsManufactured: e.target.value })}
                        placeholder="Enter products manufactured (e.g. Cotton T-shirts, Jeans)"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Monthly Production Capacity:</label>
                    <input
                        type="text"
                        value={formData.monthlyProductionCapacity}
                        onChange={(e) => setFormData({ ...formData, monthlyProductionCapacity: e.target.value })}
                        placeholder="Enter monthly production capacity"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Number of Production Workers:</label>
                    <input
                        type="text"
                        value={formData.numberOfProductionWorkers}
                        onChange={(e) => setFormData({ ...formData, numberOfProductionWorkers: e.target.value })}
                        placeholder="Enter number of workers"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
        </div>
    )
}
