'use client'

import { MapPin, Video, X } from 'lucide-react'

export type InspectionType = 'PHYSICAL' | 'VIRTUAL'

interface Props {
  /** Vendor / product name, for context in the heading. */
  subjectName?: string
  /** Called with the chosen type. The caller then starts the inspection. */
  onSelect: (type: InspectionType) => void
  /** Called when the checker backs out without choosing. */
  onCancel: () => void
}

/**
 * Mandatory "how is this inspection being carried out?" dialog, shown the moment a
 * checker begins an inspection (factory OR product). The choice decides whether the
 * inspection is geofenced:
 *
 *   • Physical — checker is on-site; device GPS is captured and validated against the
 *     vendor's factory coordinates, and the report shows those coordinates.
 *   • Virtual  — done online; no GPS is captured or validated, and the report shows the
 *     type instead of coordinates.
 *
 * There is no default and no dismiss-without-choosing (the X cancels the whole start),
 * so the checker cannot slip past this decision.
 */
export default function InspectionTypeDialog({ subjectName, onSelect, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Select Inspection Type</h2>
            <p className="text-sm text-slate-500 mt-1">
              How are you carrying out
              {subjectName ? <> the inspection for <span className="font-semibold text-slate-700">{subjectName}</span></> : <> this inspection</>}?
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onSelect('PHYSICAL')}
            className="group text-left rounded-xl border-2 border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 p-5 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-900">Physical Inspection</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              On-site visit. Your location is captured and verified against the vendor&apos;s factory.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSelect('VIRTUAL')}
            className="group text-left rounded-xl border-2 border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 p-5 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Video className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-900">Virtual Inspection</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Online / remote. No location is captured — everything else is unchanged.
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}
