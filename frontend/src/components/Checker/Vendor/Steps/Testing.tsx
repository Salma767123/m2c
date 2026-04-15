"use client"

import { Camera, Upload, X, Image as ImageIcon } from "lucide-react"
import { useRef, useState } from "react"

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

interface TestingProps {
  formData: {
    tests: Array<{
      id: string
      label: string
      detail: string
      pass: boolean
      fail: boolean
      photos: any[]
      rightPhotos: Array<{
        file?: File;
        name: string;
        url: string;
        id: string | number;
        uploadedAt: string;
        uploadedDate: string;
        uploadedTime: string;
      }>
      wrongPhotos: Array<{
        file?: File;
        name: string;
        url: string;
        id: string | number;
        uploadedAt: string;
        uploadedDate: string;
        uploadedTime: string;
      }>
    }>
    testingPhotos: Array<{
      file?: File;
      name: string;
      url: string;
      id: string | number;
      uploadedAt: string;
      uploadedDate: string;
      uploadedTime: string;
    }>
  }
  setFormData: (data: any) => void
}

export default function Testing({ formData, setFormData }: TestingProps) {
  const rightPhotoRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const wrongPhotoRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const generalTestingPhotoInputRef = useRef<HTMLInputElement | null>(null)

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

  const handleGeneralTestingPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Create preview URLs for the new files with timestamp
    const newImages = await Promise.all(
      files.map(async (file) => {
        const data = await compressImage(file)
        return {
          file,
          name: file.name,
          url: data,
          data: data,
          id: Date.now() + Math.random(),
          ...createTimestamp()
        }
      })
    )

    setFormData({
      ...formData,
      testingPhotos: [...(formData.testingPhotos || []), ...newImages]
    })
    if (e.target) e.target.value = ""
  }

  const removeGeneralTestingPhoto = (imageId: string | number) => {
    const updatedPhotos = formData.testingPhotos.filter(
      (img: any) => img.id !== imageId
    )
    setFormData({ ...formData, testingPhotos: updatedPhotos })
  }

  const defaultTests = [
    { id: "dropTestResult", label: "Carton Drop Test", detail: "Action and result views" },
    { id: "colorFastnessDry", label: "Color Fastness (Dry)", detail: "Dry cloth rubbing test" },
    { id: "colorFastnessWet", label: "Color Fastness (Wet)", detail: "Wet cloth rubbing test" },
    { id: "seamStrengthResult", label: "Seam Strength Test", detail: "Pull gauge testing" },
    { id: "smellCheck", label: "Smell Check", detail: "Unusual odor detection" },
  ]

  // Empty array is truthy, so `formData.tests || defaults` fails to fall
  // through when the parent initialises with `tests: []`. Explicitly check
  // length so a fresh form still renders the default test list.
  const tests = (formData.tests && formData.tests.length > 0)
    ? formData.tests
    : defaultTests.map(test => ({
        ...test,
        pass: false,
        fail: false,
        photos: [],
        rightPhotos: [],
        wrongPhotos: []
      }))

  const updateTest = (testId: string, field: string, value: any) => {
    const updatedTests = tests.map(t =>
      t.id === testId ? { ...t, [field]: value } : t
    )
    setFormData({ ...formData, tests: updatedTests })
  }

  const handleRightPhotoUpload = async (testId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    const newImages = await Promise.all(
      files.map(async (file) => {
        const data = await compressImage(file)
        return {
          file,
          name: file.name,
          url: data,
          data: data,
          id: Date.now() + Math.random(),
          ...createTimestamp()
        }
      })
    )

    const test = tests.find(t => t.id === testId)
    if (test) {
      const updatedPhotos = [...(test.rightPhotos || []), ...newImages]
      updateTest(testId, 'rightPhotos', updatedPhotos)
    }
    if (e.target) e.target.value = ""
  }

  const handleWrongPhotoUpload = async (testId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    const newImages = await Promise.all(
      files.map(async (file) => {
        const data = await compressImage(file)
        return {
          file,
          name: file.name,
          url: data,
          data: data,
          id: Date.now() + Math.random(),
          ...createTimestamp()
        }
      })
    )

    const test = tests.find(t => t.id === testId)
    if (test) {
      const updatedPhotos = [...(test.wrongPhotos || []), ...newImages]
      updateTest(testId, 'wrongPhotos', updatedPhotos)
    }
    if (e.target) e.target.value = ""
  }

  const removeRightPhoto = (testId: string, imageId: string | number) => {
    const test = tests.find(t => t.id === testId)
    if (test && test.rightPhotos) {
      const updatedPhotos = test.rightPhotos.filter(
        (img: any) => img.id !== imageId
      )
      updateTest(testId, 'rightPhotos', updatedPhotos)
    }
  }

  const removeWrongPhoto = (testId: string, imageId: string | number) => {
    const test = tests.find(t => t.id === testId)
    if (test && test.wrongPhotos) {
      const updatedPhotos = test.wrongPhotos.filter(
        (img: any) => img.id !== imageId
      )
      updateTest(testId, 'wrongPhotos', updatedPhotos)
    }
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">6. On-site Tests</h2>
        <p className="text-slate-600">Functional tests for durability and color integrity (Section C - Item 6)</p>
        <p className="text-xs text-slate-500 mt-2">
          <span className="text-red-500 mr-0.5" aria-label="required">*</span>
          Mark Pass or Fail on at least one test before moving on.
        </p>
      </div>

      {tests.map((test) => (
        <div key={test.id} className="bg-slate-50/50 rounded-xl p-6 border border-slate-200">
          <div className="mb-4">
            <label className="block text-slate-900 font-semibold mb-2">{test.label}</label>
            <p className="text-slate-600 text-sm mb-4">{test.detail}</p>

            <div className="flex items-center gap-6 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={test.pass}
                  onChange={(e) => {
                    updateTest(test.id, 'pass', e.target.checked)
                    if (e.target.checked && test.fail) {
                      updateTest(test.id, 'fail', false)
                    }
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-emerald-600 cursor-pointer"
                />
                <span className="text-slate-700 font-medium">Pass</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={test.fail}
                  onChange={(e) => {
                    updateTest(test.id, 'fail', e.target.checked)
                    if (e.target.checked && test.pass) {
                      updateTest(test.id, 'pass', false)
                    }
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-red-600 cursor-pointer"
                />
                <span className="text-slate-700 font-medium">Fail</span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-slate-700 font-medium mb-3 text-sm">Test Photos:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-600 font-medium mb-2 text-sm p-2 rounded">✓ Right/Correct Photo</label>
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center hover:border-green-400 transition-colors cursor-pointer bg-green-50">
                    <input
                      ref={(el) => {
                        if (el) rightPhotoRefs.current[test.id] = el
                      }}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleRightPhotoUpload(test.id, e)}
                      className="hidden"
                    />
                    <button
                      onClick={() => rightPhotoRefs.current[test.id]?.click()}
                      className="flex flex-col items-center justify-center w-full"
                    >
                      <Upload className="w-6 h-6 text-green-400 mb-2" />
                      <p className="text-slate-600 text-sm font-medium">Upload right photos</p>
                    </button>
                  </div>

                  {test.rightPhotos && test.rightPhotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {test.rightPhotos.map((image: any, index: number) => (
                        <div key={image.id || index} className="relative group">
                          <img
                            src={image.url}
                            alt={`Right photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-green-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeRightPhoto(test.id, image.id)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-2 text-sm p-2 rounded">✗ Wrong/Incorrect Photo</label>
                  <div className="border-2 border-dashed border-red-300 bg-red-50 rounded-lg p-4 text-center hover:border-red-400 transition-colors cursor-pointer">
                    <input
                      ref={(el) => {
                        if (el) wrongPhotoRefs.current[test.id] = el
                      }}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleWrongPhotoUpload(test.id, e)}
                      className="hidden"
                    />
                    <button
                      onClick={() => wrongPhotoRefs.current[test.id]?.click()}
                      className="flex flex-col items-center justify-center w-full"
                    >
                      <Upload className="w-6 h-6 text-red-400 mb-2" />
                      <p className="text-slate-600 text-sm font-medium">Upload wrong photos</p>
                    </button>
                  </div>

                  {test.wrongPhotos && test.wrongPhotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {test.wrongPhotos.map((image: any, index: number) => (
                        <div key={image.id || index} className="relative group">
                          <img
                            src={image.url}
                            alt={`Wrong photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-red-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeWrongPhoto(test.id, image.id)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
          </div>
        </div>
      ))}

      <div>
        <label className="block text-slate-700 font-semibold mb-3">General Testing Photos:</label>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50">
          <input
            ref={generalTestingPhotoInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleGeneralTestingPhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => generalTestingPhotoInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full"
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Upload test photos</p>
          </button>
        </div>

        {formData.testingPhotos && formData.testingPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
            {formData.testingPhotos.map((image: any, index: number) => (
              <div key={image.id || index} className="relative group">
                <img
                  src={image.url}
                  alt={`Testing photo ${index + 1}`}
                  className="w-full h-28 object-cover rounded-xl border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => removeGeneralTestingPhoto(image.id)}
                  className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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