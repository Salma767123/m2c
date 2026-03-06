"use client"

import { ChevronDown, ChevronUp, Camera, CheckCircle, AlertTriangle, Upload, X, Image as ImageIcon } from "lucide-react"
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


interface DefectsProps {
  formData: {
    // AQL Configuration
    inspectionLevel: string
    sampleSize: number
    aqlCritical: number
    aqlMajor: number
    aqlMinor: number
    maxAllowedCritical: number
    maxAllowedMajor: number
    maxAllowedMinor: number
    // Defect Counts
    criticalDefects: number
    majorDefects: number
    minorDefects: number
    criticalDefectDetails: string
    majorDefectDetails: string
    minorDefectDetails: string
    defectPhotos: any[]
  }
  setFormData: (data: any) => void
}

export default function Defects({ formData, setFormData }: DefectsProps) {
  const defectPhotoInputRef = useRef<HTMLInputElement | null>(null)

  const handleDefectPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        defectPhotos: [...(formData.defectPhotos || []), ...newEntries]
      })
    }
    // Reset input
    if (e.target) e.target.value = ""
  }

  const removeDefectPhoto = (photoIndex: number) => {
    const updatedPhotos = formData.defectPhotos.filter((_, i) => i !== photoIndex)
    setFormData({ ...formData, defectPhotos: updatedPhotos })
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">AQL Summary (Workmanship, Appearance and Basic Function)</h2>
        <p className="text-slate-600">
          Visual AQL check on {formData.sampleSize} randomly selected units for critical, major and minor defects
        </p>
      </div>

      {/* AQL Configuration */}
      <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">AQL Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Inspection Level</label>
            <select
              value={formData.inspectionLevel}
              onChange={(e) => setFormData({ ...formData, inspectionLevel: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="L-I">L-I</option>
              <option value="L-II">L-II</option>
              <option value="L-III">L-III</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sample Size</label>
            <input
              type="number"
              value={formData.sampleSize}
              onChange={(e) => setFormData({ ...formData, sampleSize: parseInt(e.target.value) || 200 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">AQL Level - Major</label>
            <input
              type="number"
              step="0.1"
              value={formData.aqlMajor}
              onChange={(e) => setFormData({ ...formData, aqlMajor: parseFloat(e.target.value) || 1.0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">AQL Level - Minor</label>
            <input
              type="number"
              step="0.1"
              value={formData.aqlMinor}
              onChange={(e) => setFormData({ ...formData, aqlMinor: parseFloat(e.target.value) || 2.5 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Max Allowed - Critical</label>
            <input
              type="number"
              value={formData.maxAllowedCritical}
              onChange={(e) => setFormData({ ...formData, maxAllowedCritical: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Max Allowed - Major</label>
            <input
              type="number"
              value={formData.maxAllowedMajor}
              onChange={(e) => setFormData({ ...formData, maxAllowedMajor: parseInt(e.target.value) || 5 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Max Allowed - Minor</label>
            <input
              type="number"
              value={formData.maxAllowedMinor}
              onChange={(e) => setFormData({ ...formData, maxAllowedMinor: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Defect Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Critical Defects */}
        <div className="bg-linear-to-br from-purple-50 to-purple-100/50 border border-purple-200 p-6 rounded-xl">
          <p className="text-purple-800 font-semibold mb-4">Critical Defects (Max: {formData.maxAllowedCritical})</p>
          <div className="flex items-center justify-between">
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  criticalDefects: Math.max(0, formData.criticalDefects - 1),
                })
              }
              className="p-3 bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-purple-600" />
            </button>
            <span className="text-5xl font-bold text-purple-700">{formData.criticalDefects}</span>
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  criticalDefects: formData.criticalDefects + 1,
                })
              }
              className="p-3 bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <ChevronUp className="w-5 h-5 text-purple-600" />
            </button>
          </div>
        </div>

        {/* Major Defects */}
        <div className="bg-linear-to-br from-red-50 to-red-100/50 border border-red-200 p-6 rounded-xl">
          <p className="text-red-800 font-semibold mb-4">Major Defects (Weaving, cut holes - Max: {formData.maxAllowedMajor})</p>
          <div className="flex items-center justify-between">
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  majorDefects: Math.max(0, formData.majorDefects - 1),
                })
              }
              className="p-3 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-red-600" />
            </button>
            <span className="text-5xl font-bold text-red-700">{formData.majorDefects}</span>
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  majorDefects: formData.majorDefects + 1,
                })
              }
              className="p-3 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <ChevronUp className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>

        {/* Minor Defects */}
        <div className="bg-linear-to-br from-amber-50 to-amber-100/50 border border-amber-200 p-6 rounded-xl">
          <p className="text-amber-800 font-semibold mb-4">Minor Defects (Pulled yarns, threads - Max: {formData.maxAllowedMinor})</p>
          <div className="flex items-center justify-between">
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  minorDefects: Math.max(0, formData.minorDefects - 1),
                })
              }
              className="p-3 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-amber-600" />
            </button>
            <span className="text-5xl font-bold text-amber-700">{formData.minorDefects}</span>
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  minorDefects: formData.minorDefects + 1,
                })
              }
              className="p-3 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
            >
              <ChevronUp className="w-5 h-5 text-amber-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Defect Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-slate-700 font-semibold mb-3">Critical Defect Details:</label>
          <textarea
            value={formData.criticalDefectDetails}
            onChange={(e) => setFormData({ ...formData, criticalDefectDetails: e.target.value })}
            placeholder="Describe critical defects found..."
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-h-24"
          />
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-3">Major Defect Details:</label>
          <textarea
            value={formData.majorDefectDetails}
            onChange={(e) => setFormData({ ...formData, majorDefectDetails: e.target.value })}
            placeholder="Describe major defects found..."
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-h-24"
          />
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-3">Minor Defect Details:</label>
          <textarea
            value={formData.minorDefectDetails}
            onChange={(e) => setFormData({ ...formData, minorDefectDetails: e.target.value })}
            placeholder="Describe minor defects found..."
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-h-24"
          />
        </div>
      </div>

      {/* AQL Status Summary */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">AQL Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-slate-600">Critical</p>
            <p className="text-2xl font-bold text-slate-900">{formData.criticalDefects}/{formData.maxAllowedCritical}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600">Major</p>
            <p className="text-2xl font-bold text-slate-900">{formData.majorDefects}/{formData.maxAllowedMajor}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600">Minor</p>
            <p className="text-2xl font-bold text-slate-900">{formData.minorDefects}/{formData.maxAllowedMinor}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600">AQL Comment</p>
            <p className="text-lg font-bold text-slate-900">
              {formData.criticalDefects <= formData.maxAllowedCritical &&
                formData.majorDefects <= formData.maxAllowedMajor &&
                formData.minorDefects <= formData.maxAllowedMinor ? "PASS" : "FAIL"}
            </p>
          </div>
        </div>
        <div
          className={`p-4 rounded-lg border-2 ${formData.criticalDefects <= formData.maxAllowedCritical &&
              formData.majorDefects <= formData.maxAllowedMajor &&
              formData.minorDefects <= formData.maxAllowedMinor
              ? "bg-emerald-50 border-emerald-200"
              : "bg-red-50 border-red-200"
            }`}
        >
          <div className="flex items-center gap-3">
            {formData.criticalDefects <= formData.maxAllowedCritical &&
              formData.majorDefects <= formData.maxAllowedMajor &&
              formData.minorDefects <= formData.maxAllowedMinor ? (
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            )}
            <p
              className={`font-bold text-lg ${formData.criticalDefects <= formData.maxAllowedCritical &&
                  formData.majorDefects <= formData.maxAllowedMajor &&
                  formData.minorDefects <= formData.maxAllowedMinor
                  ? "text-emerald-800"
                  : "text-red-800"
                }`}
            >
              {formData.criticalDefects <= formData.maxAllowedCritical &&
                formData.majorDefects <= formData.maxAllowedMajor &&
                formData.minorDefects <= formData.maxAllowedMinor
                ? "AQL Status: PASS"
                : "AQL Status: FAIL"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-slate-700 font-semibold mb-3">Photo Evidence:</label>
        <p className="text-slate-600 text-sm mb-4">Major/minor defects, sealed samples with AQF tape</p>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50">
          <input
            ref={defectPhotoInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleDefectPhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => defectPhotoInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full"
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Upload defect photos</p>
            <p className="text-slate-500 text-sm mt-1">Drag & drop or click to browse</p>
          </button>
        </div>

        {/* Uploaded Photos List */}
        {formData.defectPhotos && formData.defectPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
            {formData.defectPhotos.map((photo: any, index: number) => (
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
                  onClick={() => removeDefectPhoto(index)}
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