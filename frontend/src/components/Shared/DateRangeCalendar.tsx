'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

export const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const parseDate = (s: string) => new Date(s + 'T00:00:00')
export const prettyDate = (s: string) =>
  s ? parseDate(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function DateRangeCalendar({
  from,
  to,
  onChange,
  placeholder = 'Date',
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<Date>(() => (from ? parseDate(from) : new Date()))
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const handleDayClick = (day: Date) => {
    const ds = fmtDate(day)
    // Start a fresh range if none started or a full range already exists.
    if (!from || (from && to)) {
      onChange(ds, '')
    } else {
      // from is set, to is empty → set the second endpoint
      if (parseDate(ds) < parseDate(from)) {
        onChange(ds, from)
      } else {
        onChange(from, ds)
      }
    }
  }

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  const fromD = from ? parseDate(from) : null
  const toD = to ? parseDate(to) : null
  const inRange = (d: Date) => fromD && toD && d >= fromD && d <= toD
  const isEndpoint = (d: Date) =>
    (fromD && fmtDate(d) === from) || (toD && fmtDate(d) === to)

  const label = from
    ? to
      ? `${prettyDate(from)} – ${prettyDate(to)}`
      : `${prettyDate(from)} – …`
    : placeholder

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 px-3 py-3 border rounded-xl bg-white text-sm transition-colors hover:border-brand-300 ${
          from ? 'border-brand-300 text-slate-700' : 'border-slate-200 text-slate-500'
        }`}
      >
        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
        <span className="whitespace-nowrap font-medium">{label}</span>
        {from && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onChange('', '')
            }}
            className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Clear date filter"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg p-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              className="p-1 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800">{MONTHS[month]} {year}</span>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              className="p-1 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{w}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d, i) =>
              d === null ? (
                <div key={`e-${i}`} />
              ) : (
                <button
                  key={fmtDate(d)}
                  type="button"
                  onClick={() => handleDayClick(d)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center text-sm rounded-lg transition-colors ${
                    isEndpoint(d)
                      ? 'bg-brand-500 text-white font-semibold'
                      : inRange(d)
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d.getDate()}
                </button>
              )
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onChange('', '')}
              className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
