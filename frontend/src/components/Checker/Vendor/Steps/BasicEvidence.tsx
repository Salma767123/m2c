"use client"

import { Upload, X } from "lucide-react"

interface StepProps {
    formData: any
    setFormData: (data: any) => void
}

export default function BasicEvidence({ formData, setFormData }: StepProps) {
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                url: URL.createObjectURL(file),
                name: file.name
            }))
            setFormData({
                ...formData,
                [fieldName]: [...(formData[fieldName] || []), ...newFiles]
            })
        }
    }

    const removeFile = (index: number, fieldName: string) => {
        const updatedFiles = [...(formData[fieldName] || [])]
        URL.revokeObjectURL(updatedFiles[index].url)
        updatedFiles.splice(index, 1)
        setFormData({
            ...formData,
            [fieldName]: updatedFiles
        })
    }

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Basic Evidence</h2>
                <p className="text-slate-600">
                    Upload any supporting factory photos or documents.
                </p>
            </div>

            <div className="space-y-6">
                {/* Factory Photos */}
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Factory Photos:</label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors">
                        <Upload className="w-8 h-8 text-slate-400 mb-3" />
                        <p className="text-sm text-slate-600 mb-4">Click to upload or drag and drop images</p>
                        <label className="cursor-pointer bg-white px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Browse Files
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, "factoryPhotos")}
                            />
                        </label>
                    </div>
                    {formData.factoryPhotos?.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                            {formData.factoryPhotos.map((photo: any, idx: number) => (
                                <div key={idx} className="relative group">
                                    <img
                                        src={photo.url}
                                        alt={photo.name}
                                        className="w-full h-32 object-cover rounded-xl border border-slate-200"
                                    />
                                    <button
                                        onClick={() => removeFile(idx, "factoryPhotos")}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Documents Upload */}
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Documents Upload (Optional):</label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors">
                        <Upload className="w-8 h-8 text-slate-400 mb-3" />
                        <p className="text-sm text-slate-600 mb-4">Click to upload or drag and drop documents</p>
                        <label className="cursor-pointer bg-white px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Browse Files
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, "documentsUpload")}
                            />
                        </label>
                    </div>
                    {formData.documentsUpload?.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            {formData.documentsUpload.map((doc: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white">
                                    <span className="text-sm text-slate-700 truncate mr-2">{doc.name}</span>
                                    <button
                                        onClick={() => removeFile(idx, "documentsUpload")}
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
