'use client'

import React, { useContext, createContext, useState } from 'react'
import { FileText, ExternalLink, Eye, Phone, Mail, Send, Check, Loader2 } from 'lucide-react'
import DocViewerModal from '@/components/UI/DocViewerModal'
import qcCheckerService from '@/services/qcCheckerService'
import { toExternalUrl } from '@/lib/utils'

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

// ── Phone / Email values ──────────────────────────────────────────────────────
// Labels that identify a field as a phone number / email address. Used to
// auto-upgrade plain-text values everywhere in the inspection form without
// each step having to opt in field-by-field.
const PHONE_LABEL_RE = /\b(phone|mobile|landline|whatsapp)\b/i
const EMAIL_LABEL_RE = /e-?mail/i

// Tappable phone number — opens the device dialer via tel: so the checker
// can call the vendor straight from the inspection form.
function PhoneValue({ value }: { value: string }) {
  const dial = value.replace(/[^\d+]/g, '')
  return (
    <a
      href={`tel:${dial}`}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
      title={`Call ${value}`}
    >
      <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {value}
    </a>
  )
}

// Email address with a mailto: link plus a "Test" button that sends a real
// test email through the backend so the checker can confirm the address is
// reachable before marking it verified.
function EmailValue({ value }: { value: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  const sendTest = async () => {
    if (status === 'sending') return
    setStatus('sending')
    try {
      await qcCheckerService.sendTestEmail(value)
      setStatus('sent')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a
        href={`mailto:${value}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline break-all"
        title={`Email ${value}`}
      >
        <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {value}
      </a>
      <button
        type="button"
        onClick={sendTest}
        disabled={status === 'sending'}
        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors shrink-0 ${
          status === 'sent'
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : status === 'failed'
              ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
              : 'text-brand-700 bg-brand-50 border-brand-200 hover:bg-brand-100'
        } disabled:opacity-60 disabled:cursor-not-allowed`}
        title="Send a test email to confirm this address is reachable"
      >
        {status === 'sending' ? (
          <><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Sending…</>
        ) : status === 'sent' ? (
          <><Check className="w-3 h-3" aria-hidden="true" /> Test Sent</>
        ) : status === 'failed' ? (
          <><Send className="w-3 h-3" aria-hidden="true" /> Retry Test</>
        ) : (
          <><Send className="w-3 h-3" aria-hidden="true" /> Test</>
        )}
      </button>
      {status === 'failed' && (
        <span className="text-xs text-red-600">Failed to send — check SMTP config.</span>
      )}
    </div>
  )
}

export function renderValue(value: any, type?: string, label?: string): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400 italic text-sm">Not provided</span>
  }
  // Explicit phone/email types, or auto-detected from the field label so
  // every phone/email in the form is tappable without per-step changes.
  if (typeof value === 'string') {
    const isEmail = type === 'email' || (!type && label && EMAIL_LABEL_RE.test(label) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    if (isEmail) return <EmailValue value={value.trim()} />
    const isPhone = type === 'phone' || (!type && label && PHONE_LABEL_RE.test(label) && /\d{5,}/.test(value.replace(/[^\d]/g, '')))
    if (isPhone) return <PhoneValue value={value.trim()} />
  }
  if (type === 'image' || (type !== 'document' && typeof value === 'string' && isImageUrl(value))) {
    return (
      <img src={value} alt="Uploaded" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
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
    const href = toExternalUrl(value)
    return href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-sm break-all">
        {value}
      </a>
    ) : (
      <span className="text-slate-900 text-sm break-all">{value}</span>
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
      <div className="flex flex-wrap gap-2 mt-1">
        {items.map((item, i) => {
          // Items may be a plain string, or a { flagIso, label } object for
          // countries — the latter renders a real flag image (flag emoji don't
          // render on Windows, which shows the bare ISO letters instead).
          const iso = item && typeof item === 'object' ? item.flagIso : undefined
          const label = item && typeof item === 'object' ? item.label : String(item)
          return (
            <span key={i} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm font-semibold border border-brand-200">
              {iso && (
                <img
                  src={`https://flagcdn.com/w20/${String(iso).toLowerCase()}.png`}
                  alt=""
                  className="w-4 h-auto rounded-[2px] shrink-0"
                  loading="lazy"
                />
              )}
              {label}
            </span>
          )
        })}
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
  type?: 'text' | 'image' | 'document' | 'list' | 'date' | 'url' | 'badge' | 'phone' | 'email'
  /** Optional action rendered in the top-right of the card, beside the label */
  headerAction?: React.ReactNode
}

export default function VerifyField({ fieldKey, label, value, verifications, onChange, type, headerAction }: VerifyFieldProps) {
  const highlightedKeys = useContext(HighlightedFieldsCtx)
  const v = verifications[fieldKey] ?? { ok: null, remarks: '' }
  const isEmpty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
  // A "No" answer requires a reason — flag it when the reason is still empty.
  const missingRemarks = v.ok === false && !v.remarks.trim()
  const needsHighlight = highlightedKeys.has(fieldKey) && (v.ok === null || missingRemarks)

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
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          {headerAction}
        </div>
        <div className="min-h-[1.5rem]">
          {isEmpty
            ? <span className="text-slate-400 italic text-sm">Not provided</span>
            : renderValue(value, type, label)
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
          <p className="text-xs text-red-600 font-medium">
            {v.ok === null
              ? 'Please complete this verification before continuing.'
              : 'A reason is required when marking this "No".'}
          </p>
        )}
        {v.ok === false && (
          <>
            <label className="text-xs font-semibold text-slate-600">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={v.remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Reason for marking No (required)…"
              rows={2}
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 resize-none ${
                needsHighlight && missingRemarks
                  ? 'border-red-400 ring-1 ring-red-300 focus:border-red-500 focus:ring-red-300'
                  : 'border-red-200 focus:border-red-400 focus:ring-red-200'
              }`}
            />
          </>
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
        {isEmpty ? <span className="text-slate-400 italic">—</span> : renderValue(value, type, label)}
      </span>
    </div>
  )
}

// ── DocCard — document/image card with view-only action ──────────────────────
export function DocCard({ doc, index, fieldKey, verifications, onChange }: {
  doc: { name?: string; documentUrl?: string; type?: string }
  index: number
  fieldKey: string
  verifications: Verifications
  onChange: (key: string, ok: boolean | null, remarks: string) => void
}) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const url = doc.documentUrl || ''
  const name = doc.name || doc.type || `Document ${index + 1}`
  const isImg = isImageUrl(url, doc.name)

  const viewButton = url ? (
    <button
      type="button"
      onClick={() => setViewerOpen(true)}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors shrink-0"
    >
      <Eye className="w-3 h-3" /> View
    </button>
  ) : undefined

  return (
    <>
      <VerifyField
        fieldKey={fieldKey}
        label={name}
        value={url}
        type={isImg ? 'image' : 'document'}
        verifications={verifications}
        onChange={onChange}
        headerAction={viewButton}
      />
      {viewerOpen && url && (
        <DocViewerModal
          url={url}
          name={name}
          readOnly
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  )
}
