'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Warehouse, MapPin, Image as ImageIcon, Camera, X } from 'lucide-react'
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField'
import ImageCropModal from '@/components/UI/ImageCropModal'
function getOwnershipTypeLabel(val: string) {
  const map: Record<string, string> = { owned: 'Owned', rented: 'Rented', lease: 'Lease' }
  return map[val] || val
}

export interface FactoryEvidencePhoto {
  name: string
  url: string
  id: number
}

export interface FactoryEvidenceState {
  frontView: FactoryEvidencePhoto | null
  nameBoard: FactoryEvidencePhoto | null
  routeMap: FactoryEvidencePhoto | null
}

interface Props {
  vendor: any
  verifications: Verifications
  onChange: (key: string, ok: boolean | null, remarks: string) => void
  onRegisterFields: (keys: string[]) => void
  factoryEvidence: FactoryEvidenceState
  onEvidenceChange: (slot: keyof FactoryEvidenceState, photo: FactoryEvidencePhoto | null) => void
  evidenceError?: boolean
}

function EvidenceUpload({
  label,
  value,
  onChange,
}: {
  label: string
  value: FactoryEvidencePhoto | null
  onChange: (photo: FactoryEvidencePhoto | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (e.target) e.target.value = ''
    setCropFileName(file.name)
    setCropSrc(URL.createObjectURL(file))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label} — Inspector Evidence Photo</p>
      {value ? (
        <div className="relative w-fit">
          <img src={value.url} alt={label} className="w-32 h-32 object-cover rounded-xl border border-emerald-200" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-xs text-slate-500 mt-1 max-w-32 truncate">{value.name}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50 text-slate-600 hover:text-brand-600 text-sm font-medium transition-all"
        >
          <Camera className="w-4 h-4" />
          Upload Evidence Photo
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <ImageCropModal
        src={cropSrc}
        fileName={cropFileName}
        title="Crop Evidence Photo"
        cropShape="rect"
        showGrid={true}
        onCancel={() => {
          if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
          setCropSrc(null)
          setCropFileName('')
        }}
        onCropped={(croppedFile) => {
          const reader = new FileReader()
          reader.onload = (ev) => {
            onChange({ name: cropFileName, url: ev.target?.result as string, id: Date.now() })
          }
          reader.readAsDataURL(croppedFile)
          if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
          setCropSrc(null)
          setCropFileName('')
        }}
      />
    </div>
  )
}

export default function VI_Step2_WarehouseFactory({ vendor: v, verifications, onChange, onRegisterFields, factoryEvidence, onEvidenceChange, evidenceError }: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  )

  const factoryImages = Array.isArray(v.documents)
    ? v.documents.filter((d: any) => d.type === 'OTHER').map((d: any) => ({ label: d.name || 'Factory Image', url: d.documentUrl }))
    : []

  useEffect(() => {
    const keys: string[] = [
      'w_ownershipType',
      'w_warehouseSize',
      ...(v.warehouseAddress ? ['w_warehouseAddress'] : []),
      ...(v.warehouseAddressLine2 ? ['w_warehouseAddressLine2'] : []),
      ...(v.warehouseAddressLine3 ? ['w_warehouseAddressLine3'] : []),
      ...(v.warehouseLandmark ? ['w_warehouseLandmark'] : []),
      ...(v.warehouseCity ? ['w_warehouseCity'] : []),
      ...(v.warehouseState ? ['w_warehouseState'] : []),
      ...(v.warehouseZipCode ? ['w_warehouseZipCode'] : []),
      ...(v.warehouseCountry ? ['w_warehouseCountry'] : []),
      ...(v.factoryAddress ? ['w_factoryAddress'] : []),
      ...(v.factoryCity ? ['w_factoryCity'] : []),
      ...(v.factoryState ? ['w_factoryState'] : []),
      ...(v.factoryZipCode ? ['w_factoryZipCode'] : []),
      ...(v.factoryCountry ? ['w_factoryCountry'] : []),
      ...(v.mapLink ? ['w_mapLink'] : []),
      ...factoryImages.map((_: any, idx: number) => `w_factoryImg_${idx}`),
    ]
    onRegisterFields(keys)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  return (
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Warehouse & Factory Details</h2>
        <p className="text-slate-500 text-sm">Verify the warehouse and factory address and physical infrastructure.</p>
      </div>

      {/* Warehouse Address */}
      <SectionBlock title="Warehouse Address" icon={<Warehouse className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vf('w_ownershipType', 'Ownership Type', getOwnershipTypeLabel(v.ownershipType))}
          {vf('w_warehouseSize', 'Warehousing Capacity', v.warehouseSize)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {v.warehouseAddress && vf('w_warehouseAddress', 'Address Line 1', v.warehouseAddress)}
          {v.warehouseAddressLine2 && vf('w_warehouseAddressLine2', 'Address Line 2', v.warehouseAddressLine2)}
          {v.warehouseAddressLine3 && vf('w_warehouseAddressLine3', 'Address Line 3', v.warehouseAddressLine3)}
          {v.warehouseLandmark && vf('w_warehouseLandmark', 'Landmark', v.warehouseLandmark)}
          {v.warehouseCity && vf('w_warehouseCity', 'City', v.warehouseCity)}
          {v.warehouseState && vf('w_warehouseState', 'State', v.warehouseState)}
          {v.warehouseZipCode && vf('w_warehouseZipCode', 'ZIP / Postal Code', v.warehouseZipCode)}
          {v.warehouseCountry && vf('w_warehouseCountry', 'Country', v.warehouseCountry)}
        </div>
      </SectionBlock>

      {/* Factory Address */}
      <SectionBlock title="Factory Address" icon={<MapPin className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {v.factoryAddress && vf('w_factoryAddress', 'Factory Address', v.factoryAddress)}
          {v.factoryCity && vf('w_factoryCity', 'Factory City', v.factoryCity)}
          {v.factoryState && vf('w_factoryState', 'Factory State', v.factoryState)}
          {v.factoryZipCode && vf('w_factoryZipCode', 'Factory ZIP', v.factoryZipCode)}
          {v.factoryCountry && vf('w_factoryCountry', 'Factory Country', v.factoryCountry)}
        </div>
        {v.mapLink && (
          <div className="mt-4">
            {vf('w_mapLink', 'Map / Location Link', v.mapLink, 'url')}
          </div>
        )}
      </SectionBlock>

      {/* Vendor-uploaded Factory Photos — all get Yes/No verification */}
      {factoryImages.length > 0 && (
        <SectionBlock title="Factory Photos (Vendor-Uploaded)" icon={<ImageIcon className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {factoryImages.map((img: any, idx: number) => (
              <VerifyField
                key={idx}
                fieldKey={`w_factoryImg_${idx}`}
                label={img.label}
                value={img.url}
                type="image"
                verifications={verifications}
                onChange={onChange}
              />
            ))}
          </div>
        </SectionBlock>
      )}

      {/* Inspector Evidence Photos */}
      <div id="inspector-evidence-photos">
        <SectionBlock title="Inspector Evidence Photos" icon={<Camera className="w-4 h-4" />}>
          <p className="text-xs text-slate-500 mb-4">Upload photos taken during the factory visit to serve as inspection evidence.</p>
          {evidenceError && (
            <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              At least one evidence photo is required before continuing.
            </p>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${evidenceError ? 'ring-2 ring-red-300 ring-offset-2 rounded-xl p-2' : ''}`}>
            <EvidenceUpload
              label="Factory Front View"
              value={factoryEvidence.frontView}
              onChange={(photo) => onEvidenceChange('frontView', photo)}
            />
            <EvidenceUpload
              label="Factory Name Board"
              value={factoryEvidence.nameBoard}
              onChange={(photo) => onEvidenceChange('nameBoard', photo)}
            />
            <EvidenceUpload
              label="Route Map Photo"
              value={factoryEvidence.routeMap}
              onChange={(photo) => onEvidenceChange('routeMap', photo)}
            />
          </div>
        </SectionBlock>
      </div>
    </div>
  )
}
