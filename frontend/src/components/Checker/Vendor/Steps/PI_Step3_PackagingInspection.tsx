'use client'

import { useState } from 'react'
import { Package, Upload, X, CheckCircle2, XCircle } from 'lucide-react'
import type { PackagingItem } from './PI_data'
import ImageCropModal from '@/components/UI/ImageCropModal'

// ── Remark code colours ───────────────────────────────────────────────────────
// 1-5 → REJECTED (red)   6-7 → RE-INSPECTION (amber)   8-10 → PASS (emerald)
function codeClass(code: number, selected: boolean) {
  const base = 'w-9 h-9 rounded-lg text-sm font-bold border-2 flex items-center justify-center transition-all cursor-pointer select-none'
  if (selected) {
    if (code <= 5) return `${base} bg-red-600 border-red-600 text-white shadow`
    if (code <= 7) return `${base} bg-amber-500 border-amber-500 text-white shadow`
    return `${base} bg-emerald-600 border-emerald-600 text-white shadow`
  }
  if (code <= 5) return `${base} border-red-200 text-red-500 bg-red-50 hover:bg-red-100`
  if (code <= 7) return `${base} border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100`
  return `${base} border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100`
}

function codeBadge(code: number) {
  if (code <= 5) return 'bg-red-100 text-red-700 border-red-200'
  if (code <= 7) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

const CODE_LABELS: Record<number, string> = {
  1: 'Critical Defect',
  2: 'Major Defect',
  3: 'Functional Fail',
  4: 'Safety Issue',
  5: 'Non-Conformance',
  6: 'Minor Issue',
  7: 'Re-inspection',
  8: 'Acceptable',
  9: 'Good',
  10: 'Excellent',
}

// ── Image compressor ─────────────────────────────────────────────────────────
async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, maxWidth / img.width)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  formData: {
    packagingItems: PackagingItem[]
    packagingPhotos: any[]
  }
  setFormData: (d: any) => void
  errors?: Record<string, string>
}

// ── Single packaging row ──────────────────────────────────────────────────────
function PackagingRow({
  item,
  onChange,
}: {
  item: PackagingItem
  onChange: (patch: Partial<PackagingItem>) => void
}) {
  const needsRemarks = item.remarkCode !== null && item.remarkCode <= 7

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-colors ${
        item.verified === true
          ? 'border-emerald-200 bg-emerald-50/20'
          : item.verified === false
          ? 'border-slate-200 bg-white'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900 leading-snug">{item.label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
      </div>

      {/* Yes / No */}
      <div className="px-5 py-4 flex items-center gap-6 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mr-2">Inspected?</p>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name={`pkg_${item.id}`}
            checked={item.verified === true}
            onChange={() => onChange({ verified: true, remarkCode: item.remarkCode ?? null })}
            className="w-4 h-4 accent-emerald-600"
          />
          <span className={`text-sm font-semibold flex items-center gap-1.5 ${item.verified === true ? 'text-emerald-700' : 'text-slate-600'}`}>
            <CheckCircle2 className="w-4 h-4" /> Yes
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name={`pkg_${item.id}`}
            checked={item.verified === false}
            onChange={() => onChange({ verified: false, remarkCode: null, remarks: '' })}
            className="w-4 h-4 accent-slate-400"
          />
          <span className={`text-sm font-semibold flex items-center gap-1.5 ${item.verified === false ? 'text-slate-700' : 'text-slate-500'}`}>
            <XCircle className="w-4 h-4" /> No
          </span>
        </label>
      </div>

      {/* Remark code picker — visible only when Yes */}
      {item.verified === true && (
        <div className="px-5 py-4 border-b border-slate-100 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Remark Code</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onChange({ remarkCode: item.remarkCode === code ? null : code, remarks: '' })}
                title={CODE_LABELS[code]}
                className={codeClass(code, item.remarkCode === code)}
              >
                {code}
              </button>
            ))}
          </div>

          {item.remarkCode !== null && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${codeBadge(item.remarkCode)}`}>
              Code {item.remarkCode} — {CODE_LABELS[item.remarkCode]}
              {item.remarkCode <= 7 && <span className="font-normal">(Remarks required)</span>}
            </div>
          )}

          {/* Remarks field — mandatory for codes 1-7 */}
          {needsRemarks && (
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">
                Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                value={item.remarks}
                onChange={(e) => onChange({ remarks: e.target.value })}
                placeholder="Describe the issue found…"
                rows={3}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200/60 resize-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PI_Step3_PackagingInspection({ formData, setFormData, errors = {} }: Props) {
  const items: PackagingItem[] = formData.packagingItems || []
  const [cropQueue, setCropQueue] = useState<File[]>([])
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState('')

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })

  const updateItem = (id: string, patch: Partial<PackagingItem>) => {
    setFormData({
      ...formData,
      packagingItems: items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    })
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setCropQueue(files.slice(1))
    setCropFileName(files[0].name)
    setCropSrc(URL.createObjectURL(files[0]))
  }

  const onPackagingCropped = async (croppedFile: File) => {
    const data = await readAsDataUrl(croppedFile)
    setFormData({
      ...formData,
      packagingPhotos: [...(formData.packagingPhotos || []), { name: cropFileName, data }],
    })
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

  const removePhoto = (idx: number) => {
    const next = [...(formData.packagingPhotos || [])]
    next.splice(idx, 1)
    setFormData({ ...formData, packagingPhotos: next })
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Packaging Inspection</h2>
        <p className="text-slate-500 text-sm">
          For each packaging item, mark whether it was inspected. If yes, select a remark code —
          codes 1–7 require remarks describing the findings.
        </p>
      </div>

      {errors.packagingItems && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-700">{errors.packagingItems}</p>
        </div>
      )}

      {/* Remark code legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="font-semibold text-red-700">1–5 Rejected (remarks required)</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="font-semibold text-amber-700">6–7 Re-inspection (remarks required)</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-emerald-700">8–10 Pass (no remarks needed)</span>
        </div>
      </div>

      {/* Packaging items */}
      <div className="space-y-4">
        {items.map((item) => (
          <PackagingRow key={item.id} item={item} onChange={(patch) => updateItem(item.id, patch)} />
        ))}
      </div>

      {/* Photo upload */}
      <div>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
          <Package className="w-4 h-4 text-brand-500" />
          <h3 className="text-base font-bold text-slate-800">Packaging Photos</h3>
          {errors.packagingPhotos && (
            <span className="ml-auto text-xs text-red-600 font-medium">{errors.packagingPhotos}</span>
          )}
        </div>

        {(formData.packagingPhotos || []).length === 0 && (
          <label
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl px-6 py-8 cursor-pointer transition-colors group ${
              errors.packagingPhotos ? 'border-red-300 bg-red-50/30 hover:border-red-400' : 'border-slate-300 hover:border-brand-400 hover:bg-brand-50/30'
            }`}
          >
            <Upload className="w-7 h-7 text-slate-400 group-hover:text-brand-500 mb-2 transition-colors" />
            <p className="text-sm font-medium text-slate-700">Upload packaging photo</p>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG — 1 photo</p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
        )}

        {(formData.packagingPhotos || []).length > 0 && (
          <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-3">
            {(formData.packagingPhotos || []).map((ph: any, i: number) => (
              <div key={i} className="relative group aspect-square">
                <img
                  src={ph.data || ph.url}
                  alt={ph.name || `Photo ${i + 1}`}
                  className="w-full h-full object-cover rounded-xl border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
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
