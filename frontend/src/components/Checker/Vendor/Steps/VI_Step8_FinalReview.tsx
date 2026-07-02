'use client'

import { ClipboardList, User, Calendar, MessageSquare, ChevronDown, Pencil } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Verifications } from './VI_VerifyField'

// ── Inspector Metadata ────────────────────────────────────────────────────────
export interface InspectorMeta {
  inspectorName: string
  inspectionDate: string
  overallResult: 'Approved' | 'Rejected' | 'On Hold' | 'Re-inspection Required' | ''
  inspectorRemarks: string
}

interface Props {
  vendor: any
  inspection: any
  verifications: Verifications
  meta: InspectorMeta
  onMetaChange: (patch: Partial<InspectorMeta>) => void
  onGoToStep?: (step: number, fieldKey?: string) => void
}

const RESULT_OPTIONS: InspectorMeta['overallResult'][] = ['Approved', 'Rejected', 'On Hold', 'Re-inspection Required']

const RESULT_COLORS: Record<string, string> = {
  Approved: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  Rejected: 'text-red-700 bg-red-50 border-red-300',
  'On Hold': 'text-amber-700 bg-amber-50 border-amber-300',
  'Re-inspection Required': 'text-orange-700 bg-orange-50 border-orange-300',
}

// ── Field-key → step mapping ──────────────────────────────────────────────────
function getStepForKey(key: string): { step: number; label: string } {
  if (key.startsWith('certDoc_') || key.startsWith('cert_')) return { step: 6, label: 'Certifications' }
  if (key.startsWith('vt_')) return { step: 4, label: 'Vendor & Products' }
  if (key.startsWith('mf_')) return { step: 5, label: 'Manufacturing' }
  if (key.startsWith('ct_')) return { step: 7, label: 'Contact & Trade' }
  if (key.startsWith('c_')) return { step: 1, label: 'Company Info' }
  if (key.startsWith('w_')) return { step: 2, label: 'Warehouse & Factory' }
  if (key.startsWith('o_')) return { step: 3, label: 'Owner Profile' }
  return { step: 1, label: 'Unknown' }
}

function buildIssues(verifications: Verifications) {
  return Object.entries(verifications).filter(([, v]) => v.ok === false)
}

export default function VI_Step8_FinalReview({ vendor: v, inspection, verifications, meta, onMetaChange, onGoToStep }: Props) {
  const rejected = buildIssues(verifications)

  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !menuRef.current?.contains(t)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  useEffect(() => {
    if (!showDropdown || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    const close = () => setShowDropdown(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [showDropdown])

  const selectedColor = meta.overallResult ? RESULT_COLORS[meta.overallResult] : ''

  return (
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Final Review & Submission</h2>
        <p className="text-slate-500 text-sm">Review flagged issues, record the inspection result, and add your overall remarks.</p>
      </div>

      {/* Issues list */}
      {rejected.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-red-200">
            <ClipboardList className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-red-700">Fields with Issues ({rejected.length})</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {rejected.map(([key, val]) => {
              const { step, label } = getStepForKey(key)
              return (
                <div key={key} className="bg-white border border-red-100 rounded-lg px-4 py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
                        Step {step}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">{label}</span>
                    </div>
                    {val.remarks && <p className="text-xs text-red-700 italic">{val.remarks}</p>}
                  </div>
                  {onGoToStep && (
                    <button
                      type="button"
                      onClick={() => onGoToStep(step, key)}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-600 bg-white border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Inspector Details */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-800">Inspector Details</h3>
        </div>
        <div className="p-5 space-y-5">
          {/* Single row: Inspector Name | Inspection Date | Overall Result */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Inspector Name — read-only */}
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" /> Inspector Name
              </p>
              <div className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 min-h-[42px] flex items-center">
                {meta.inspectorName || <span className="text-slate-400 italic">Auto-filled</span>}
              </div>
            </div>

            {/* Inspection Date — read-only */}
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Inspection Date
              </p>
              <div className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 min-h-[42px] flex items-center">
                {meta.inspectionDate || <span className="text-slate-400 italic">Auto-filled</span>}
              </div>
            </div>

            {/* Overall Result — dropdown */}
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                Overall Inspection Result <span className="text-red-500">*</span>
              </p>
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className={`w-full px-4 py-2.5 rounded-xl border text-left flex items-center justify-between text-sm transition-all duration-200 font-semibold ${
                  meta.overallResult
                    ? `${selectedColor} border`
                    : 'border-slate-300 bg-white text-slate-400 hover:border-slate-400'
                }`}
              >
                <span>{meta.overallResult || 'Select result…'}</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showDropdown && dropdownPos && typeof document !== 'undefined' && createPortal(
                <div
                  ref={menuRef}
                  style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
                  className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                >
                  {RESULT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { onMetaChange({ overallResult: opt }); setShowDropdown(false) }}
                      className={`block w-full px-4 py-2.5 text-sm text-left font-semibold transition-colors ${
                        meta.overallResult === opt
                          ? 'bg-brand-50 text-brand-600 border-l-2 border-brand-500'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* Overall Remarks */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Overall Inspector Remarks
            </label>
            <textarea
              value={meta.inspectorRemarks}
              onChange={e => onMetaChange({ inspectorRemarks: e.target.value })}
              placeholder="Summary notes about the inspection visit, any notable observations, or context for the admin reviewing this report…"
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
