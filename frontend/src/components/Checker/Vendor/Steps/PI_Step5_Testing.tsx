'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Upload,
  X,
  Package,
  Box,
  Ruler,
  Zap,
  Camera,
  Plus,
  Trash2,
} from 'lucide-react'
import type { TestGroup, TestItem } from './PI_data'
import { ADDITIONAL_EVIDENCE_DEFS } from './PI_data'
import ImageCropModal from '@/components/UI/ImageCropModal'
import { notifyUploadSuccess } from '@/lib/toast-utils'

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

// ── Group icon map ───────────────────────────────────────────────────────────
const GROUP_ICONS: Record<string, React.ReactNode> = {
  packagingVerification: <Package className="w-4 h-4" />,
  productVerification: <Box className="w-4 h-4" />,
  measurementInspection: <Ruler className="w-4 h-4" />,
  functionalTests: <Zap className="w-4 h-4" />,
}

// ── Compact photo strip ──────────────────────────────────────────────────────
function PhotoStrip({
  photos,
  onAdd,
  onRemove,
  label,
  accent,
}: {
  photos: any[]
  onAdd: (photo: { name: string; data: string }) => void
  onRemove: (i: number) => void
  label: string
  accent: 'emerald' | 'red' | 'brand'
}) {
  const [cropQueue, setCropQueue] = useState<File[]>([])
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState('')

  const colorMap = {
    emerald: 'border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50/40',
    red: 'border-red-300 hover:border-red-400 hover:bg-red-50/40',
    brand: 'border-brand-300 hover:border-brand-400 hover:bg-brand-50/40',
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setCropQueue(files.slice(1))
    setCropFileName(files[0].name)
    setCropSrc(URL.createObjectURL(files[0]))
  }

  const onCropped = async (croppedFile: File) => {
    const data = await readAsDataUrl(croppedFile)
    onAdd({ name: cropFileName, data })
    notifyUploadSuccess(label.charAt(0).toUpperCase() + label.slice(1), cropFileName)
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

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        {photos.map((ph, i) => (
          <div key={i} className="relative group w-14 h-14 flex-shrink-0">
            <img
              src={ph.data || ph.url}
              alt={ph.name || `photo-${i}`}
              className="w-full h-full object-cover rounded-lg border border-slate-200"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
        {photos.length === 0 && (
          <label
            className={`w-14 h-14 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer flex-shrink-0 transition-colors ${colorMap[accent]}`}
            title={`Upload ${label}`}
          >
            <Upload className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] text-slate-400 mt-0.5">Add</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
            />
          </label>
        )}
      </div>
      <ImageCropModal
        src={cropSrc}
        fileName={cropFileName}
        title={`Crop ${label}`}
        cropShape="rect"
        showGrid={true}
        onCancel={() => {
          if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
          setCropQueue([])
          setCropSrc(null)
          setCropFileName('')
        }}
        onCropped={onCropped}
      />
    </>
  )
}

// ── Single test row ──────────────────────────────────────────────────────────
function TestRow({
  test,
  onChange,
  invalid = false,
}: {
  test: TestItem
  onChange: (patch: Partial<TestItem>) => void
  invalid?: boolean
}) {
  const addRightPhotos = (photo: { name: string; data: string }) => {
    onChange({ rightPhotos: [...test.rightPhotos, photo] })
  }
  const addWrongPhotos = (photo: { name: string; data: string }) => {
    onChange({ wrongPhotos: [...test.wrongPhotos, photo] })
  }
  const removeRight = (i: number) => {
    const next = [...test.rightPhotos]; next.splice(i, 1)
    onChange({ rightPhotos: next })
  }
  const removeWrong = (i: number) => {
    const next = [...test.wrongPhotos]; next.splice(i, 1)
    onChange({ wrongPhotos: next })
  }

  const togglePass = () => {
    if (test.pass) {
      onChange({ pass: null })
    } else {
      onChange({ pass: true, fail: null })
    }
  }
  const toggleFail = () => {
    if (test.fail) {
      onChange({ fail: null })
    } else {
      onChange({ fail: true, pass: null })
    }
  }

  return (
    <div
      data-invalid={invalid ? 'true' : undefined}
      className={`scroll-mt-24 border rounded-xl overflow-hidden transition-colors ${
        invalid ? 'border-red-500 bg-red-50/50 ring-2 ring-red-400'
          : test.pass ? 'border-emerald-200 bg-emerald-50/20'
          : test.fail ? 'border-red-200 bg-red-50/20'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Row header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <p className="text-sm font-medium text-slate-800 flex-1 leading-snug">{test.label}</p>

        {/* Pass / Fail */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={togglePass}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
              test.pass
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pass
          </button>
          <button
            type="button"
            onClick={toggleFail}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
              test.fail
                ? 'bg-red-500 border-red-500 text-white shadow-sm'
                : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Fail
          </button>
        </div>
      </div>

      {/* Photo evidence — only when Pass or Fail is selected */}
      {(test.pass || test.fail) && (
        <div className="px-4 pb-3 space-y-2 border-t border-slate-100 pt-3">
          {test.pass && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-1">
                Correct / Right Photo
              </p>
              <PhotoStrip
                photos={test.rightPhotos}
                onAdd={addRightPhotos}
                onRemove={removeRight}
                label="right photo"
                accent="emerald"
              />
            </div>
          )}
          {test.fail && (
            <>
              <div>
                <p className="text-xs font-semibold text-red-700 mb-1">
                  Wrong / Incorrect Photo
                </p>
                <PhotoStrip
                  photos={test.wrongPhotos}
                  onAdd={addWrongPhotos}
                  onRemove={removeWrong}
                  label="wrong photo"
                  accent="red"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks</label>
                <textarea
                  value={test.remarks}
                  onChange={(e) => onChange({ remarks: e.target.value })}
                  placeholder="Describe the failure…"
                  rows={2}
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-200 resize-none"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Custom "Others" test row ─────────────────────────────────────────────────
function OtherTestRow({
  test,
  onChange,
  onRemove,
  invalid = false,
}: {
  test: TestItem
  onChange: (patch: Partial<TestItem>) => void
  onRemove: () => void
  invalid?: boolean
}) {
  const togglePass = () => onChange({ pass: test.pass ? null : true, fail: null })
  const toggleFail = () => onChange({ fail: test.fail ? null : true, pass: null })

  return (
    <div
      data-invalid={invalid ? 'true' : undefined}
      className={`scroll-mt-24 border rounded-xl overflow-hidden transition-colors ${
        invalid ? 'border-red-500 bg-red-50/50 ring-2 ring-red-400'
          : test.pass ? 'border-emerald-200 bg-emerald-50/20'
          : test.fail ? 'border-red-200 bg-red-50/20'
          : 'border-brand-200 bg-brand-50/10'
      }`}
    >
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-brand-600 uppercase tracking-wide">Custom Test</span>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Test Subject</label>
            <input
              type="text"
              value={test.subject || ''}
              onChange={(e) => onChange({ subject: e.target.value })}
              placeholder="e.g. Stitching"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Test Name</label>
            <input
              type="text"
              value={test.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="e.g. Seam integrity"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePass}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
              test.pass
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Pass
          </button>
          <button
            type="button"
            onClick={toggleFail}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
              test.fail
                ? 'bg-red-500 border-red-500 text-white shadow-sm'
                : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" /> Fail
          </button>
        </div>
      </div>
      {(test.pass || test.fail) && (
        <div className="px-4 pb-3 space-y-2 border-t border-slate-100 pt-3">
          {test.pass && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-1">Correct / Right Photo</p>
              <PhotoStrip
                photos={test.rightPhotos}
                onAdd={(photo) => onChange({ rightPhotos: [photo] })}
                onRemove={() => onChange({ rightPhotos: [] })}
                label="right photo"
                accent="emerald"
              />
            </div>
          )}
          {test.fail && (
            <>
              <div>
                <p className="text-xs font-semibold text-red-700 mb-1">Wrong / Incorrect Photo</p>
                <PhotoStrip
                  photos={test.wrongPhotos}
                  onAdd={(photo) => onChange({ wrongPhotos: [photo] })}
                  onRemove={() => onChange({ wrongPhotos: [] })}
                  label="wrong photo"
                  accent="red"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks</label>
                <textarea
                  value={test.remarks}
                  onChange={(e) => onChange({ remarks: e.target.value })}
                  placeholder="Describe the failure…"
                  rows={2}
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-200 resize-none"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Collapsible group ────────────────────────────────────────────────────────
function TestGroupCard({
  group,
  invalidTestId = null,
  onToggleCollapse,
  onTestChange,
  onAddOther,
  onRemoveOther,
}: {
  group: TestGroup
  invalidTestId?: string | null
  onToggleCollapse: () => void
  onTestChange: (testId: string, patch: Partial<TestItem>) => void
  onAddOther: () => void
  onRemoveOther: (testId: string) => void
}) {
  const regularTests = group.tests.filter((t) => !t.isOther)
  const otherTests = group.tests.filter((t) => t.isOther)
  const passed = group.tests.filter((t) => t.pass).length
  const failed = group.tests.filter((t) => t.fail).length
  const total = group.tests.length
  const done = passed + failed
  // Force this group open when it holds the failing test, so the highlighted
  // row is actually in the DOM for the scroll-to-error to land on.
  const holdsInvalid = !!invalidTestId && group.tests.some((t) => t.id === invalidTestId)
  const showTests = !group.collapsed || holdsInvalid

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      {/* Group header */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full px-5 py-4 flex items-center gap-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-brand-500">{GROUP_ICONS[group.id]}</span>
        <span className="text-sm font-bold text-slate-800 flex-1">{group.label}</span>
        <div className="flex items-center gap-3 text-xs">
          {done > 0 && (
            <div className="flex items-center gap-2">
              {passed > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> {passed}
                </span>
              )}
              {failed > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
                  <XCircle className="w-3 h-3" /> {failed}
                </span>
              )}
            </div>
          )}
          <span className="text-slate-400 font-medium">{done}/{total}</span>
          {group.collapsed
            ? <ChevronRight className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />
          }
        </div>
      </button>

      {/* Tests */}
      {showTests && (
        <div className="p-4 space-y-3">
          {regularTests.map((test) => (
            <TestRow
              key={test.id}
              test={test}
              invalid={test.id === invalidTestId}
              onChange={(patch) => onTestChange(test.id, patch)}
            />
          ))}
          {otherTests.map((test) => (
            <OtherTestRow
              key={test.id}
              test={test}
              invalid={test.id === invalidTestId}
              onChange={(patch) => onTestChange(test.id, patch)}
              onRemove={() => onRemoveOther(test.id)}
            />
          ))}
          <button
            type="button"
            onClick={onAddOther}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-brand-200 text-brand-600 hover:bg-brand-50 hover:border-brand-400 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Others
          </button>
        </div>
      )}
    </div>
  )
}

// ── Additional Evidence ───────────────────────────────────────────────────────
function EvidenceCard({
  id,
  label,
  photos,
  onAdd,
  onRemove,
}: {
  id: string
  label: string
  photos: any[]
  onAdd: (photo: { name: string; data: string }) => void
  onRemove: (i: number) => void
}) {
  const [cropQueue, setCropQueue] = useState<File[]>([])
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setCropQueue(files.slice(1))
    setCropFileName(files[0].name)
    setCropSrc(URL.createObjectURL(files[0]))
  }

  const onCropped = async (croppedFile: File) => {
    const data = await readAsDataUrl(croppedFile)
    onAdd({ name: cropFileName, data })
    notifyUploadSuccess(label, cropFileName)
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

  return (
    <>
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
          <Camera className="w-4 h-4 text-brand-500" />
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <span className="ml-auto text-xs text-slate-500">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {photos.map((ph, i) => (
              <div key={i} className="relative group w-20 h-20">
                <img
                  src={ph.data || ph.url}
                  alt={ph.name || `${label} ${i + 1}`}
                  className="w-full h-full object-cover rounded-xl border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            {photos.length === 0 && (
              <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-400 mt-1">Add</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleInputChange}
                />
              </label>
            )}
          </div>
        </div>
      </div>
      <ImageCropModal
        src={cropSrc}
        fileName={cropFileName}
        title={`Crop ${label}`}
        cropShape="rect"
        showGrid={true}
        onCancel={() => {
          if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
          setCropQueue([])
          setCropSrc(null)
          setCropFileName('')
        }}
        onCropped={onCropped}
      />
    </>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
interface Props {
  formData: {
    testGroups: TestGroup[]
    additionalEvidence: Record<string, any[]>
  }
  setFormData: (d: any) => void
  errors?: Record<string, string>
}

export default function PI_Step5_Testing({ formData, setFormData, errors = {} }: Props) {
  const groups: TestGroup[] = formData.testGroups || []
  const evidence: Record<string, any[]> = formData.additionalEvidence || {}

  const toggleCollapse = (groupId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      testGroups: groups.map((g) =>
        g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
      ),
    }))
  }

  const updateTest = (groupId: string, testId: string, patch: Partial<TestItem>) => {
    setFormData((prev: any) => ({
      ...prev,
      testGroups: groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              tests: g.tests.map((t) => (t.id === testId ? { ...t, ...patch } : t)),
            }
          : g
      ),
    }))
  }

  const addOtherTest = (groupId: string) => {
    const newItem: TestItem = {
      id: `other_${groupId}_${Date.now()}`,
      label: '',
      pass: null,
      fail: null,
      remarks: '',
      rightPhotos: [],
      wrongPhotos: [],
      isOther: true,
      subject: '',
    }
    setFormData((prev: any) => ({
      ...prev,
      testGroups: groups.map((g) =>
        g.id === groupId ? { ...g, tests: [...g.tests, newItem] } : g
      ),
    }))
  }

  const removeOtherTest = (groupId: string, testId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      testGroups: groups.map((g) =>
        g.id === groupId ? { ...g, tests: g.tests.filter((t) => t.id !== testId) } : g
      ),
    }))
  }

  const addEvidencePhoto = (id: string, photo: { name: string; data: string }) => {
    setFormData((prev: any) => ({
      ...prev,
      additionalEvidence: {
        ...evidence,
        [id]: [...(evidence[id] || []), photo],
      },
    }))
  }

  const removeEvidence = (id: string, i: number) => {
    const next = [...(evidence[id] || [])]
    next.splice(i, 1)
    setFormData((prev: any) => ({
      ...prev,
      additionalEvidence: { ...evidence, [id]: next },
    }))
  }

  // Summary counts
  const allTests = groups.flatMap((g) => g.tests)
  const totalPass = allTests.filter((t) => t.pass).length
  const totalFail = allTests.filter((t) => t.fail).length
  const totalDone = totalPass + totalFail

  // Mirror the Next-gate validation so, when blocked, we can point at (and
  // highlight) the exact failing test — the form scrolls to data-invalid.
  const firstInvalidTestId: string | null = (() => {
    if (!errors.testGroups) return null
    const blank = (s: any) => !s || !String(s).trim()
    for (const g of groups) {
      for (const t of (g.tests || [])) {
        if (t.isOther && (blank(t.subject) || blank(t.label))) return t.id
        if (t.pass !== true && t.fail !== true) return t.id
        if (t.pass === true && (!Array.isArray(t.rightPhotos) || t.rightPhotos.length === 0)) return t.id
        if (t.fail === true && (!Array.isArray(t.wrongPhotos) || t.wrongPhotos.length === 0)) return t.id
      }
    }
    return null
  })()

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Testing</h2>
        <p className="text-slate-500 text-sm">
          Record Pass / Fail for each test. On Fail: add a wrong photo and remarks. On Pass: add a correct photo.
        </p>
      </div>

      {errors.testGroups && (
        <div className="scroll-mt-24 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-700">{errors.testGroups}</p>
        </div>
      )}

      {/* Summary strip */}
      {totalDone > 0 && (
        <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
          <span className="text-slate-600 font-medium">{totalDone} / {allTests.length} tests completed</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> {totalPass} Pass
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full font-semibold text-xs">
            <XCircle className="w-3.5 h-3.5" /> {totalFail} Fail
          </span>
        </div>
      )}

      {/* Test groups */}
      <div className="space-y-4">
        {groups.map((group) => (
          <TestGroupCard
            key={group.id}
            group={group}
            invalidTestId={firstInvalidTestId}
            onToggleCollapse={() => toggleCollapse(group.id)}
            onTestChange={(testId, patch) => updateTest(group.id, testId, patch)}
            onAddOther={() => addOtherTest(group.id)}
            onRemoveOther={(testId) => removeOtherTest(group.id, testId)}
          />
        ))}
      </div>

      {/* Additional Evidence */}
      <div>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-5">
          <Camera className="w-4 h-4 text-brand-500" />
          <h3 className="text-base font-bold text-slate-800">Additional Evidence</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ADDITIONAL_EVIDENCE_DEFS.map((def) => (
            <EvidenceCard
              key={def.id}
              id={def.id}
              label={def.label}
              photos={evidence[def.id] || []}
              onAdd={(photo) => addEvidencePhoto(def.id, photo)}
              onRemove={(i) => removeEvidence(def.id, i)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
