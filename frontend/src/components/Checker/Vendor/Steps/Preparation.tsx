"use client"

import { Camera, ChevronDown, Upload, X, Image as ImageIcon } from "lucide-react"
import { useState, useRef, useEffect } from "react"

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


interface PreparationProps {
  formData: {
    items: Array<{
      id: number
      itemName: string
      itemDescription: string
      totalQuantity: number
      inspectionQuantity: number
      status: string
    }>
    warehousePhotoEvidences: any[]
  }
  setFormData: (data: any) => void
}

export default function Preparation({ formData, setFormData }: PreparationProps) {
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: number]: boolean }>({})
  const dropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const warehousePhotoInputRef = useRef<HTMLInputElement | null>(null)

  const handleWarehousePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        warehousePhotoEvidences: [...(formData.warehousePhotoEvidences || []), ...newEntries]
      })
    }
    // Reset input
    if (e.target) e.target.value = ""
  }

  const removeWarehousePhoto = (photoIndex: number) => {
    const updatedPhotos = formData.warehousePhotoEvidences.filter((_, i) => i !== photoIndex)
    setFormData({ ...formData, warehousePhotoEvidences: updatedPhotos })
  }

  const statusOptions = ["Pending", "Ready", "In Progress", "Completed"]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      let shouldClose = true
      Object.values(dropdownRefs.current).forEach((ref) => {
        if (ref && ref.contains(event.target as Node)) {
          shouldClose = false
        }
      })
      if (shouldClose) {
        setOpenDropdowns({})
      }
    }

    if (Object.values(openDropdowns).some(Boolean)) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [openDropdowns])


  const updateItem = (id: number, field: string, value: string | number) => {
    setFormData({
      ...formData,
      items: formData.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      "Pending": "bg-amber-100 text-amber-800 border-amber-200",
      "Ready": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
      "Completed": "bg-slate-100 text-slate-800 border-slate-200",
    }
    return colors[status as keyof typeof colors] || colors["Pending"]
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">B. Item Quantities & Readiness</h2>
        <p className="text-slate-600">
          Review the assigned items to inspect
        </p>
      </div>

      {/* Items Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Order Items</h3>
        </div>

        {formData.items.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            <p className="text-slate-600">No items assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-slate-900">Item #{index + 1}</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-2 text-sm">Item Name:</label>
                    <input
                      type="text"
                      value={item.itemName}
                      readOnly
                      placeholder="Enter item name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-medium mb-2 text-sm">Item Description:</label>
                    <input
                      type="text"
                      value={item.itemDescription}
                      readOnly
                      placeholder="Enter item description"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-2 text-sm">Total Quantity:</label>
                    <input
                      type="number"
                      value={item.totalQuantity}
                      onChange={(e) => updateItem(item.id, "totalQuantity", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-2 text-sm">Inspection Quantity:</label>
                    <input
                      type="number"
                      value={item.inspectionQuantity}
                      onChange={(e) => updateItem(item.id, "inspectionQuantity", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-2 text-sm">Status:</label>
                    <div
                      ref={(el) => {
                        if (el) dropdownRefs.current[item.id] = el
                      }}
                      className="relative"
                    >
                      <button
                        onClick={() =>
                          setOpenDropdowns({
                            ...openDropdowns,
                            [item.id]: !openDropdowns[item.id]
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-left flex items-center justify-between hover:border-slate-400"
                      >
                        <span className="text-slate-900">{item.status}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${openDropdowns[item.id] ? "transform rotate-180" : ""
                            }`}
                        />
                      </button>
                      {openDropdowns[item.id] && (
                        <div className="absolute z-10 w-full mt-2 bg-white border border-slate-300 rounded-lg shadow-lg">
                          <div className="py-1">
                            {statusOptions.map((status) => (
                              <button
                                key={status}
                                onClick={() => {
                                  updateItem(item.id, "status", status)
                                  setOpenDropdowns({ ...openDropdowns, [item.id]: false })
                                }}
                                className={`block w-full px-4 py-2 text-sm text-left transition-colors duration-150 ${item.status === status
                                  ? "bg-blue-50 text-blue-600 font-medium border-l-2 border-blue-600"
                                  : "text-slate-700 hover:bg-slate-50"
                                  }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Evidence */}
      <div>
        <label className="block text-slate-700 font-semibold mb-3">Photo Evidence:</label>
        <p className="text-slate-600 text-sm mb-4">Warehouse, cartons, factory overview, name board</p>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50">
          <input
            ref={warehousePhotoInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleWarehousePhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => warehousePhotoInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full"
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Upload warehouse photos</p>
            <p className="text-slate-500 text-sm mt-1">Drag & drop or click to browse</p>
          </button>
        </div>

        {/* Uploaded Photos List */}
        {formData.warehousePhotoEvidences && formData.warehousePhotoEvidences.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
            {formData.warehousePhotoEvidences.map((photo: any, index: number) => (
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
                  onClick={() => removeWarehousePhoto(index)}
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