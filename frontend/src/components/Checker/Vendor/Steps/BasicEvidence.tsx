"use client"

import { Upload, X, Image as ImageIcon, FileText, AlertCircle } from "lucide-react"

interface StepProps {
    formData: any
    setFormData: (data: any) => void
}

// Compress image before storing to keep payload manageable
const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement("canvas")
                let { width, height } = img

                // Scale down if larger than maxWidth
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width)
                    width = maxWidth
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext("2d")!
                ctx.drawImage(img, 0, 0, width, height)
                resolve(canvas.toDataURL("image/jpeg", quality))
            }
            img.src = e.target?.result as string
        }
        reader.readAsDataURL(file)
    })
}

export default function BasicEvidence({ formData, setFormData }: StepProps) {

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        if (!e.target.files) return
        const files = Array.from(e.target.files)

        const newEntries = await Promise.all(
            files.map(async (file) => {
                if (file.type.startsWith("image/")) {
                    // Compress images to keep payload small
                    const data = await compressImage(file)
                    return { file, url: data, data, name: file.name }
                } else {
                    // For PDFs / docs — store as base64 directly
                    const data = await new Promise<string>((resolve) => {
                        const reader = new FileReader()
                        reader.onload = () => resolve(reader.result as string)
                        reader.readAsDataURL(file)
                    })
                    return { file, url: null, data, name: file.name }
                }
            })
        )

        setFormData({
            ...formData,
            [fieldName]: [...(formData[fieldName] || []), ...newEntries],
        })

        // Reset input so the same file can be re-selected
        e.target.value = ""
    }

    const removeFile = (index: number, fieldName: string) => {
        const updated = [...(formData[fieldName] || [])]
        updated.splice(index, 1)
        setFormData({ ...formData, [fieldName]: updated })
    }

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Basic Evidence</h2>
                <p className="text-slate-600">
                    Upload factory photos and any supporting documents. Images are compressed automatically.
                </p>
                <div className="flex items-center gap-2 mt-3 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Photos are saved as part of the report and will be visible to the admin.
                </div>
            </div>

            <div className="space-y-6">
                {/* Factory Photos */}
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Factory Photos:
                    </label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                            {formData.factoryPhotos.map((photo: any, idx: number) => {
                                const previewSrc = photo.data || photo.url
                                return (
                                    <div key={idx} className="relative group">
                                        {previewSrc && previewSrc.startsWith("data:image") ? (
                                            <img
                                                src={previewSrc}
                                                alt={photo.name}
                                                className="w-full h-28 object-cover rounded-xl border border-slate-200"
                                            />
                                        ) : (
                                            <div className="w-full h-28 flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200">
                                                <ImageIcon className="w-8 h-8 text-slate-400" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-2 py-1 rounded-b-xl truncate">
                                            {photo.name}
                                        </div>
                                        <button
                                            onClick={() => removeFile(idx, "factoryPhotos")}
                                            className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Documents Upload */}
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Documents Upload (Optional):
                    </label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors">
                        <Upload className="w-8 h-8 text-slate-400 mb-3" />
                        <p className="text-sm text-slate-600 mb-4">Click to upload PDF or Word documents</p>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {formData.documentsUpload.map((doc: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                        <span className="text-sm text-slate-700 truncate">{doc.name}</span>
                                    </div>
                                    <button
                                        onClick={() => removeFile(idx, "documentsUpload")}
                                        className="text-red-500 hover:text-red-700 p-1 ml-2 flex-shrink-0"
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
