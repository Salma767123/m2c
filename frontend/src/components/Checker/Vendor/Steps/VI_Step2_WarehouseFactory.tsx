'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Warehouse, MapPin, Image as ImageIcon, Camera, X } from 'lucide-react'
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField'
import ImageCropModal from '@/components/UI/ImageCropModal'
import { notifyUploadSuccess } from '@/lib/toast-utils'

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
  // Legal Address & Factory Site — inspector evidence photos
  frontView: FactoryEvidencePhoto | null
  nameBoard: FactoryEvidencePhoto | null
  routeMap: FactoryEvidencePhoto | null
  // Warehouse — inspector evidence photos (only collected when the warehouse
  // address differs from the Legal Address & Factory Site).
  warehouseFrontView: FactoryEvidencePhoto | null
  warehouseNameBoard: FactoryEvidencePhoto | null
  warehouseRouteMap: FactoryEvidencePhoto | null
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
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
        {label} — Inspector Evidence Photo <span className="text-red-500" aria-hidden="true">*</span>
      </p>
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
            notifyUploadSuccess(label, cropFileName)
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

const eq = (a: any, b: any) => (a || '').trim() === (b || '').trim()

// The Warehouse Address counts as "same as" the Legal Address & Factory Site
// when the vendor didn't enter a separate warehouse address, or entered one
// that matches the legal/factory address field-for-field. (Registration mirrors
// the legal/factory address into the warehouse columns when the vendor ticks
// "Same as warehouse".)
export function detectSameAsWarehouse(v: any): boolean {
  // No separate warehouse address was entered at all
  if (!v.warehouseAddress && !v.warehouseCity) return true
  // All provided warehouse fields match the legal/factory address
  return (
    eq(v.warehouseAddress, v.factoryAddress) &&
    eq(v.warehouseCity, v.factoryCity) &&
    eq(v.warehouseState, v.factoryState) &&
    eq(v.warehouseZipCode, v.factoryZipCode) &&
    eq(v.warehouseCountry, v.factoryCountry)
  )
}

// Vendor-uploaded photos are all stored as type='OTHER' documents. The two
// upload sets are distinguished by their document name: the Legal Address &
// Factory Site photos (CompanyDetails step) are prefixed "Factory Site …",
// while the Warehouse photos (WarehouseDetails step) are named "Factory …".
const FACTORY_SITE_PHOTO_ORDER: Record<string, number> = {
  'Factory Site Name Board': 0,
  'Factory Site Front View': 1,
  'Factory Site Back View': 2,
  'Factory Site Left View': 3,
  'Factory Site Right View': 4,
  'Factory Site Road View': 5,
  'Factory Site Interior': 6,
  'Factory Site Image (Other)': 7,
}
const WAREHOUSE_PHOTO_ORDER: Record<string, number> = {
  'Factory Name Board': 0,
  'Factory Front View': 1,
  'Factory Back View': 2,
  'Factory Left View': 3,
  'Factory Right View': 4,
  'Factory Road View': 5,
  'Factory Interior': 6,
  'Factory Image (Other)': 7,
}
const isFactorySiteDoc = (name: string) => (name || '').startsWith('Factory Site')

export default function VI_Step2_WarehouseFactory({ vendor: v, verifications, onChange, onRegisterFields, factoryEvidence, onEvidenceChange, evidenceError }: Props) {

  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  )

  const otherDocs = Array.isArray(v.documents)
    ? v.documents.filter((d: any) => d.type === 'OTHER')
    : []
  // Legal Address & Factory Site images — "Factory Site …" documents.
  const legalImages = otherDocs
    .filter((d: any) => isFactorySiteDoc(d.name))
    .map((d: any) => ({ label: d.name || 'Factory Site Image', url: d.documentUrl }))
    .sort((a: any, b: any) => (FACTORY_SITE_PHOTO_ORDER[a.label] ?? 99) - (FACTORY_SITE_PHOTO_ORDER[b.label] ?? 99))
  // Warehouse images — every other "Factory …" document.
  const warehouseImages = otherDocs
    .filter((d: any) => !isFactorySiteDoc(d.name))
    .map((d: any) => ({ label: d.name || 'Warehouse Image', url: d.documentUrl }))
    .sort((a: any, b: any) => (WAREHOUSE_PHOTO_ORDER[a.label] ?? 99) - (WAREHOUSE_PHOTO_ORDER[b.label] ?? 99))

  const isSameAsWarehouse = detectSameAsWarehouse(v)

  useEffect(() => {
    const keys: string[] = [
      // ── Legal Address & Factory Site ──
      'w_legalOwnershipType',
      'w_legalCapacity',
      ...(v.factoryAddress ? ['w_legalAddress'] : []),
      ...(v.addressLine2 ? ['w_legalAddressLine2'] : []),
      ...(v.addressLine3 ? ['w_legalAddressLine3'] : []),
      ...(v.landmark ? ['w_legalLandmark'] : []),
      ...(v.factoryCity ? ['w_legalCity'] : []),
      ...(v.factoryState ? ['w_legalState'] : []),
      ...(v.factoryZipCode ? ['w_legalZipCode'] : []),
      ...(v.factoryCountry ? ['w_legalCountry'] : []),
      ...(v.mapLink ? ['w_mapLink'] : []),
      ...legalImages.map((_: any, idx: number) => `w_legalImg_${idx}`),
      // ── Warehouse Address ──
      // One key when it mirrors the legal/factory address, individual fields otherwise.
      ...(isSameAsWarehouse
        ? ['w_sameWarehouse']
        : [
            'w_whOwnershipType',
            'w_whCapacity',
            ...(v.warehouseAddress ? ['w_whAddress'] : []),
            ...(v.warehouseAddressLine2 ? ['w_whAddressLine2'] : []),
            ...(v.warehouseAddressLine3 ? ['w_whAddressLine3'] : []),
            ...(v.warehouseLandmark ? ['w_whLandmark'] : []),
            ...(v.warehouseCity ? ['w_whCity'] : []),
            ...(v.warehouseState ? ['w_whState'] : []),
            ...(v.warehouseZipCode ? ['w_whZipCode'] : []),
            ...(v.warehouseCountry ? ['w_whCountry'] : []),
          ]
      ),
      ...warehouseImages.map((_: any, idx: number) => `w_whImg_${idx}`),
    ]
    onRegisterFields(keys)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  return (<>
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Warehouse & Factory Details</h2>
        <p className="text-slate-500 text-sm">Verify the warehouse and factory address and physical infrastructure.</p>
      </div>

      {/* Section 1: Legal Address & Factory Site */}
      <SectionBlock title="Legal Address & Factory Site" icon={<Warehouse className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vf('w_legalOwnershipType', 'Ownership Type', getOwnershipTypeLabel(v.factoryOwnershipType))}
          {vf('w_legalCapacity', 'Warehousing Capacity', v.factorySize)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {v.factoryAddress && vf('w_legalAddress', 'Address Line 1', v.factoryAddress)}
          {v.addressLine2 && vf('w_legalAddressLine2', 'Address Line 2', v.addressLine2)}
          {v.addressLine3 && vf('w_legalAddressLine3', 'Address Line 3', v.addressLine3)}
          {v.landmark && vf('w_legalLandmark', 'Landmark', v.landmark)}
          {v.factoryCity && vf('w_legalCity', 'City', v.factoryCity)}
          {v.factoryState && vf('w_legalState', 'State', v.factoryState)}
          {v.factoryZipCode && vf('w_legalZipCode', 'ZIP / Postal Code', v.factoryZipCode)}
          {v.factoryCountry && vf('w_legalCountry', 'Country', v.factoryCountry)}
          {v.mapLink && vf('w_mapLink', 'Map / Location Link', v.mapLink, 'url')}
        </div>
        {/* Factory Images — only the Legal Address & Factory Site photos */}
        {legalImages.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Factory Images
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {legalImages.map((img: any, idx: number) => (
                <VerifyField
                  key={idx}
                  fieldKey={`w_legalImg_${idx}`}
                  label={img.label}
                  value={img.url}
                  type="image"
                  verifications={verifications}
                  onChange={onChange}
                  documentUrl={img.url || undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inspector Evidence Photos — Legal Address & Factory Site (sits right under
            the Factory Images so evidence lines up with what it verifies). */}
        <div id="inspector-evidence-photos" className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-brand-500" /> Inspector Evidence Photos — Legal Address &amp; Factory Site
          </p>
          <p className="text-xs text-slate-500 mb-3">Upload photos taken during the visit. All three are required.</p>
          {evidenceError && (
            <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              All three Legal Address &amp; Factory Site evidence photos are required before continuing.
            </p>
          )}
          <div className={evidenceError ? 'ring-2 ring-red-300 ring-offset-2 rounded-xl p-2' : ''}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <EvidenceUpload
                label="Factory Site Name Board"
                value={factoryEvidence.nameBoard}
                onChange={(photo) => onEvidenceChange('nameBoard', photo)}
              />
              <EvidenceUpload
                label="Factory Site Front View"
                value={factoryEvidence.frontView}
                onChange={(photo) => onEvidenceChange('frontView', photo)}
              />
              <EvidenceUpload
                label="Factory Site Route Map"
                value={factoryEvidence.routeMap}
                onChange={(photo) => onEvidenceChange('routeMap', photo)}
              />
            </div>
          </div>
        </div>
      </SectionBlock>

      {/* Section 2: Warehouse Address */}
      <SectionBlock title="Warehouse Address" icon={<MapPin className="w-4 h-4" />}>
        {isSameAsWarehouse ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 font-medium">
                Warehouse Address is the same as the Legal Address &amp; Factory Site provided above. Please verify.
              </p>
            </div>
            <VerifyField
              fieldKey="w_sameWarehouse"
              label="Warehouse Address"
              value="Same as Legal Address & Factory Site"
              verifications={verifications}
              onChange={onChange}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vf('w_whOwnershipType', 'Ownership Type', getOwnershipTypeLabel(v.ownershipType))}
              {vf('w_whCapacity', 'Warehousing Capacity', v.warehouseSize)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {v.warehouseAddress && vf('w_whAddress', 'Address Line 1', v.warehouseAddress)}
              {v.warehouseAddressLine2 && vf('w_whAddressLine2', 'Address Line 2', v.warehouseAddressLine2)}
              {v.warehouseAddressLine3 && vf('w_whAddressLine3', 'Address Line 3', v.warehouseAddressLine3)}
              {v.warehouseLandmark && vf('w_whLandmark', 'Landmark', v.warehouseLandmark)}
              {v.warehouseCity && vf('w_whCity', 'City', v.warehouseCity)}
              {v.warehouseState && vf('w_whState', 'State', v.warehouseState)}
              {v.warehouseZipCode && vf('w_whZipCode', 'ZIP / Postal Code', v.warehouseZipCode)}
              {v.warehouseCountry && vf('w_whCountry', 'Country', v.warehouseCountry)}
            </div>
          </>
        )}
        {/* Warehouse Images — only the Warehouse Address photos */}
        {warehouseImages.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Warehouse Images
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warehouseImages.map((img: any, idx: number) => (
                <VerifyField
                  key={idx}
                  fieldKey={`w_whImg_${idx}`}
                  label={img.label}
                  value={img.url}
                  type="image"
                  verifications={verifications}
                  onChange={onChange}
                  documentUrl={img.url || undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inspector Evidence Photos — Warehouse (sits right under the Warehouse Images).
            Only when the warehouse address differs from the Legal Address & Factory Site;
            when they're the same, the factory-site evidence above already covers it. */}
        {!isSameAsWarehouse && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-brand-500" /> Inspector Evidence Photos — Warehouse
            </p>
            <p className="text-xs text-slate-500 mb-3">Upload photos taken during the visit. All three are required.</p>
            {evidenceError && (
              <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                All three Warehouse evidence photos are required before continuing.
              </p>
            )}
            <div className={evidenceError ? 'ring-2 ring-red-300 ring-offset-2 rounded-xl p-2' : ''}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <EvidenceUpload
                  label="Warehouse Name Board"
                  value={factoryEvidence.warehouseNameBoard}
                  onChange={(photo) => onEvidenceChange('warehouseNameBoard', photo)}
                />
                <EvidenceUpload
                  label="Warehouse Front View"
                  value={factoryEvidence.warehouseFrontView}
                  onChange={(photo) => onEvidenceChange('warehouseFrontView', photo)}
                />
                <EvidenceUpload
                  label="Warehouse Route Map"
                  value={factoryEvidence.warehouseRouteMap}
                  onChange={(photo) => onEvidenceChange('warehouseRouteMap', photo)}
                />
              </div>
            </div>
          </div>
        )}
      </SectionBlock>
    </div>
  </>)
}
