"use client"

import { Camera, Upload, X, Image as ImageIcon } from "lucide-react"
import { useRef, useState } from "react"
import ImageCropModal from "@/components/UI/ImageCropModal"

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


interface PackagingProps {
  formData: {
    shipperCartonRemark: string
    innerCartonRemark: string
    retailPackagingRemark: string
    productTypeRemark: string
    aqlWorkmanshipRemark: string
    onSiteTestsRemark: string
    packagingPhotos: any[]
  }
  setFormData: (data: any) => void
  errors?: Record<string, string>
}

export default function Packaging({ formData, setFormData, errors = {} }: PackagingProps) {
  const packagingPhotoInputRef = useRef<HTMLInputElement | null>(null)
  const [cropQueue, setCropQueue] = useState<File[]>([])
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState('')

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })

  const handlePackagingPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (e.target) e.target.value = ""
    if (files.length === 0) return
    setCropQueue(files.slice(1))
    setCropFileName(files[0].name)
    setCropSrc(URL.createObjectURL(files[0]))
  }

  const onPackagingCropped = async (croppedFile: File) => {
    const dataUrl = await readAsDataUrl(croppedFile)
    setFormData((prev: any) => ({
      ...prev,
      packagingPhotos: [...(prev.packagingPhotos || []), { name: cropFileName, data: dataUrl, url: dataUrl }]
    }))
    const cur = cropSrc
    if (cur?.startsWith('blob:')) URL.revokeObjectURL(cur)
    if (cropQueue.length > 0) {
      const [next, ...rest] = cropQueue
      setCropQueue(rest)
      setCropFileName(next.name)
      setCropSrc(URL.createObjectURL(next))
    } else {
      setCropSrc(null)
      setCropFileName('')
    }
  }

  const removePackagingPhoto = (photoIndex: number) => {
    const updatedPhotos = formData.packagingPhotos.filter((_, i) => i !== photoIndex)
    setFormData((prev: any) => ({ ...prev, packagingPhotos: updatedPhotos }))
  }

  const handleRemarkChange = (remarkKey: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [remarkKey]: value }))
  }

  const handleRemarkNumberSelect = (remarkKey: string, number: string) => {
    // Single selection - set the selected number directly
    setFormData((prev: any) => ({ ...prev, [remarkKey]: number }))
  }

  const isRemarkNumberSelected = (remarkKey: string, number: string) => {
    const currentValue = (formData[remarkKey as keyof typeof formData] as string) || ""
    return currentValue === number
  }

  const getScoreColorSelected = (num: number) => {
    if (num >= 8) return "bg-emerald-600 border-emerald-600 text-white shadow-lg hover:bg-emerald-700 transform scale-105"
    if (num >= 6) return "bg-amber-500 border-amber-500 text-white shadow-lg hover:bg-amber-600 transform scale-105"
    return "bg-red-600 border-red-600 text-white shadow-lg hover:bg-red-700 transform scale-105"
  }

  const getScoreTextColor = (num: number) => {
    if (num >= 8) return "text-emerald-600"
    if (num >= 6) return "text-amber-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">C. Inspection Result Summary</h2>
        <p className="text-slate-600">Select remark codes for packaging, product type, AQL, and on-site tests</p>
      </div>

      {/* Remark Code Scoring Guide — mirrors the scoring system applied on the
          Review step. The final result is calculated from the AVERAGE of all
          six remark codes below, so checkers can see how each code they pick
          contributes to PASS / RE-INSPECTION / REJECTED. */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 mb-1">Remark Code Scoring Guide</h3>
        <p className="text-sm text-slate-600 mb-4">
          The final result is based on the <span className="font-medium text-slate-800">average</span> of all six remark codes below
          (1 = poorest, 10 = best).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <span className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center">8-10</span>
            <div>
              <div className="font-bold text-emerald-700 text-sm">PASS</div>
              <div className="text-xs text-emerald-600/90">Quality standards met</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <span className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500 text-white font-bold text-sm flex items-center justify-center">6-7</span>
            <div>
              <div className="font-bold text-amber-700 text-sm">RE-INSPECTION</div>
              <div className="text-xs text-amber-600/90">Quality concerns found</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <span className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600 text-white font-bold text-sm flex items-center justify-center">1-5</span>
            <div>
              <div className="font-bold text-red-700 text-sm">REJECTED</div>
              <div className="text-xs text-red-600/90">Standards not met</div>
            </div>
          </div>
        </div>
      </div>

      {[
        { key: "shipperCartonQuality", label: "Shipper Carton Packaging", detail: "Front, side, top views", remarkKey: "shipperCartonRemark" },
        { key: "innerCartonPackaging", label: "Inner Carton Packaging", detail: "Inner packaging condition", remarkKey: "innerCartonRemark" },
        { key: "retailPackagingQuality", label: "Retail Packaging", detail: "Brand sticker, warning labels", remarkKey: "retailPackagingRemark" },
        { key: "productTypeConformity", label: "Product Type (style, size, color, construction, material, marking, labeling)", detail: "Matches approved specs", remarkKey: "productTypeRemark" },
        { key: "aqlWorkmanship", label: "AQL (Workmanship / Appearance / Function)", detail: "Visual and functional checks", remarkKey: "aqlWorkmanshipRemark" },
        { key: "onSiteTests", label: "On-site Tests", detail: "Drop test, color fastness, seam strength, etc.", remarkKey: "onSiteTestsRemark" },
      ].map((item) => (
        <div key={item.key} className={`rounded-xl p-6 space-y-4 ${errors[item.remarkKey] ? 'bg-red-50/40 border border-red-300' : 'bg-slate-50/50'}`}>
          <div>
            <label className="block text-slate-900 font-semibold mb-2">
              {item.label}
              <span className="text-red-500 ml-0.5" aria-label="required">*</span>
            </label>
            <p className="text-slate-600 text-sm mb-4">{item.detail}</p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-slate-700">Select Remark Code (1-10):</label>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 10 }, (_, idx) => idx + 1).map((numVal) => {
                const num = `${numVal}`
                const isSelected = isRemarkNumberSelected(item.remarkKey, num)
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleRemarkNumberSelect(item.remarkKey, num)}
                    className={`w-12 h-12 rounded-full border-2 font-semibold text-sm transition-all duration-200 ${isSelected
                        ? getScoreColorSelected(numVal)
                        : "bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50 hover:scale-105"
                      }`}
                  >
                    {num}
                  </button>
                )
              })}
            </div>
            {formData[item.remarkKey as keyof typeof formData] && (
              <div className="mt-2">
                <span className="text-sm text-slate-600">Selected: </span>
                <span className={`text-sm font-semibold ${getScoreTextColor(Number(formData[item.remarkKey as keyof typeof formData]))}`}>
                  Code {formData[item.remarkKey as keyof typeof formData]}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemarkNumberSelect(item.remarkKey, "")}
                  className="ml-3 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Clear Selection
                </button>
              </div>
            )}
            {errors[item.remarkKey] && (
              <p className="text-xs text-red-600">{errors[item.remarkKey]}</p>
            )}
          </div>
        </div>
      ))}

      <div>
        <label className="block text-slate-700 font-semibold mb-3">Photo Evidence:<span className="text-red-500 ml-0.5" aria-label="required">*</span></label>
        <p className="text-slate-600 text-sm mb-4">Carton quality, labels, internal protection details</p>
        <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${errors.packagingPhotos ? 'border-red-400 bg-red-50/40' : 'border-slate-300 hover:border-brand-400 bg-slate-50/50'}`}>
          <input
            ref={packagingPhotoInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handlePackagingPhotoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => packagingPhotoInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-xl"
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Upload packaging photos</p>
            <p className="text-slate-500 text-sm mt-1">Drag & drop or click to browse</p>
          </button>
        </div>
        {errors.packagingPhotos && (
          <p className="mt-1.5 text-xs text-red-600">{errors.packagingPhotos}</p>
        )}

        {/* Uploaded Photos List */}
        {formData.packagingPhotos && formData.packagingPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
            {formData.packagingPhotos.map((photo: any, index: number) => (
              <div key={index} className="relative group">
                {photo.data || photo.url ? (
                  <img
                    src={photo.data || photo.url}
                    alt={photo.name}
                    className="w-full h-28 object-cover rounded-xl border border-slate-200"
                  />
                ) : (
                  <div className="w-full h-28 flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200 text-slate-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-2 py-1 rounded-b-xl truncate">
                  {photo.name}
                </div>
                <button
                  onClick={() => removePackagingPhoto(index)}
                  className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <ImageCropModal
        src={cropSrc}
        fileName={cropFileName}
        title="Crop Packaging Photo"
        cropShape="rect"
        showGrid={true}
        onCancel={() => {
          if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
          setCropQueue([])
          setCropSrc(null)
          setCropFileName('')
        }}
        onCropped={onPackagingCropped}
      />
    </div>
  )
}