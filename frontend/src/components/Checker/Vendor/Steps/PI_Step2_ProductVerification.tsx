'use client'

import { Package, Image as ImageIcon, Layers, Tag, Ruler, Upload, X } from 'lucide-react'
import { useState } from 'react'
import VerifyField, { SectionBlock, HighlightFieldsProvider, type Verifications } from './VI_VerifyField'
import ImageCropModal from '@/components/UI/ImageCropModal'
import { getExpectedProductVerificationKeys } from '@/components/Checker/Products/validation'

// ── Image compressor (same quality settings as Testing.tsx) ─────────────────
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

// ── Helpers ─────────────────────────────────────────────────────────────────
function safe(val: any): string {
  if (val === null || val === undefined || val === '') return ''
  return String(val)
}

function notEmpty(val: any) {
  return val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  formData: {
    productData: any
    productVerifications: Verifications
    productEvidencePhotos: any[]
  }
  setFormData: (d: any) => void
  errors?: Record<string, string>
}

// ── Component ────────────────────────────────────────────────────────────────
export default function PI_Step2_ProductVerification({ formData, setFormData, errors = {} }: Props) {
  const p = formData.productData || {}
  const verifications = formData.productVerifications || {}

  // Compute keys that are missing a Yes/No decision — used by HighlightFieldsProvider
  // so each VerifyField self-highlights when there are validation errors.
  const unverifiedKeys: Set<string> = errors.productVerifications
    ? new Set(
        getExpectedProductVerificationKeys(p).filter(
          (key) => !verifications[key] || verifications[key].ok === null
        )
      )
    : new Set()

  const onVerify = (key: string, ok: boolean | null, remarks: string) => {
    setFormData({
      ...formData,
      productVerifications: { ...verifications, [key]: { ok, remarks } },
    })
  }

  // ── Crop state for photo evidence ────────────────────────────────────────
  const [cropQueue, setCropQueue] = useState<File[]>([])
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState('')

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setCropQueue(files.slice(1))
    setCropFileName(files[0].name)
    setCropSrc(URL.createObjectURL(files[0]))
  }

  const onEvidenceCropped = async (croppedFile: File) => {
    const data = await readAsDataUrl(croppedFile)
    setFormData({
      ...formData,
      productEvidencePhotos: [...(formData.productEvidencePhotos || []), { name: cropFileName, data }],
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
    const next = [...(formData.productEvidencePhotos || [])]
    next.splice(idx, 1)
    setFormData({ ...formData, productEvidencePhotos: next })
  }

  // ── Variant rows (price excluded) ────────────────────────────────────────
  const variants: any[] = Array.isArray(p.variants) ? p.variants : []

  return (
    <HighlightFieldsProvider keys={unverifiedKeys}>
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Product Information Verification</h2>
        <p className="text-slate-500 text-sm">
          Verify each field against the physical product. Select Yes / No and add remarks when needed.
        </p>
      </div>

      {errors.productVerifications && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-700">{errors.productVerifications}</p>
          <p className="text-xs text-red-500 mt-0.5">Scroll down to complete all highlighted fields.</p>
        </div>
      )}
      {errors.productEvidencePhotos && !errors.productVerifications && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-700">{errors.productEvidencePhotos}</p>
        </div>
      )}

      {/* ── 1. Basic Product Info ─────────────────────────────────────────── */}
      <SectionBlock title="Basic Product Information" icon={<Package className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notEmpty(p.name) && (
            <VerifyField fieldKey="pv_name" label="Product Name" value={p.name}
              verifications={verifications} onChange={onVerify} />
          )}
          {notEmpty(p.category) && (
            <VerifyField fieldKey="pv_category" label="Category" value={p.category}
              verifications={verifications} onChange={onVerify} />
          )}
          {notEmpty(p.subCategory) && (
            <VerifyField fieldKey="pv_subCategory" label="Sub-Category" value={p.subCategory}
              verifications={verifications} onChange={onVerify} />
          )}
          {notEmpty(p.baseSku) && (
            <VerifyField fieldKey="pv_baseSku" label="Base SKU" value={p.baseSku}
              verifications={verifications} onChange={onVerify} />
          )}
          {notEmpty(p.brand) && (
            <VerifyField fieldKey="pv_brand" label="Brand" value={p.brand}
              verifications={verifications} onChange={onVerify} />
          )}
          {notEmpty(p.description) && (
            <div className="md:col-span-2">
              <VerifyField fieldKey="pv_description" label="Product Description" value={p.description}
                verifications={verifications} onChange={onVerify} />
            </div>
          )}
        </div>
      </SectionBlock>

      {/* ── 2. Product Images ─────────────────────────────────────────────── */}
      {Array.isArray(p.images) && p.images.length > 0 && (
        <SectionBlock title="Product Images" icon={<ImageIcon className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {p.images.map((img: any, i: number) => (
              <VerifyField
                key={i}
                fieldKey={`pv_img_${i}`}
                label={img.alt || `Product Image ${i + 1}${img.isPrimary ? ' (Primary)' : ''}`}
                value={img.url || img.imageUrl}
                type="image"
                verifications={verifications}
                onChange={onVerify}
              />
            ))}
          </div>
        </SectionBlock>
      )}

      {/* ── 3. Material & Construction ────────────────────────────────────── */}
      {(notEmpty(p.fabricType) || notEmpty(p.material) || notEmpty(p.construction)) && (
        <SectionBlock title="Material & Construction" icon={<Layers className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notEmpty(p.fabricType) && (
              <VerifyField fieldKey="pv_fabricType" label="Fabric Type" value={p.fabricType}
                verifications={verifications} onChange={onVerify} />
            )}
            {notEmpty(p.material) && (
              <VerifyField fieldKey="pv_material" label="Material" value={p.material}
                verifications={verifications} onChange={onVerify} />
            )}
            {notEmpty(p.construction) && (
              <VerifyField fieldKey="pv_construction" label="Construction" value={p.construction}
                verifications={verifications} onChange={onVerify} />
            )}
            {notEmpty(p.weight) && (
              <VerifyField fieldKey="pv_weight" label="Weight" value={p.weight}
                verifications={verifications} onChange={onVerify} />
            )}
          </div>
        </SectionBlock>
      )}

      {/* ── 4. Variants (no pricing) ─────────────────────────────────────── */}
      {variants.length > 0 && (
        <SectionBlock title="Product Variants" icon={<Tag className="w-4 h-4" />}>
          <div className="space-y-4">
            {variants.map((variant: any, vi: number) => {
              const varLabel = [variant.color, variant.size, variant.material]
                .filter(Boolean).join(' / ') || `Variant ${vi + 1}`
              return (
                <div key={vi} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                    <p className="text-sm font-bold text-slate-700">Variant {vi + 1}: {varLabel}</p>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {notEmpty(variant.color) && (
                      <VerifyField fieldKey={`pv_var${vi}_color`} label="Color"
                        value={variant.color} verifications={verifications} onChange={onVerify} />
                    )}
                    {notEmpty(variant.size) && (
                      <VerifyField fieldKey={`pv_var${vi}_size`} label="Size"
                        value={variant.size} verifications={verifications} onChange={onVerify} />
                    )}
                    {notEmpty(variant.material) && (
                      <VerifyField fieldKey={`pv_var${vi}_material`} label="Material"
                        value={variant.material} verifications={verifications} onChange={onVerify} />
                    )}
                    {notEmpty(variant.sku) && (
                      <VerifyField fieldKey={`pv_var${vi}_sku`} label="SKU"
                        value={variant.sku} verifications={verifications} onChange={onVerify} />
                    )}
                    {notEmpty(variant.variantName) && (
                      <VerifyField fieldKey={`pv_var${vi}_variantName`} label="Variant Name"
                        value={variant.variantName} verifications={verifications} onChange={onVerify} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </SectionBlock>
      )}

      {/* ── 5. Measurements / Specifications ─────────────────────────────── */}
      {(notEmpty(p.dimensions) || notEmpty(p.fabricSpecifications)) && (
        <SectionBlock title="Measurements & Specifications" icon={<Ruler className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notEmpty(p.dimensions) && (
              <VerifyField fieldKey="pv_dimensions" label="Dimensions" value={
                typeof p.dimensions === 'object'
                  ? Object.entries(p.dimensions).map(([k, v]) => `${k}: ${v}`).join(' | ')
                  : p.dimensions
              } verifications={verifications} onChange={onVerify} />
            )}
            {p.fabricSpecifications && typeof p.fabricSpecifications === 'object' &&
              Object.entries(p.fabricSpecifications).filter(([, val]) => notEmpty(val)).map(([key, val]) => (
                <VerifyField
                  key={key}
                  fieldKey={`pv_spec_${key}`}
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
                  value={safe(val)}
                  verifications={verifications}
                  onChange={onVerify}
                />
              ))
            }
          </div>
        </SectionBlock>
      )}

      {/* ── 6. Packaging Information ──────────────────────────────────────── */}
      {(notEmpty(p.packagingType) || notEmpty(p.packagingDetails) || notEmpty(p.packagingMaterial)) && (
        <SectionBlock title="Packaging Information" icon={<Package className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notEmpty(p.packagingType) && (
              <VerifyField fieldKey="pv_packagingType" label="Packaging Type" value={p.packagingType}
                verifications={verifications} onChange={onVerify} />
            )}
            {notEmpty(p.packagingMaterial) && (
              <VerifyField fieldKey="pv_packagingMaterial" label="Packaging Material" value={p.packagingMaterial}
                verifications={verifications} onChange={onVerify} />
            )}
            {notEmpty(p.packagingDetails) && (
              <div className="md:col-span-2">
                <VerifyField fieldKey="pv_packagingDetails" label="Packaging Details" value={
                  typeof p.packagingDetails === 'object'
                    ? JSON.stringify(p.packagingDetails)
                    : p.packagingDetails
                } verifications={verifications} onChange={onVerify} />
              </div>
            )}
          </div>
        </SectionBlock>
      )}

      {/* ── 7. Label & Marking Info ───────────────────────────────────────── */}
      {(notEmpty(p.labelInfo) || notEmpty(p.careLabel) || notEmpty(p.countryOfOrigin)) && (
        <SectionBlock title="Labels & Markings" icon={<Tag className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notEmpty(p.careLabel) && (
              <VerifyField fieldKey="pv_careLabel" label="Care Label" value={p.careLabel}
                verifications={verifications} onChange={onVerify} />
            )}
            {notEmpty(p.countryOfOrigin) && (
              <VerifyField fieldKey="pv_countryOfOrigin" label="Country of Origin" value={p.countryOfOrigin}
                verifications={verifications} onChange={onVerify} />
            )}
            {notEmpty(p.labelInfo) && (
              <div className="md:col-span-2">
                <VerifyField fieldKey="pv_labelInfo" label="Label Information" value={
                  typeof p.labelInfo === 'object' ? JSON.stringify(p.labelInfo) : p.labelInfo
                } verifications={verifications} onChange={onVerify} />
              </div>
            )}
          </div>
        </SectionBlock>
      )}

      {/* ── Photo Evidence ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-5">
          <ImageIcon className="w-4 h-4 text-brand-500" />
          <h3 className="text-base font-bold text-slate-800">Photo Evidence</h3>
        </div>

        <label
          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl px-6 py-8 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors group"
        >
          <Upload className="w-8 h-8 text-slate-400 group-hover:text-brand-500 mb-2 transition-colors" />
          <p className="text-sm font-medium text-slate-700">Upload product evidence photos</p>
          <p className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG — multiple files accepted</p>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </label>

        {(formData.productEvidencePhotos || []).length > 0 && (
          <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-3">
            {(formData.productEvidencePhotos || []).map((ph: any, i: number) => (
              <div key={i} className="relative group aspect-square">
                <img
                  src={ph.data || ph.url}
                  alt={ph.name || `Evidence ${i + 1}`}
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
        title="Crop Evidence Photo"
        cropShape="rect"
        showGrid={true}
        onCancel={() => {
          if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
          setCropQueue([])
          setCropSrc(null)
          setCropFileName('')
        }}
        onCropped={onEvidenceCropped}
      />
    </div>
    </HighlightFieldsProvider>
  )
}
