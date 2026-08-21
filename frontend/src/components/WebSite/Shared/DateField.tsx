'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/** `YYYY-MM-DD` from local parts. toISOString() would shift the day for
 *  anyone east or west of UTC, which is how date pickers lose a day. */
function toKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function fromKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function pretty(key: string): string {
  const d = fromKey(key)
  if (!d) return ''
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

/**
 * A date field with a calendar of its own.
 *
 * `<input type="date">` hands its popup to the operating system: a square
 * white box with a blue highlight, which is the one part of the page that
 * cannot be styled. This draws the calendar instead, so it matches everything
 * around it, and still speaks `YYYY-MM-DD` in and out so nothing downstream
 * has to change.
 */
export default function DateField({
  value,
  onChange,
  min,
  max,
  label,
  placeholder = 'Any date',
  className = '',
  align = 'left',
  tone = 'warm',
}: {
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
  label?: string
  placeholder?: string
  className?: string
  align?: 'left' | 'right'
  /** Which page the field is standing on: the account area's linen, or the
   *  orders page's slate. Only the frame and the label change. */
  tone?: 'warm' | 'slate'
}) {
  const [open, setOpen] = useState(false)
  /** The month on show, as `YYYY-MM`. Decided when the calendar opens rather
   *  than at first render, so the server and the browser cannot disagree. */
  const [view, setView] = useState<{ y: number; m: number } | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const shut = () => setOpen(false)
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('scroll', shut, true)
    window.addEventListener('resize', shut)
    window.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('scroll', shut, true)
      window.removeEventListener('resize', shut)
      window.removeEventListener('keydown', key)
    }
  }, [open])

  const openPicker = () => {
    const base = fromKey(value) || new Date()
    setView({ y: base.getFullYear(), m: base.getMonth() })
    setOpen(true)
  }

  const minD = min ? fromKey(min) : null
  const maxD = max ? fromKey(max) : null
  const todayKey = toKey(new Date())

  const blocked = (d: Date) => {
    const k = toKey(d)
    if (minD && k < toKey(minD)) return true
    if (maxD && k > toKey(maxD)) return true
    return false
  }

  const shift = (by: number) => {
    if (!view) return
    const d = new Date(view.y, view.m + by, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }

  const slate = tone === 'slate'
  const frame = slate
    ? { idle: 'border-slate-300 hover:border-[#e01a1b]/40', on: 'border-[#e01a1b] ring-2 ring-[#e01a1b]/40', radius: 'rounded-lg sm:rounded-md' }
    : { idle: 'border-[#e6dcd0] hover:border-[#e01a1b]/30', on: 'border-[#e01a1b]/40 ring-2 ring-[#e01a1b]/15', radius: 'rounded-xl' }

  const cells = (() => {
    if (!view) return []
    const first = new Date(view.y, view.m, 1)
    const lead = (first.getDay() + 6) % 7           // Monday-first
    const days = new Date(view.y, view.m + 1, 0).getDate()
    const rows = Math.ceil((lead + days) / 7)
    return Array.from({ length: rows * 7 }, (_, i) => new Date(view.y, view.m, 1 - lead + i))
  })()

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <style>{`
        @keyframes m2cCalIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98) }
          to   { opacity: 1; transform: none }
        }
        .m2c-cal { animation: m2cCalIn 160ms cubic-bezier(0.22, 1, 0.36, 1) }
        @media (prefers-reduced-motion: reduce) { .m2c-cal { animation: none } }
      `}</style>

      {label && (
        <span className={`mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] ${slate ? 'text-slate-400' : 'text-[#a89a8d]'}`}>
          {label}
        </span>
      )}

      <div
        className={`flex w-full items-center gap-2 border bg-white px-3 py-2.5 text-sm transition ${frame.radius} ${
          open ? frame.on : frame.idle
        }`}
      >
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openPicker())}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={label ? `${label} date` : 'Choose a date'}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <CalendarDays className={`h-4 w-4 shrink-0 ${value ? 'text-[#e01a1b]' : slate ? 'text-slate-400' : 'text-[#a89a8d]'}`} />
          <span className={`truncate ${value ? `font-medium ${slate ? 'text-slate-900' : 'text-[#1a1a1a]'}` : slate ? 'text-slate-400' : 'text-[#a89a8d]'}`}>
            {value ? pretty(value) : placeholder}
          </span>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            aria-label="Clear this date"
            className={`shrink-0 rounded-full p-0.5 transition-colors hover:text-[#e01a1b] ${slate ? 'text-slate-400 hover:bg-slate-100' : 'text-[#a89a8d] hover:bg-[#faf7f3]'}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && view && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className={`m2c-cal absolute z-50 mt-2 w-[17.5rem] rounded-2xl border bg-white p-3 shadow-[0_18px_44px_rgba(0,0,0,0.15)] ${
            slate ? 'border-slate-200' : 'border-[#e6dcd0]'
          } ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Previous month"
              className="rounded-lg p-1.5 text-[#5f5550] transition-colors hover:bg-[#faf7f3]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-playfair text-[15px] font-semibold text-[#1a1a1a]">
              {MONTHS[view.m]} {view.y}
            </span>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Next month"
              className="rounded-lg p-1.5 text-[#5f5550] transition-colors hover:bg-[#faf7f3]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[#b3a99f]">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d) => {
              const k = toKey(d)
              const outside = d.getMonth() !== view.m
              const off = blocked(d)
              const picked = k === value
              const today = k === todayKey
              return (
                <button
                  key={k}
                  type="button"
                  disabled={off}
                  onClick={() => { onChange(k); setOpen(false) }}
                  aria-current={today ? 'date' : undefined}
                  className={`h-8 rounded-lg text-[13px] tabular-nums transition-colors ${
                    picked
                      ? 'bg-[#e01a1b] font-semibold text-white'
                      : off
                        ? 'cursor-not-allowed text-[#d8cec4]'
                        : outside
                          ? 'text-[#c8bcb1] hover:bg-[#faf7f3]'
                          : 'text-[#3f3a35] hover:bg-[#faf7f3]'
                  } ${today && !picked ? 'font-bold text-[#e01a1b] ring-1 ring-[#e01a1b]/25' : ''}`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-[#f2e9df] pt-2.5">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="rounded-lg px-2 py-1 text-[12.5px] font-semibold text-[#7a6d62] transition-colors hover:bg-[#faf7f3] hover:text-[#1a1a1a]"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={blocked(new Date())}
              onClick={() => { onChange(todayKey); setOpen(false) }}
              className="rounded-lg px-2 py-1 text-[12.5px] font-semibold text-[#e01a1b] transition-colors hover:bg-[#e01a1b]/[0.06] disabled:cursor-not-allowed disabled:text-[#d8cec4] disabled:hover:bg-transparent"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
