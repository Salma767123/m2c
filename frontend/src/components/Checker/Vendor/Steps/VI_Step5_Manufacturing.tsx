'use client'

import { useEffect } from 'react'
import { Factory, Settings } from 'lucide-react'
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField'

const FACILITY_META: Record<string, { label: string; detailFields: Array<{ key: string; label: string }> }> = {
  spinning: {
    label: 'Spinning',
    detailFields: [
      { key: 'spinningMachines', label: 'Number of Machines' },
      { key: 'spinningCapacity', label: 'Monthly Capacity' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  weaving: {
    label: 'Weaving',
    detailFields: [
      { key: 'loomCount', label: 'Loom Count' },
      { key: 'weavingCapacity', label: 'Monthly Capacity' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  dyeing: {
    label: 'Dyeing',
    detailFields: [
      { key: 'dyeingMachines', label: 'Number of Machines' },
      { key: 'dyeingCapacity', label: 'Monthly Capacity' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  printing: {
    label: 'Printing',
    detailFields: [
      { key: 'printingMachines', label: 'Number of Machines' },
      { key: 'printingCapacity', label: 'Monthly Capacity' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  stitching: {
    label: 'Stitching',
    detailFields: [
      { key: 'stitchingMachines', label: 'Number of Machines' },
      { key: 'stitchingCapacity', label: 'Monthly Capacity' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  finishing: {
    label: 'Finishing',
    detailFields: [
      { key: 'finishingCapacity', label: 'Monthly Capacity' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
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
      ...(v.productionCapacity ? ['mf_productionCapacity'] : []),
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

      {/* Production Capacity Overview */}
      {v.productionCapacity && (
        <SectionBlock title="Overall Production Capacity" icon={<Factory className="w-4 h-4" />}>
          {vf('mf_productionCapacity', 'Monthly Production Capacity', v.productionCapacity)}
        </SectionBlock>
      )}

      {/* Enabled Facilities */}
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
                    {meta.detailFields.map(({ key, label }) => {
                      const val = details[key]
                      if (!val) return null
                      return vf(`${prefix}_${key}`, label, val)
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionBlock>

      {/* Disabled Facilities (informational) */}
      {Object.keys(FACILITY_META).filter(f => !enabledFacilities[f]).length > 0 && (
        <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Facilities Not Declared</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(FACILITY_META)
              .filter(f => !enabledFacilities[f])
              .map(f => (
                <span key={f} className="px-2.5 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full">
                  {FACILITY_META[f].label}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
