'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

/**
 * A small select, drawn rather than handed to the operating system.
 *
 * The storefront's account pages were using the admin dashboard's Dropdown.
 * Two problems with that: it is styled for slate-and-white admin screens, and
 * its menu stays open while the page scrolls, so scrolling away from the
 * control leaves the list floating over the header with nothing under it.
 *
 * This one closes on a scroll, on a click anywhere else, and on Escape, and it
 * keeps the keyboard behaviour a native <select> gives you for free.
 */
export default function SelectMenu({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = 'Select',
  className = '',
  buttonClassName = '',
  align = 'left',
  tone = 'warm',
}: {
  value: string
  options: SelectOption[]
  onChange: (v: string) => void
  ariaLabel?: string
  placeholder?: string
  className?: string
  buttonClassName?: string
  align?: 'left' | 'right'
  /** Which page the control is standing on: the account area's linen, or the
   *  orders page's slate. Only the frame changes. */
  tone?: 'warm' | 'slate'
}) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(0)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const current = options.find((o) => o.value === value)
  const slate = tone === 'slate'

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    const away = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    // Capture, because the page scrolls on <body> here rather than the window,
    // and a menu anchored to a control that has left the screen is no longer
    // anchored to anything the reader can see.
    const scrolled = () => setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('scroll', scrolled, true)
    window.addEventListener('resize', scrolled)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('scroll', scrolled, true)
      window.removeEventListener('resize', scrolled)
    }
  }, [open])

  // The row the arrows start from is decided as the list opens, not in an
  // effect afterwards: it is part of opening, not a reaction to it.
  const openList = () => {
    setFocused(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <style>{`
        @keyframes m2cMenuIn {
          from { opacity: 0; transform: translateY(-6px) }
          to   { opacity: 1; transform: none }
        }
        .m2c-menu { animation: m2cMenuIn 150ms cubic-bezier(0.22, 1, 0.36, 1) }
        @media (prefers-reduced-motion: reduce) { .m2c-menu { animation: none } }
      `}</style>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openList()
          }
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium transition ${
          open
            ? slate ? 'border-[#e01a1b] ring-2 ring-[#e01a1b]/40' : 'border-[#e01a1b]/40 ring-2 ring-[#e01a1b]/15'
            : slate ? 'border-slate-300 hover:border-[#e01a1b]/40' : 'border-[#e6dcd0] hover:border-[#e01a1b]/30'
        } ${current ? (slate ? 'text-slate-900' : 'text-[#1a1a1a]') : (slate ? 'text-slate-400' : 'text-[#a89a8d]')} ${buttonClassName}`}
      >
        <span className="truncate">{current ? current.label : placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${slate ? 'text-slate-400' : 'text-[#a89a8d]'} ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return }
            if (e.key === 'ArrowDown') { e.preventDefault(); setFocused((i) => (i + 1) % options.length); return }
            if (e.key === 'ArrowUp') { e.preventDefault(); setFocused((i) => (i - 1 + options.length) % options.length); return }
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[focused].value) }
          }}
          className={`m2c-menu absolute z-40 mt-2 w-full min-w-[11rem] overflow-hidden rounded-2xl border bg-white p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.13)] outline-none ${
            slate ? 'border-slate-200' : 'border-[#e6dcd0]'
          } ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {options.map((o, i) => {
            const on = o.value === value
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={on}
                onClick={() => choose(o.value)}
                onMouseEnter={() => setFocused(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                  on
                    ? 'bg-[#e01a1b]/[0.06] font-semibold text-[#e01a1b]'
                    : focused === i
                      ? 'bg-[#faf7f3] text-[#3f3a35]'
                      : 'text-[#5f5550]'
                }`}
              >
                <span>{o.label}</span>
                {on && <Check className="h-4 w-4 shrink-0" strokeWidth={2.6} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
