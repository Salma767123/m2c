"use client"

import { Camera, Upload, X, Image as ImageIcon } from "lucide-react"
import { useRef } from "react"

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
}

export default function Packaging({ formData, setFormData }: PackagingProps) {
  const packagingPhotoInputRef = useRef<HTMLInputElement | null>(null)

  const handlePackagingPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newEntries = await Promise.all(
        Array.from(files).map(async (file) => {
          const data = await compressImage(file)
          return { name: file.name, data, url: data }
        })
      )
      setFormData({
        ...formData,
        packagingPhotos: [...(formData.packagingPhotos || []), ...newEntries]
      })
    }
    // Reset input
    if (e.target) e.target.value = ""
  }

  const removePackagingPhoto = (photoIndex: number) => {
    const updatedPhotos = formData.packagingPhotos.filter((_, i) => i !== photoIndex)
    setFormData({ ...formData, packagingPhotos: updatedPhotos })
  }

  const handleRemarkChange = (remarkKey: string, value: string) => {
    setFormData({ ...formData, [remarkKey]: value })
  }

  const handleRemarkNumberSelect = (remarkKey: string, number: string) => {
    // Single selection - set the selected number directly
    setFormData({ ...formData, [remarkKey]: number })
  }

  const isRemarkNumberSelected = (remarkKey: string, number: string) => {
    const currentValue = (formData[remarkKey as keyof typeof formData] as string) || ""
    return currentValue === number
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">C. Inspection Result Summary</h2>
        <p className="text-slate-600">Select remark codes for packaging, product type, AQL, and on-site tests</p>
      </div>

      {[
        { key: "shipperCartonQuality", label: "Shipper Carton Packaging", detail: "Front, side, top views", remarkKey: "shipperCartonRemark" },
        { key: "innerCartonPackaging", label: "Inner Carton Packaging", detail: "Inner packaging condition", remarkKey: "innerCartonRemark" },
        { key: "retailPackagingQuality", label: "Retail Packaging", detail: "Brand sticker, warning labels", remarkKey: "retailPackagingRemark" },
        { key: "productTypeConformity", label: "Product Type (style, size, color, construction, material, marking, labeling)", detail: "Matches approved specs", remarkKey: "productTypeRemark" },
        { key: "aqlWorkmanship", label: "AQL (Workmanship / Appearance / Function)", detail: "Visual and functional checks", remarkKey: "aqlWorkmanshipRemark" },
        { key: "onSiteTests", label: "On-site Tests", detail: "Drop test, color fastness, seam strength, etc.", remarkKey: "onSiteTestsRemark" },
      ].map((item) => (
        <div key={item.key} className="bg-slate-50/50 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-slate-900 font-semibold mb-2">{item.label}</label>
            <p className="text-slate-600 text-sm mb-4">{item.detail}</p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-slate-700">Select Remark Code (1-10):</label>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 10 }, (_, idx) => `${idx + 1}`).map((num) => {
                const isSelected = isRemarkNumberSelected(item.remarkKey, num)
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleRemarkNumberSelect(item.remarkKey, num)}
                    className={`w-12 h-12 rounded-full border-2 font-semibold text-sm transition-all duration-200 ${isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-lg hover:bg-blue-700 transform scale-105"
                        : "bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50 hover:scale-105"
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
                <span className="text-sm font-semibold text-blue-600">
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
          </div>
        </div>
      ))}

      <div>
        <label className="block text-slate-700 font-semibold mb-3">Photo Evidence:</label>
        <p className="text-slate-600 text-sm mb-4">Carton quality, labels, internal protection details</p>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50">
          <input
            ref={packagingPhotoInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handlePackagingPhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => packagingPhotoInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full"
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Upload packaging photos</p>
            <p className="text-slate-500 text-sm mt-1">Drag & drop or click to browse</p>
          </button>
        </div>

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
    </div>
  )
}