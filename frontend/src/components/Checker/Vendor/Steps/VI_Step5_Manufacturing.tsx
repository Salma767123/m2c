'use client'

import { useEffect } from 'react'
import { Settings } from 'lucide-react'
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField'

export const FACILITY_META: Record<string, { label: string; detailFields: Array<{ key: string; label: string; unit?: string }> }> = {
  spinning: {
    label: 'Spinning',
    detailFields: [
      { key: 'spinningMachines', label: 'Number of Machines', unit: 'Machines' },
      { key: 'spinningCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  weaving: {
    label: 'Weaving',
    detailFields: [
      { key: 'loomCount', label: 'Number of Looms', unit: 'Looms' },
      { key: 'weavingCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  dyeing: {
    label: 'Dyeing',
    detailFields: [
      { key: 'dyeingMachines', label: 'Number of Machines', unit: 'Machines' },
      { key: 'dyeingCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  printing: {
    label: 'Printing',
    detailFields: [
      { key: 'printingMachines', label: 'Number of Machines', unit: 'Machines' },
      { key: 'printingCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  stitching: {
    label: 'Stitching',
    detailFields: [
      { key: 'stitchingMachines', label: 'Number of Machines', unit: 'Machines' },
      { key: 'stitchingCapacity', label: 'Daily Capacity', unit: 'Pieces / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  finishing: {
    label: 'Finishing',
    detailFields: [
      { key: 'finishingCapacity', label: 'Daily Capacity', unit: 'Pieces / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
}

// Append unit if the value is a plain number (no letters already present)
export function withUnit(val: any, unit?: string): any {
  if (!val || !unit) return val
  const s = String(val).trim()
  if (/[a-zA-Z]/.test(s)) return s   // already has unit-like text
  return `${s} ${unit}`
}

interface Props {
  vendor: any
  verifications: Verifications
  onChange: (key: string, ok: boolean | null, remarks: string) => void
  onRegisterFields: (keys: string[]) => void
}

export default function VI_Step5_Manufacturing({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  )

  const enabledFacilities: Record<string, boolean> = v.enabledFacilities || {}
  const facilityDetails: Record<string, any> = v.facilityDetails || {}
  const activeFacilities = Object.keys(FACILITY_META).filter(f => enabledFacilities[f])

  useEffect(() => {
    const keys: string[] = [
      ...activeFacilities.flatMap((facilityKey) => {
        const meta = FACILITY_META[facilityKey]
        const details = facilityDetails[facilityKey] || {}
        const prefix = `mf_${facilityKey}`
        return [
          `${prefix}_active`,
          ...meta.detailFields
            .filter(({ key }) => !!details[key])
            .map(({ key }) => `${prefix}_${key}`),
        ]
      }),
    ]
    onRegisterFields(keys)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  return (
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Manufacturing Facilities</h2>
        <p className="text-slate-500 text-sm">Verify the production facilities, machinery, and capacity information submitted by the vendor.</p>
      </div>

      {/* Active Facilities */}
      <SectionBlock title="Active Facilities" icon={<Settings className="w-4 h-4" />}>
        {activeFacilities.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No facilities declared.</p>
        ) : (
          <div className="space-y-6">
            {activeFacilities.map((facilityKey) => {
              const meta = FACILITY_META[facilityKey]
              const details = facilityDetails[facilityKey] || {}
              const prefix = `mf_${facilityKey}`

              return (
                <div key={facilityKey} className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    <p className="text-sm font-bold text-slate-800">{meta.label}</p>
                    <span className="ml-auto text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Active</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vf(`${prefix}_active`, `${meta.label} Facility Active`, 'Yes — declared as active')}
                    {meta.detailFields.map(({ key, label, unit }) => {
                      const val = details[key]
                      if (!val) return null
                      return vf(`${prefix}_${key}`, label, withUnit(val, unit))
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionBlock>
    </div>
  )
}
