'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerFieldProps {
  /** ISO date string 'YYYY-MM-DD'. */
  value?: string
  onChange: (value: string) => void
  /** Inclusive ISO bounds — days outside are disabled. */
  min?: string
  max?: string
  disabled?: boolean
  hasError?: boolean
  id?: string
  name?: string
  placeholder?: string
  className?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' for display. */
function toDisplay(v?: string): string {
  if (!v) return ''
  const [y, m, d] = v.split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}

/**
 * A self-contained date picker that renders its calendar in the page (via a
 * portal, positioned relative to the field) instead of relying on the browser's
 * native <input type="date"> popup — whose position we cannot control and which
 * flips to seemingly-random spots inside scroll containers.
 */
export default function DatePickerField({
  value, onChange, min, max, disabled, hasError, id, name, placeholder = 'dd/mm/yyyy', className = '',
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)

  // Month currently shown in the calendar (0-indexed month).
  const initial = value ? new Date(value + 'T00:00:00') : new Date()
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  // Re-sync the visible month to the selected value whenever the picker opens.
  useEffect(() => {
    if (!open) return
    const d = value ? new Date(value + 'T00:00:00') : new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }, [open, value])

  // Position the popover relative to the trigger, flipping above when there is
  // not enough room below.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const place = () => {
      const r = btnRef.current!.getBoundingClientRect()
      const POP_H = 340, POP_W = 288
      const below = window.innerHeight - r.bottom
      const top = below < POP_H + 8 && r.top > POP_H ? r.top - POP_H - 6 : r.bottom + 6
      let left = r.left
      if (left + POP_W > window.innerWidth - 8) left = window.innerWidth - POP_W - 8
      setPos({ top, left: Math.max(8, left) })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const outOfRange = (dayIso: string): boolean => Boolean((min && dayIso < min) || (max && dayIso > max))

  const pick = (dayIso: string) => {
    if (outOfRange(dayIso)) return
    onChange(dayIso)
    setOpen(false)
  }

  const prevMonth = () => {
    setViewMonth((m) => { if (m === 0) { setViewYear((y) => y - 1); return 11 } return m - 1 })
  }
  const nextMonth = () => {
    setViewMonth((m) => { if (m === 11) { setViewYear((y) => y + 1); return 0 } return m + 1 })
  }

  // Build the 6×7 day grid for the visible month.
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const todayIso = (() => { const n = new Date(); return iso(n.getFullYear(), n.getMonth(), n.getDate()) })()

  const base = 'w-full flex items-center justify-between px-3 py-2 border rounded-lg text-left text-sm transition-colors focus:outline-none focus:ring-2'
  const state = disabled
    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
    : hasError
      ? 'border-red-500 bg-red-50/40 focus:ring-red-500/40 focus:border-red-500'
      : 'border-slate-200 bg-white focus:ring-brand-500/40 focus:border-slate-500 hover:border-slate-300'

  return (
    <>
      <button
        type="button"
        id={id}
        ref={btnRef}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${base} ${state} ${className}`}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>{toDisplay(value) || placeholder}</span>
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
      </button>
      {/* Hidden field so the value still participates in normal form semantics. */}
      {name && <input type="hidden" name={name} value={value || ''} readOnly />}

      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 288, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-800">{MONTHS[viewMonth]} {viewYear}</p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" aria-label="Previous month">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" aria-label="Next month">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-center text-[11px] font-semibold text-slate-400 py-1">{w}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />
              const dayIso = iso(viewYear, viewMonth, d)
              const disabledDay = outOfRange(dayIso)
              const selected = value === dayIso
              const isToday = todayIso === dayIso
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => pick(dayIso)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-sm transition-colors ${
                    selected
                      ? 'bg-brand-500 text-white font-semibold'
                      : disabledDay
                        ? 'text-slate-300 cursor-not-allowed'
                        : isToday
                          ? 'text-brand-600 font-semibold hover:bg-brand-50'
                          : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-xs font-medium text-slate-500 hover:text-slate-700">
              Clear
            </button>
            <button
              type="button"
              onClick={() => pick(todayIso)}
              disabled={outOfRange(todayIso)}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:text-slate-300 disabled:cursor-not-allowed"
            >
              Today
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
