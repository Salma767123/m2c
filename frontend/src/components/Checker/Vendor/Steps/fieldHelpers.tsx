"use client"

// Shared form-field helpers for the inspection step components.
// Keeps styling and error/required UI consistent across all steps.

import { ChevronDown, Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export const BASE_INPUT =
    "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:outline-none transition-all shadow-xs text-sm text-slate-700 bg-white"
export const OK_BORDER = "border-slate-200 focus:ring-brand-500/40 focus:border-brand-500"
export const ERR_BORDER =
    "border-red-400 focus:ring-red-500/40 focus:border-red-500 bg-red-50/10"

export function inputCls(hasError: boolean, extra = "") {
    return `${BASE_INPUT} ${hasError ? ERR_BORDER : OK_BORDER} ${extra}`.trim()
}

// Standardised dropdown for inspection steps.
//
// A native <select> only lets us style the closed control — the open option
// list is drawn by the OS, so it ignores our red theme. This is a fully
// custom dropdown (button + themed popup) so both the control and the option
// list follow the M2C brand/UI standards.
export type SelectOption = { value: string; label: string }

export function SelectField({
    value,
    onChange,
    options,
    hasError = false,
    disabled = false,
    placeholder = "Select...",
    className = "",
}: {
    value: string
    onChange: (value: string) => void
    options: (string | SelectOption)[]
    hasError?: boolean
    disabled?: boolean
    placeholder?: string
    className?: string
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const items: SelectOption[] = options.map((o) =>
        typeof o === "string" ? { value: o, label: o } : o
    )
    const selected = items.find((o) => o.value === value)

    useEffect(() => {
        if (!open) return
        const onClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        document.addEventListener("mousedown", onClickOutside)
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("mousedown", onClickOutside)
            document.removeEventListener("keydown", onKey)
        }
    }, [open])

    const borderState = hasError
        ? "border-red-400 ring-2 ring-red-500/30"
        : open
            ? "border-brand-500 ring-2 ring-brand-500/40"
            : "border-slate-200 hover:border-slate-300"

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-invalid={hasError || undefined}
                className={`w-full flex items-center justify-between gap-2 pl-4 pr-3 py-3 border rounded-xl bg-white text-sm text-left shadow-xs transition-all focus:outline-none ${borderState} ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${selected ? "text-slate-700" : "text-slate-400"} ${className}`.trim()}
            >
                <span className="truncate">{selected ? selected.label : placeholder}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <ul
                    role="listbox"
                    className="absolute z-30 mt-2 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg shadow-slate-900/10"
                >
                    {items.map((opt) => {
                        const isSelected = opt.value === value
                        return (
                            <li
                                key={opt.value}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                    onChange(opt.value)
                                    setOpen(false)
                                }}
                                className={`mx-1.5 flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${isSelected
                                    ? "bg-brand-50 text-brand-700 font-semibold"
                                    : "text-slate-700 hover:bg-brand-50/70 hover:text-brand-700"
                                    }`}
                            >
                                <span className="truncate">{opt.label}</span>
                                {isSelected && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

export function ErrorText({ msg }: { msg?: string }) {
    if (!msg) return null
    return <p className="mt-2 text-xs text-red-600 font-medium">{msg}</p>
}

export function RequiredMark() {
    return <span className="text-red-500 ml-0.5" aria-label="required">*</span>
}

// Styling for vendor-autofilled, checker-immutable fields.
export const READONLY_CLS = `w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed shadow-none text-sm`
