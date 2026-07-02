'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import { Button } from '@/components/UI/Button'

export interface CareInstruction {
  id: string
  label: string
  category: string
  paths: React.ReactNode
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Washing':      'text-blue-500',
  'Bleaching':    'text-amber-500',
  'Drying':       'text-emerald-500',
  'Ironing':      'text-orange-500',
  'Dry Cleaning': 'text-violet-500',
  'Special':      'text-rose-500',
}

// Border color used on checked cards, matched to category
export const CATEGORY_BORDER: Record<string, string> = {
  'Washing':      'border-blue-400 bg-blue-50 text-blue-800',
  'Bleaching':    'border-amber-400 bg-amber-50 text-amber-800',
  'Drying':       'border-emerald-400 bg-emerald-50 text-emerald-800',
  'Ironing':      'border-orange-400 bg-orange-50 text-orange-800',
  'Dry Cleaning': 'border-violet-400 bg-violet-50 text-violet-800',
  'Special':      'border-rose-400 bg-rose-50 text-rose-800',
}

// Category label pill color
const CATEGORY_PILL: Record<string, string> = {
  'Washing':      'bg-blue-100 text-blue-700',
  'Bleaching':    'bg-amber-100 text-amber-700',
  'Drying':       'bg-emerald-100 text-emerald-700',
  'Ironing':      'bg-orange-100 text-orange-700',
  'Dry Cleaning': 'bg-violet-100 text-violet-700',
  'Special':      'bg-rose-100 text-rose-700',
}

export const CareIcon = ({
  paths,
  className = 'w-7 h-7',
}: {
  paths: React.ReactNode
  className?: string
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {paths}
  </svg>
)

// ─── Shared shape primitives ──────────────────────────────────────────────────

const washTub = <path key="tub" d="M4 10H28V21Q28 25 24 25H8Q4 25 4 21Z" />
const washWave = (
  <path key="wave" d="M9 18Q11.5 15.5 14 18Q16.5 20.5 19 18Q21.5 15.5 23 18" />
)
const notX = (
  <path key="x" d="M8 8L24 24M24 8L8 24" strokeWidth="2.2" />
)
const drySquare = <rect key="sq" x="3" y="3" width="26" height="26" rx="2" />
const bigCircle = <circle key="c" cx="16" cy="16" r="12" />
const ironBodyPaths = [
  <path key="body" d="M4 22H23Q27 22 28 20L28 17Q28 15 25 15H10Q7 15 4 18Z" />,
  <path key="handle" d="M11 15V10Q11 9 12 9H15Q16 9 16 10V15" />,
]
const dot = (cx: number) => (
  <circle key={`d${cx}`} cx={cx} cy={19} r={1.5} fill="currentColor" stroke="none" />
)

// ─── Care instruction catalogue ───────────────────────────────────────────────

export const CARE_INSTRUCTIONS: CareInstruction[] = [
  // ── Washing ──────────────────────────────────────────────────────────────────
  {
    id: 'machine-wash',
    label: 'Machine Wash',
    category: 'Washing',
    paths: [washTub, washWave],
  },
  {
    id: 'hand-wash',
    label: 'Hand Wash',
    category: 'Washing',
    paths: [
      washTub,
      <path
        key="fingers"
        d="M16 24V17M13 23V18M19 23V18M11 22V19M21 22V19"
        strokeWidth="1.5"
      />,
    ],
  },
  {
    id: 'warm-wash',
    label: 'Warm Wash (40°C)',
    category: 'Washing',
    paths: [
      washTub,
      <text
        key="t"
        x="16"
        y="21"
        textAnchor="middle"
        fontSize="8"
        fontFamily="sans-serif"
        fill="currentColor"
        stroke="none"
        strokeWidth="0"
      >
        40°
      </text>,
    ],
  },
  {
    id: 'cold-wash',
    label: 'Cold Wash (30°C)',
    category: 'Washing',
    paths: [
      washTub,
      <text
        key="t"
        x="16"
        y="21"
        textAnchor="middle"
        fontSize="8"
        fontFamily="sans-serif"
        fill="currentColor"
        stroke="none"
        strokeWidth="0"
      >
        30°
      </text>,
    ],
  },
  {
    id: 'do-not-wash',
    label: 'Do Not Wash',
    category: 'Washing',
    paths: [washTub, notX],
  },

  // ── Bleaching ─────────────────────────────────────────────────────────────────
  {
    id: 'bleach',
    label: 'Bleach Allowed',
    category: 'Bleaching',
    paths: <path d="M16 4L29 28H3Z" />,
  },
  {
    id: 'non-chlorine-bleach',
    label: 'Non-Chlorine Bleach',
    category: 'Bleaching',
    paths: [
      <path key="tri" d="M16 4L29 28H3Z" />,
      <line key="ln" x1="16" y1="14" x2="16" y2="24" strokeWidth="2" />,
    ],
  },
  {
    id: 'no-bleach',
    label: 'Do Not Bleach',
    category: 'Bleaching',
    paths: [<path key="tri" d="M16 4L29 28H3Z" />, notX],
  },

  // ── Drying ────────────────────────────────────────────────────────────────────
  {
    id: 'tumble-dry',
    label: 'Tumble Dry',
    category: 'Drying',
    paths: [drySquare, <circle key="ci" cx="16" cy="16" r="8" />],
  },
  {
    id: 'no-tumble-dry',
    label: 'Do Not Tumble Dry',
    category: 'Drying',
    paths: [drySquare, <circle key="ci" cx="16" cy="16" r="8" />, notX],
  },
  {
    id: 'line-dry',
    label: 'Line Dry',
    category: 'Drying',
    paths: [drySquare, <line key="vl" x1="16" y1="5" x2="16" y2="27" />],
  },
  {
    id: 'flat-dry',
    label: 'Flat Dry',
    category: 'Drying',
    paths: [drySquare, <line key="hl" x1="5" y1="16" x2="27" y2="16" />],
  },
  {
    id: 'drip-dry',
    label: 'Drip Dry',
    category: 'Drying',
    paths: [
      drySquare,
      <path key="drips" d="M11 10V20M16 10V20M21 10V20" />,
    ],
  },
  {
    id: 'shade-dry',
    label: 'Shade Dry',
    category: 'Drying',
    paths: [
      drySquare,
      <path
        key="hatch"
        d="M3 13L13 3M3 22L22 3M3 29L29 3M12 29L29 12M21 29L29 21"
        strokeWidth="1"
      />,
    ],
  },

  // ── Ironing ───────────────────────────────────────────────────────────────────
  {
    id: 'iron-low',
    label: 'Iron Low Heat',
    category: 'Ironing',
    paths: [...ironBodyPaths, dot(16)],
  },
  {
    id: 'iron-medium',
    label: 'Iron Medium Heat',
    category: 'Ironing',
    paths: [...ironBodyPaths, dot(13), dot(19)],
  },
  {
    id: 'iron-high',
    label: 'Iron High Heat',
    category: 'Ironing',
    paths: [...ironBodyPaths, dot(10), dot(16), dot(22)],
  },
  {
    id: 'no-iron',
    label: 'Do Not Iron',
    category: 'Ironing',
    paths: [...ironBodyPaths, notX],
  },
  {
    id: 'iron-no-steam',
    label: 'Iron – No Steam',
    category: 'Ironing',
    paths: [
      ...ironBodyPaths,
      <path
        key="nosteam"
        d="M12 8L15 5M15 8L12 5"
        strokeWidth="1.6"
      />,
    ],
  },

  // ── Dry Cleaning ──────────────────────────────────────────────────────────────
  {
    id: 'dry-clean',
    label: 'Dry Clean',
    category: 'Dry Cleaning',
    paths: bigCircle,
  },
  {
    id: 'no-dry-clean',
    label: 'Do Not Dry Clean',
    category: 'Dry Cleaning',
    paths: [bigCircle, notX],
  },
  {
    id: 'professional-wet-clean',
    label: 'Professional Wet Clean',
    category: 'Dry Cleaning',
    paths: [
      bigCircle,
      <path
        key="w"
        d="M10 12L12.5 22L16 15L19.5 22L22 12"
        strokeWidth="1.8"
      />,
    ],
  },

  // ── Special ───────────────────────────────────────────────────────────────────
  {
    id: 'do-not-wring',
    label: 'Do Not Wring',
    category: 'Special',
    paths: [
      <path
        key="tw1"
        d="M4 14Q8 10 12 14Q16 18 20 14Q24 10 28 14"
      />,
      <path
        key="tw2"
        d="M4 20Q8 16 12 20Q16 24 20 20Q24 16 28 20"
      />,
      notX,
    ],
  },
  {
    id: 'wash-separately',
    label: 'Wash Separately',
    category: 'Special',
    paths: [
      washTub,
      <path
        key="sep"
        d="M8 14L13 17L8 20M24 14L19 17L24 20"
        strokeWidth="1.5"
      />,
    ],
  },
]

// ─── Modal component ──────────────────────────────────────────────────────────

interface CareInstructionModalProps {
  isOpen: boolean
  selected: string[]
  onAdd: (instructions: string[]) => void
  onClose: () => void
}

export default function CareInstructionModal({
  isOpen,
  selected,
  onAdd,
  onClose,
}: CareInstructionModalProps) {
  const [pendingSelected, setPendingSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [othersEnabled, setOthersEnabled] = useState(false)
  const [othersText, setOthersText] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const ids = new Set<string>()
    selected.forEach(label => {
      const match = CARE_INSTRUCTIONS.find(c => c.label === label)
      if (match) ids.add(match.id)
    })
    setPendingSelected(ids)
    setSearch('')
    setOthersEnabled(false)
    setOthersText('')
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return CARE_INSTRUCTIONS
    return CARE_INSTRUCTIONS.filter(
      c => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    )
  }, [search])

  const grouped = useMemo(() => {
    const map: Record<string, CareInstruction[]> = {}
    filtered.forEach(c => {
      if (!map[c.category]) map[c.category] = []
      map[c.category].push(c)
    })
    return map
  }, [filtered])

  const toggle = (id: string) => {
    setPendingSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAdd = () => {
    const result: string[] = []
    CARE_INSTRUCTIONS.forEach(c => {
      if (pendingSelected.has(c.id)) result.push(c.label)
    })
    const custom = othersText.trim()
    if (othersEnabled && custom) result.push(custom)
    onAdd(result)
    onClose()
  }

  const totalSelected =
    pendingSelected.size + (othersEnabled && othersText.trim() ? 1 : 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Care Instructions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select all applicable care symbols for this product
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search care instructions…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {Object.entries(grouped).map(([category, instructions]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${CATEGORY_PILL[category] || 'bg-slate-100 text-slate-500'}`}>
                  {category}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {instructions.map(instruction => {
                  const checked = pendingSelected.has(instruction.id)
                  const iconColor = CATEGORY_COLORS[instruction.category] || 'text-slate-500'
                  const checkedStyle = CATEGORY_BORDER[instruction.category] || 'border-brand-500 bg-brand-50 text-brand-700'
                  return (
                    <button
                      key={instruction.id}
                      type="button"
                      onClick={() => toggle(instruction.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        checked
                          ? checkedStyle
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`flex-shrink-0 ${iconColor} ${!checked ? 'opacity-70' : ''}`}>
                        <CareIcon paths={instruction.paths} className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-medium leading-tight">
                        {instruction.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Custom instruction — only shown when not searching */}
          {!search && (
            <div>
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Custom
              </h3>
              <button
                type="button"
                onClick={() => setOthersEnabled(v => !v)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all w-full ${
                  othersEnabled
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`flex-shrink-0 ${
                    othersEnabled ? 'text-brand-600' : 'text-slate-400'
                  }`}
                >
                  <svg
                    viewBox="0 0 32 32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    className="w-7 h-7"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="26" height="26" rx="3" strokeDasharray="3 3" />
                    <path d="M10 16H22M16 10V22" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Others (Custom Instruction)</span>
              </button>
              {othersEnabled && (
                <input
                  type="text"
                  value={othersText}
                  onChange={e => setOthersText(e.target.value)}
                  placeholder="e.g., Store in a cool, dry place"
                  className="mt-2 w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  autoFocus
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-slate-500">
            {totalSelected > 0 ? `${totalSelected} selected` : 'None selected'}
          </span>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              className="bg-brand-500 text-white hover:bg-[#313131]"
            >
              Add Selected
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
