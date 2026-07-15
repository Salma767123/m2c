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
  errors?: Record<string, string>
}

export default function Testing({ formData, setFormData, errors = {} }: TestingProps) {
  const rightPhotoRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const wrongPhotoRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const generalTestingPhotoInputRef = useRef<HTMLInputElement | null>(null)

  const [cropQueue, setCropQueue] = useState<File[]>([])
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState('')
  const cropTargetRef = useRef<{ type: 'general' | 'right' | 'wrong'; testId?: string } | null>(null)

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })

  const startCropQueue = (files: File[], target: { type: 'general' | 'right' | 'wrong'; testId?: string }) => {
    if (files.length === 0) return
    cropTargetRef.current = target
    setCropQueue(files.slice(1))
    setCropFileName(files[0].name)
    setCropSrc(URL.createObjectURL(files[0]))
  }

  const advanceCropQueue = (cur: string | null) => {
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

  const handleGeneralTestingPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (e.target) e.target.value = ""
    startCropQueue(files, { type: 'general' })
  }

  const removeGeneralTestingPhoto = (imageId: string | number) => {
    const updatedPhotos = formData.testingPhotos.filter(
      (img: any) => img.id !== imageId
    )
    setFormData((prev: any) => ({ ...prev, testingPhotos: updatedPhotos }))
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
    setFormData((prev: any) => ({ ...prev, tests: updatedTests }))
  }

  // Toggle Pass/Fail in a single update so the two stay mutually exclusive and
  // the now-disabled side's photos are cleared. Selecting Pass enables only the
  // Right photo upload (and clears any Wrong photos); selecting Fail enables
  // only the Wrong photo upload (and clears any Right photos).
  const handleResultToggle = (testId: string, field: "pass" | "fail", checked: boolean) => {
    const updatedTests = tests.map(t => {
      if (t.id !== testId) return t
      if (field === "pass") {
        return checked
          ? { ...t, pass: true, fail: false, wrongPhotos: [] }
          : { ...t, pass: false }
      }
      return checked
        ? { ...t, fail: true, pass: false, rightPhotos: [] }
        : { ...t, fail: false }
    })
    setFormData((prev: any) => ({ ...prev, tests: updatedTests }))
  }

  const handleRightPhotoUpload = (testId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (e.target) e.target.value = ""
    startCropQueue(files, { type: 'right', testId })
  }

  const handleWrongPhotoUpload = (testId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (e.target) e.target.value = ""
    startCropQueue(files, { type: 'wrong', testId })
  }

  const onTestingCropped = async (croppedFile: File) => {
    const dataUrl = await readAsDataUrl(croppedFile)
    const newPhoto = {
      file: croppedFile,
      name: cropFileName,
      url: dataUrl,
      data: dataUrl,
      id: Date.now() + Math.random(),
      ...createTimestamp(),
    }
    const target = cropTargetRef.current
    if (target?.type === 'general') {
      setFormData((prev: any) => ({ ...prev, testingPhotos: [...(prev.testingPhotos || []), newPhoto] }))
    } else if (target?.type === 'right' && target.testId) {
      const updatedTests = tests.map(t =>
        t.id === target.testId
          ? { ...t, rightPhotos: [...(t.rightPhotos || []), newPhoto] }
          : t
      )
      setFormData((prev: any) => ({ ...prev, tests: updatedTests }))
    } else if (target?.type === 'wrong' && target.testId) {
      const updatedTests = tests.map(t =>
        t.id === target.testId
          ? { ...t, wrongPhotos: [...(t.wrongPhotos || []), newPhoto] }
          : t
      )
      setFormData((prev: any) => ({ ...prev, tests: updatedTests }))
    }
    advanceCropQueue(cropSrc)
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

  // A test is incomplete when no Pass/Fail decision is made, or the chosen
  // outcome is missing its required photo. Only highlighted once the parent
  // surfaces a testing error so the form stays calm during normal entry.
  const testHasError = (t: any): boolean => {
    if (!errors.tests) return false
    const decided = t?.pass === true || t?.fail === true
    if (!decided) return true
    if (t.pass && (!Array.isArray(t.rightPhotos) || t.rightPhotos.length === 0)) return true
    if (t.fail && (!Array.isArray(t.wrongPhotos) || t.wrongPhotos.length === 0)) return true
    return false
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">6. On-site Tests</h2>
        <p className="text-slate-600">Functional tests for durability and color integrity (Section C - Item 6)</p>
        <p className="text-xs text-slate-500 mt-2">
          <span className="text-red-500 mr-0.5" aria-label="required">*</span>
          Mark Pass or Fail on every test. Pass requires a Right photo, Fail requires a Wrong photo.
        </p>
      </div>

      {errors.tests && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.tests}
        </div>
      )}

      {tests.map((test) => (
        <div key={test.id} className={`rounded-xl p-6 border ${testHasError(test) ? 'bg-red-50/40 border-red-300' : 'bg-slate-50/50 border-slate-200'}`}>
          <div className="mb-4">
            <label className="block text-slate-900 font-semibold mb-2">{test.label}<span className="text-red-500 ml-0.5" aria-label="required">*</span></label>
            <p className="text-slate-600 text-sm mb-4">{test.detail}</p>

            <div className="flex items-center gap-6 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={test.pass}
                  onChange={(e) => handleResultToggle(test.id, 'pass', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-emerald-600 cursor-pointer"
                />
                <span className="text-slate-700 font-medium">Pass</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={test.fail}
                  onChange={(e) => handleResultToggle(test.id, 'fail', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-red-600 cursor-pointer"
                />
                <span className="text-slate-700 font-medium">Fail</span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-slate-700 font-medium mb-3 text-sm">Test Photos:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-600 font-medium mb-2 text-sm p-2 rounded">✓ Right/Correct Photo{test.pass && <span className="text-red-500 ml-0.5" aria-label="required">*</span>}</label>
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${test.pass
                    ? "border-green-300 hover:border-green-400 cursor-pointer bg-green-50"
                    : "border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed"
                    }`}>
                    <input
                      ref={(el) => {
                        if (el) rightPhotoRefs.current[test.id] = el
                      }}
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={!test.pass}
                      onChange={(e) => handleRightPhotoUpload(test.id, e)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={!test.pass}
                      onClick={() => test.pass && rightPhotoRefs.current[test.id]?.click()}
                      className="flex flex-col items-center justify-center w-full disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-green-400/60 rounded-md"
                    >
                      <Upload className={`w-6 h-6 mb-2 ${test.pass ? "text-green-400" : "text-slate-300"}`} />
                      <p className={`text-sm font-medium ${test.pass ? "text-slate-600" : "text-slate-400"}`}>
                        {test.pass ? "Upload right photos" : 'Select "Pass" to enable'}
                      </p>
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
                  <label className="block text-slate-600 font-medium mb-2 text-sm p-2 rounded">✗ Wrong/Incorrect Photo{test.fail && <span className="text-red-500 ml-0.5" aria-label="required">*</span>}</label>
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${test.fail
                    ? "border-red-300 bg-red-50 hover:border-red-400 cursor-pointer"
                    : "border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed"
                    }`}>
                    <input
                      ref={(el) => {
                        if (el) wrongPhotoRefs.current[test.id] = el
                      }}
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={!test.fail}
                      onChange={(e) => handleWrongPhotoUpload(test.id, e)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={!test.fail}
                      onClick={() => test.fail && wrongPhotoRefs.current[test.id]?.click()}
                      className="flex flex-col items-center justify-center w-full disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 rounded-md"
                    >
                      <Upload className={`w-6 h-6 mb-2 ${test.fail ? "text-red-400" : "text-slate-300"}`} />
                      <p className={`text-sm font-medium ${test.fail ? "text-slate-600" : "text-slate-400"}`}>
                        {test.fail ? "Upload wrong photos" : 'Select "Fail" to enable'}
                      </p>
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
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-brand-400 transition-colors cursor-pointer bg-slate-50/50">
          <input
            ref={generalTestingPhotoInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleGeneralTestingPhotoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => generalTestingPhotoInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-xl"
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
      <ImageCropModal
        src={cropSrc}
        fileName={cropFileName}
        title="Crop Test Photo"
        cropShape="rect"
        showGrid={true}
        onCancel={() => {
          if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
          setCropQueue([])
          setCropSrc(null)
          setCropFileName('')
          cropTargetRef.current = null
        }}
        onCropped={onTestingCropped}
      />
    </div>
  )
}