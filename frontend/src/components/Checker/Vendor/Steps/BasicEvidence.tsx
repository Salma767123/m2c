"use client"

import { Upload, X, FileText, AlertCircle } from "lucide-react"
import type { StepErrors } from "../validation"
import { ErrorText } from "./fieldHelpers"
import {
    FACTORY_IMAGE_SLOTS,
    REQUIRED_FACTORY_SLOT_LABEL,
    getSlotPhoto,
    type FactoryImageSlotId,
    type FactoryPhoto,
} from "./factoryImageSlots"

interface StepProps {
    formData: any
    setFormData: (data: any) => void
    errors?: StepErrors
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

const ALLOWED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif"

export default function BasicEvidence({ formData, setFormData, errors = {} }: StepProps) {
    const photos: FactoryPhoto[] = Array.isArray(formData.factoryPhotos) ? formData.factoryPhotos : []

    // Upload (or replace) the single image for a named slot.
    const handleSlotUpload = async (slotId: FactoryImageSlotId, label: string, file: File) => {
        if (!file.type.startsWith("image/")) return
        const data = await compressImage(file)
        const entry: FactoryPhoto = { slotId, label, name: file.name, data, url: data }
        const others = photos.filter((p) => p.slotId !== slotId)
        setFormData({ ...formData, factoryPhotos: [...others, entry] })
    }

    const handleSlotRemove = (slotId: FactoryImageSlotId) => {
        setFormData({ ...formData, factoryPhotos: photos.filter((p) => p.slotId !== slotId) })
    }

    // Documents — unchanged generic multi-file upload (optional).
    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return
        const files = Array.from(e.target.files)
        const newEntries = await Promise.all(
            files.map(async (file) => {
                const data = await new Promise<string>((resolve) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result as string)
                    reader.readAsDataURL(file)
                })
                return { name: file.name, data, url: null }
            })
        )
        setFormData({ ...formData, documentsUpload: [...(formData.documentsUpload || []), ...newEntries] })
        e.target.value = ""
    }

    const removeDoc = (index: number) => {
        const updated = [...(formData.documentsUpload || [])]
        updated.splice(index, 1)
        setFormData({ ...formData, documentsUpload: updated })
    }

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Basic Evidence</h2>
                <p className="text-slate-600">
                    Upload named factory photos and any supporting documents. Images are compressed automatically.
                </p>
                <div className="flex items-center gap-2 mt-3 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Photos are saved as part of the report and will be visible to the admin.
                </div>
            </div>

            <div className="space-y-6">
                {/* Factory & Facility Photos — named slots */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-semibold text-sm">
                            Factory &amp; Facility Photos
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                        PNG, JPG, WEBP, or GIF.{" "}
                        <span className="font-semibold text-slate-700">Required:</span> {REQUIRED_FACTORY_SLOT_LABEL}.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="group" aria-label="Factory images">
                        {FACTORY_IMAGE_SLOTS.map((slot) => {
                            const value = getSlotPhoto(photos, slot.id)
                            const slotErrKey = `factoryImage:${slot.id}`
                            const slotError = errors[slotErrKey]
                            const inputId = `factory-img-${slot.id}`
                            const previewSrc = value?.data || value?.url || null

                            return (
                                <div
                                    key={slot.id}
                                    className={`flex flex-col rounded-xl border p-3 transition-all duration-200 ${slotError
                                        ? "border-red-300 bg-red-50/30"
                                        : value
                                            ? "border-brand-300/40 bg-brand-50/10"
                                            : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                                        }`}
                                >
                                    {/* Slot header */}
                                    <div className="mb-2">
                                        <p className="text-xs font-bold text-slate-800 leading-tight">
                                            {slot.label}
                                            {slot.required ? (
                                                <span className="text-brand-500 ml-0.5" aria-hidden="true">*</span>
                                            ) : (
                                                <span className="ml-1 text-[10px] font-normal text-slate-400">(optional)</span>
                                            )}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{slot.description}</p>
                                    </div>

                                    {/* Upload zone */}
                                    <div
                                        className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg border-2 border-dashed transition-colors ${slotError
                                            ? "border-red-400 bg-red-50/30"
                                            : value
                                                ? "border-brand-400/30 bg-white"
                                                : "border-slate-300 bg-white hover:border-brand-400/50 hover:bg-brand-50/10"
                                            }`}
                                    >
                                        {previewSrc ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={previewSrc}
                                                    alt={`${slot.label} preview`}
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleSlotRemove(slot.id)}
                                                    aria-label={`Remove ${slot.label}`}
                                                    className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/95 text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700 transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                                                </button>
                                            </>
                                        ) : (
                                            <label
                                                htmlFor={inputId}
                                                className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer text-center px-2"
                                            >
                                                <Upload className="w-5 h-5 text-slate-300" aria-hidden="true" />
                                                <span className="text-[11px] font-semibold text-brand-600">Upload</span>
                                                <span className="text-[10px] text-slate-400">or drag &amp; drop</span>
                                            </label>
                                        )}
                                        <input
                                            id={inputId}
                                            type="file"
                                            accept={ALLOWED_IMAGE_TYPES}
                                            className="sr-only"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) handleSlotUpload(slot.id, slot.label, file)
                                                e.target.value = ""
                                            }}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                e.preventDefault()
                                                const file = e.dataTransfer.files?.[0]
                                                if (file) handleSlotUpload(slot.id, slot.label, file)
                                            }}
                                        />
                                    </div>

                                    {/* Filename + replace link */}
                                    {value && (
                                        <div className="mt-1.5 flex items-center justify-between gap-1 text-[11px]">
                                            <p className="truncate text-slate-600" title={value.name}>{value.name}</p>
                                            <label htmlFor={inputId} className="shrink-0 cursor-pointer text-brand-600 hover:text-brand-500 font-semibold">
                                                Replace
                                            </label>
                                        </div>
                                    )}

                                    {slotError && (
                                        <p className="text-red-600 text-[11px] mt-1 font-medium" role="alert">{slotError}</p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <ErrorText msg={errors.factoryPhotos} />
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
                                onChange={handleDocUpload}
                            />
                        </label>
                    </div>
                    {formData.documentsUpload?.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {formData.documentsUpload.map((doc: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
                                        <span className="text-sm text-slate-700 truncate">{doc.name}</span>
                                    </div>
                                    <button
                                        onClick={() => removeDoc(idx)}
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
