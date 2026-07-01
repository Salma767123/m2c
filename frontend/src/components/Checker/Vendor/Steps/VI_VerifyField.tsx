'use client'

import React, { useContext, createContext } from 'react'
import { FileText, ExternalLink, Download, Image as ImageIcon } from 'lucide-react'
import { openDoc } from '@/lib/docDownload'

// ── Types ─────────────────────────────────────────────────────────────────────
export type FieldVerification = { ok: boolean | null; remarks: string }
export type Verifications = Record<string, FieldVerification>

// ── Highlight context (set by VendorInspectionForm on validation failure) ─────
const HighlightedFieldsCtx = createContext<Set<string>>(new Set())

export function HighlightFieldsProvider({ keys, children }: { keys: Set<string>; children: React.ReactNode }) {
  return <HighlightedFieldsCtx.Provider value={keys}>{children}</HighlightedFieldsCtx.Provider>
}

// ── Value Renderer ────────────────────────────────────────────────────────────
const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf)(\?|$)/i

function isImageUrl(url?: string, name?: string) {
  if (!url) return false
  if (name) {
    if (DOC_EXT.test(name)) return false
    if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(name)) return true
  }
  if (DOC_EXT.test(url)) return false
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url)) return true
  try { return /\/image\/upload\//.test(new URL(url).pathname) } catch { return false }
}

function docFilename(url: string): string {
  try {
    const path = new URL(url).pathname
    const raw = path.split('/').pop() || 'Document'
    return decodeURIComponent(raw.split('?')[0])
  } catch {
    return 'Document'
  }
}

export function renderValue(value: any, type?: string): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400 italic text-sm">Not provided</span>
  }
  if (type === 'image' || (type !== 'document' && typeof value === 'string' && isImageUrl(value))) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="block w-fit">
        <img src={value} alt="Uploaded" className="w-32 h-32 object-cover rounded-lg border border-slate-200 hover:border-brand-300 transition-colors" />
      </a>
    )
  }
  if (type === 'document' && typeof value === 'string') {
    // Show filename only — the DocCard renders the "Open Document" button separately
    return (
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-sm text-slate-700 break-all">{docFilename(value)}</span>
      </div>
    )
  }
  if (type === 'url' && typeof value === 'string') {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-sm break-all">
        {value}
      </a>
    )
  }
  if (type === 'date' && value) {
    const d = new Date(value)
    if (!isNaN(d.getTime())) {
      return <span className="text-slate-900 text-sm">{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
    }
  }
  if (Array.isArray(value) || type === 'list') {
    const items = Array.isArray(value) ? value : [value]
    if (items.length === 0) return <span className="text-slate-400 italic text-sm">None</span>
    return (
      <div className="flex flex-wrap gap-1.5 mt-0.5">
        {items.map((item, i) => (
          <span key={i} className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
            {String(item)}
          </span>
        ))}
      </div>
    )
  }
  if (type === 'badge' && typeof value === 'string') {
    return (
      <span className="px-2.5 py-0.5 bg-brand-50 text-brand-700 rounded-full text-xs font-bold border border-brand-100">
        {value}
      </span>
    )
  }
  if (typeof value === 'boolean') return <span className="text-slate-900 text-sm">{value ? 'Yes' : 'No'}</span>
  return <span className="text-slate-900 text-sm">{String(value)}</span>
}

// ── VerifyField ───────────────────────────────────────────────────────────────
interface VerifyFieldProps {
  fieldKey: string
  label: string
  value: any
  verifications: Verifications
  onChange: (key: string, ok: boolean | null, remarks: string) => void
  type?: 'text' | 'image' | 'document' | 'list' | 'date' | 'url' | 'badge'
}

export default function VerifyField({ fieldKey, label, value, verifications, onChange, type }: VerifyFieldProps) {
  const highlightedKeys = useContext(HighlightedFieldsCtx)
  const v = verifications[fieldKey] ?? { ok: null, remarks: '' }
  const isEmpty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
  const needsHighlight = highlightedKeys.has(fieldKey) && v.ok === null

  const setOk = (ok: boolean) => onChange(fieldKey, ok, v.remarks)
  const setRemarks = (remarks: string) => onChange(fieldKey, v.ok, remarks)

  return (
    <div
      id={`vf-${fieldKey}`}
      className={`rounded-xl border transition-colors ${
        needsHighlight
          ? 'border-red-500 bg-red-50/40 ring-2 ring-red-400 ring-offset-1'
          : v.ok === true
            ? 'border-emerald-200 bg-emerald-50/30'
            : v.ok === false
              ? 'border-red-200 bg-red-50/20'
              : 'border-slate-200 bg-white'
      }`}
    >
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <div className="min-h-[1.5rem]">
          {isEmpty
            ? <span className="text-slate-400 italic text-sm">Not provided</span>
            : renderValue(value, type)
          }
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-3 flex flex-col gap-2">
        <p className="text-xs font-semibold text-slate-600">Verification</p>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name={`verify_${fieldKey}`}
              checked={v.ok === true}
              onChange={() => setOk(true)}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className={`text-sm font-semibold ${v.ok === true ? 'text-emerald-700' : 'text-slate-600'}`}>Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name={`verify_${fieldKey}`}
              checked={v.ok === false}
              onChange={() => setOk(false)}
              className="w-4 h-4 accent-red-600"
            />
            <span className={`text-sm font-semibold ${v.ok === false ? 'text-red-700' : 'text-slate-600'}`}>No</span>
          </label>
        </div>
        {needsHighlight && (
          <p className="text-xs text-red-600 font-medium">Please complete this verification before continuing.</p>
        )}
        {v.ok === false && (
          <textarea
            value={v.remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks for this field…"
            rows={2}
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-200 resize-none"
          />
        )}
      </div>
    </div>
  )
}

// ── SectionBlock ──────────────────────────────────────────────────────────────
export function SectionBlock({ title, icon, children }: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        {icon && <span className="text-brand-500">{icon}</span>}
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── InfoRow — read-only display (no verification) ─────────────────────────────
export function InfoRow({ label, value, type }: { label: string; value: any; type?: string }) {
  const isEmpty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-sm text-slate-500 shrink-0 font-medium">{label}</span>
      <span className="text-sm text-slate-800 text-right font-medium">
        {isEmpty ? <span className="text-slate-400 italic">—</span> : renderValue(value, type)}
      </span>
    </div>
  )
}

// ── DocCard — document/image card with single open/download action ────────────
export function DocCard({ doc, index, fieldKey, verifications, onChange }: {
  doc: { name?: string; documentUrl?: string; type?: string }
  index: number
  fieldKey: string
  verifications: Verifications
  onChange: (key: string, ok: boolean | null, remarks: string) => void
}) {
  const url = doc.documentUrl || ''
  const name = doc.name || doc.type || `Document ${index + 1}`
  const isImg = isImageUrl(url, doc.name)

  return (
    <div className="space-y-2">
      <VerifyField
        fieldKey={fieldKey}
        label={name}
        value={url}
        type={isImg ? 'image' : 'document'}
        verifications={verifications}
        onChange={onChange}
      />
      {url && (
        isImg ? (
          <button
            type="button"
            onClick={() => openDoc(url, name)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View Full Image
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openDoc(url, name)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition-colors"
          >
            <Download className="w-3 h-3" />
            Open Document
          </button>
        )
      )}
    </div>
  )
}
