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

interface DocumentationProps {
  formData: {
    inspectorSignature: string
    documentationPhotos: Array<{
      file?: File;
      name: string;
      url: string;
      data: string;
      id: string | number;
      uploadedAt: string;
      uploadedDate: string;
      uploadedTime: string;
    }>
    photocopyDocuments: Array<{
      file?: File;
      name: string;
      url: string;
      data: string;
      id: string | number;
      uploadedAt: string;
      uploadedDate: string;
      uploadedTime: string;
    }>
    companyIdCards: Array<{
      file?: File;
      name: string;
      url: string;
      data: string;
      id: string | number;
      uploadedAt: string;
      uploadedDate: string;
      uploadedTime: string;
    }>
  }
  setFormData: (data: any) => void
}

export default function Documentation({ formData, setFormData }: DocumentationProps) {
  const documentationPhotoInputRef = useRef<HTMLInputElement | null>(null)
  const photocopyInputRef = useRef<HTMLInputElement | null>(null)
  const companyIdInputRef = useRef<HTMLInputElement | null>(null)

  // Helper function to create timestamp data
  const createTimestamp = () => {
    const now = new Date()
    return {
      uploadedAt: now.toISOString(),
      uploadedDate: now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }),
      uploadedTime: now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    }
  }

  const handleDocumentationPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Create compressed images with timestamp
    const newImages = await Promise.all(files.map(async (file) => {
      const data = await compressImage(file)
      return {
        file,
        name: file.name,
        url: data,
        data: data,
        id: Date.now() + Math.random(),
        ...createTimestamp()
      }
    }))

    setFormData({
      ...formData,
      documentationPhotos: [...(formData.documentationPhotos || []), ...newImages]
    })
    if (e.target) e.target.value = ""
  }

  const handlePhotocopyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Create compressed images with timestamp
    const newImages = await Promise.all(files.map(async (file) => {
      const data = await compressImage(file)
      return {
        file,
        name: file.name,
        url: data,
        data: data,
        id: Date.now() + Math.random(),
        ...createTimestamp()
      }
    }))

    setFormData({
      ...formData,
      photocopyDocuments: [...(formData.photocopyDocuments || []), ...newImages]
    })
    if (e.target) e.target.value = ""
  }

  const handleCompanyIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Create compressed images with timestamp
    const newImages = await Promise.all(files.map(async (file) => {
      const data = await compressImage(file)
      return {
        file,
        name: file.name,
        url: data,
        data: data,
        id: Date.now() + Math.random(),
        ...createTimestamp()
      }
    }))

    setFormData({
      ...formData,
      companyIdCards: [...(formData.companyIdCards || []), ...newImages]
    })
    if (e.target) e.target.value = ""
  }

  const removeDocumentationPhoto = (imageId: number | string) => {
    const updatedPhotos = formData.documentationPhotos.filter(
      (img: any) => img.id !== imageId
    )
    setFormData({ ...formData, documentationPhotos: updatedPhotos })
  }

  const removePhotocopyDocument = (imageId: number | string) => {
    const updatedPhotos = formData.photocopyDocuments.filter(
      (img: any) => img.id !== imageId
    )
    setFormData({ ...formData, photocopyDocuments: updatedPhotos })
  }

  const removeCompanyIdCard = (imageId: number | string) => {
    const updatedPhotos = formData.companyIdCards.filter(
      (img: any) => img.id !== imageId
    )
    setFormData({ ...formData, companyIdCards: updatedPhotos })
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Final Documentation</h2>
        <p className="text-slate-600">Finalize inspection with signature and packing list</p>
      </div>

      <div>
        <label className="block text-slate-700 font-semibold mb-3">Inspector Signature/Initials:</label>
        <input
          type="text"
          value={formData.inspectorSignature}
          onChange={(e) => setFormData({ ...formData, inspectorSignature: e.target.value })}
          placeholder="Enter signature or initials"
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Documentation Photos */}
        <div>
          <label className="block text-slate-700 font-semibold mb-3 text-sm">General Documentation:</label>
          <p className="text-slate-600 text-xs mb-3">Signed draft report, packing list, etc.</p>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50">
            <input
              ref={documentationPhotoInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleDocumentationPhotoUpload}
              className="hidden"
            />
            <button
              onClick={() => documentationPhotoInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-full"
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-700 font-medium text-xs">Upload documentation</p>
            </button>
          </div>

          {formData.documentationPhotos && formData.documentationPhotos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {formData.documentationPhotos.map((image: any, index: number) => (
                <div key={image.id || index} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={image.url}
                      alt={`Doc ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDocumentationPhoto(image.id)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Photocopy Documents */}
        <div>
          <label className="block text-slate-700 font-semibold mb-3 text-sm">
            Photocopy Documents: <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-600 text-xs mb-3">Required: Photocopy of documents</p>
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer bg-blue-50/50">
            <input
              ref={photocopyInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotocopyUpload}
              className="hidden"
            />
            <button
              onClick={() => photocopyInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-full"
            >
              <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-slate-700 font-medium text-xs">Upload photocopy</p>
            </button>
          </div>

          {formData.photocopyDocuments && formData.photocopyDocuments.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {formData.photocopyDocuments.map((image: any, index: number) => (
                <div key={image.id || index} className="relative group">
                  <div className="aspect-square bg-blue-100 rounded-lg overflow-hidden border border-blue-200">
                    <img
                      src={image.url}
                      alt={`Photocopy ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhotocopyDocument(image.id)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Company ID Card */}
        <div>
          <label className="block text-slate-700 font-semibold mb-3 text-sm">
            Company ID Card: <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-600 text-xs mb-3">Required: ID identification card</p>
          <div className="border-2 border-dashed border-green-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors cursor-pointer bg-green-50/50">
            <input
              ref={companyIdInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleCompanyIdUpload}
              className="hidden"
            />
            <button
              onClick={() => companyIdInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-full"
            >
              <Upload className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-slate-700 font-medium text-sm">Upload ID card</p>
            </button>
          </div>

          {formData.companyIdCards && formData.companyIdCards.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {formData.companyIdCards.map((image: any, index: number) => (
                <div key={image.id || index} className="relative group">
                  <div className="aspect-square bg-green-100 rounded-lg overflow-hidden border border-green-200">
                    <img
                      src={image.url}
                      alt={`ID ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCompanyIdCard(image.id)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
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