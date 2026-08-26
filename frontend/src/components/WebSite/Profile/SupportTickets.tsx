"use client"

import { useEffect, useRef, useState } from 'react'
import {
  LifeBuoy, Plus, ArrowLeft, Send, Clock, CheckCircle, AlertCircle,
  Shield, MessageSquare, Tag, Calendar, User as UserIcon, ChevronRight, Loader2,
} from 'lucide-react'
import Reveal from '@/components/WebSite/Shared/Reveal'
import Dropdown from '@/components/UI/Dropdown'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import supportService, { SupportTicket, TicketMessage } from '@/services/supportService'
import TicketAttachments from '@/components/AdminDashboard/Support/TicketAttachments'

/**
 * Support.
 *
 * Presentation only — every service call, validator and handler below is
 * unchanged. What changed:
 *
 *  · The palette, to match the rest of the account area.
 *
 *  · Priority stopped being a second coloured pill. A ticket row used to carry
 *    a coloured status badge AND a coloured priority badge side by side —
 *    eight possible colours on one line, competing for the same attention, in
 *    front of the subject line that actually identifies the ticket. Priority
 *    is a quiet label with a dot now, and only Urgent and High are coloured,
 *    because those are the only two that mean "sooner".
 *
 *  · All three views (list, new ticket, thread) sit in the same card as the
 *    other tabs, with the same header rhythm.
 */

// The ticket status/priority are stored as free strings on the backend. Normalise
// here so a value written by any portal (admin uses "in-progress", the schema comment
// says "in_progress") renders consistently for the customer.
const normStatus = (s?: string) => (s || '').toLowerCase().replace(/_/g, '-')

/**
 * Status colour is earned: Open needs someone, In Progress is moving,
 * Resolved is done, Closed is filed away and deliberately colourless.
 * Contrast on each badge's own ground is 5.4:1 or better.
 */
const STATUS_META: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  open: { label: 'Open', cls: 'border-[#f0d8d2] bg-[#fdf3f0] text-[#a01718]', Icon: AlertCircle },
  'in-progress': { label: 'In Progress', cls: 'border-[#f0e2c4] bg-[#fdf6e8] text-[#84560f]', Icon: Clock },
  resolved: { label: 'Resolved', cls: 'border-[#d7e7db] bg-[#eef5ef] text-[#2f6b45]', Icon: CheckCircle },
  closed: { label: 'Closed', cls: 'border-[#e6dcd0] bg-[#faf7f3] text-[#5f5550]', Icon: Shield },
}
const statusMeta = (s?: string) => STATUS_META[normStatus(s)] || STATUS_META.open

/** Only the two that mean "sooner" get ink. Medium and Low are the default. */
const PRIORITY_META: Record<string, { label: string; dot: string; ink: string }> = {
  urgent: { label: 'Urgent', dot: 'bg-[#a01718]', ink: 'text-[#a01718]' },
  high: { label: 'High', dot: 'bg-[#c9761a]', ink: 'text-[#8a5411]' },
  medium: { label: 'Medium', dot: 'bg-[#c9bcae]', ink: 'text-[#7a6d62]' },
  low: { label: 'Low', dot: 'bg-[#c9bcae]', ink: 'text-[#7a6d62]' },
}
const priorityMeta = (p?: string) => PRIORITY_META[(p || 'medium').toLowerCase()] || PRIORITY_META.medium

const CATEGORY_OPTIONS = [
  { value: 'order', label: 'Order Issue' },
  { value: 'delivery', label: 'Delivery & Shipping' },
  { value: 'payment', label: 'Payment & Refund' },
  { value: 'product', label: 'Product Quality' },
  { value: 'account', label: 'Account & Login' },
  { value: 'other', label: 'Other' },
]
const DESCRIPTION_MIN = 20
const DESCRIPTION_MAX = 600

const CARD =
  'rounded-2xl border border-[#efe4d8] bg-white p-4 shadow-[0_10px_30px_-24px_rgba(74,50,38,0.5)] sm:p-6 lg:p-7'

const PRIMARY_BTN =
  'inline-flex shrink-0 items-center gap-2 rounded-full bg-[#e01a1b] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(224,26,27,0.8)] transition-all duration-300 hover:bg-[#c41617] disabled:cursor-not-allowed disabled:opacity-60'

const BACK_BTN =
  'shrink-0 rounded-full p-2 text-[#7a6d62] transition-colors hover:bg-[#faf7f3] hover:text-[#1a1a1a]'

const EYEBROW =
  'mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c41617]'

const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}
const fmtDateTime = (iso?: string) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch { return '—' }
}

/** One spinner for all three views, in the page's own colours. */
function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-[#e01a1b]" />
      <span className="ml-3 text-sm text-[#7a6d62]">{label}</span>
    </div>
  )
}

/** Status badge + priority label, used identically in the list and the thread. */
function TicketMeta({ ticket, showPriorityWord = false }: { ticket: SupportTicket; showPriorityWord?: boolean }) {
  const sm = statusMeta(ticket.status)
  const pm = priorityMeta(ticket.priority)
  const StatusIcon = sm.Icon

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="font-mono text-[11px] tracking-tight text-[#a89a8d]">{ticket.ticketId}</span>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${sm.cls}`}>
        <StatusIcon className="h-3 w-3" />
        {sm.label}
      </span>
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${pm.ink}`}>
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${pm.dot}`} />
        {pm.label}{showPriorityWord ? ' priority' : ''}
      </span>
    </div>
  )
}

type View = 'list' | 'create' | 'detail'

export default function SupportTickets() {
  const [view, setView] = useState<View>('list')
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  const loadTickets = async () => {
    try {
      setLoading(true)
      const res = await supportService.getMyTickets()
      if (res.success) setTickets(res.data)
    } catch {
      showErrorToast('Error', 'Failed to load your support tickets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTickets() }, [])

  const openDetail = (id: string) => { setActiveId(id); setView('detail') }
  const backToList = () => { setView('list'); setActiveId(null); loadTickets() }

  if (view === 'create') {
    return <CreateTicket onCancel={() => setView('list')} onCreated={backToList} />
  }
  if (view === 'detail' && activeId) {
    return <TicketDetail ticketId={activeId} onBack={backToList} />
  }

  return (
    <Reveal className={CARD}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#f2e9df] pb-5">
        <div>
          <span className={EYEBROW}>
            <span aria-hidden className="h-px w-5 bg-[#c41617]" />
            We&apos;re here to help
          </span>
          <h2 className="font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl">
            Support
          </h2>
          <p className="mt-1 text-[13px] text-[#7a6d62]">
            Raise an issue and track responses from our team
          </p>
        </div>
        <button onClick={() => setView('create')} className={PRIMARY_BTN}>
          <Plus className="h-4 w-4" /> New ticket
        </button>
      </div>

      {loading ? (
        <Spinner label="Loading tickets…" />
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-[#efe4d8] bg-[#faf7f3] px-6 py-14 text-center">
          <span aria-hidden className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#fdf3f0] text-[#7a0f10]">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a]">No support tickets yet</h3>
          <p className="mx-auto mt-1.5 mb-6 max-w-sm text-sm leading-relaxed text-[#5f5550]">
            Have an issue with an order or your account? Raise a ticket and we&apos;ll help.
          </p>
          <button onClick={() => setView('create')} className={PRIMARY_BTN}>
            <Plus className="h-4 w-4" /> Create your first ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => openDetail(t.id)}
              className="group w-full rounded-xl border border-[#efe4d8] p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e6dcd0] hover:bg-[#faf7f3] hover:shadow-[0_16px_36px_-26px_rgba(74,50,38,0.6)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <TicketMeta ticket={t} />
                  {/* The subject is what identifies the ticket, so it is the
                      largest thing in the row — it used to be the same size as
                      the description under it. */}
                  <p className="mt-2 truncate text-[15px] font-semibold text-[#1a1a1a]">{t.subject}</p>
                  <p className="mt-0.5 line-clamp-1 text-[13.5px] text-[#5f5550]">{t.description}</p>
                  <p className="mt-1.5 text-xs text-[#a89a8d]">Raised {fmtDate(t.createdAt)}</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#c9bcae] transition-colors group-hover:text-[#e01a1b]" />
              </div>
            </button>
          ))}
        </div>
      )}
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Create ticket
// ---------------------------------------------------------------------------
function CreateTicket({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ subject: '', category: 'order', otherCategory: '', priority: 'medium', description: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const clearErr = (k: string) => setErrors((p) => { if (!p[k]) return p; const n = { ...p }; delete n[k]; return n })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.subject.trim()) e.subject = 'Subject is required'
    if (form.category === 'other' && !form.otherCategory.trim()) e.otherCategory = 'Please specify the category'
    const d = form.description.trim()
    if (!d) e.description = 'Description is required'
    else if (d.length < DESCRIPTION_MIN) e.description = `Please add at least ${DESCRIPTION_MIN} characters`
    else if (d.length > DESCRIPTION_MAX) e.description = `Please keep it under ${DESCRIPTION_MAX} characters`
    return e
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }
    setSubmitting(true)
    try {
      const res = await supportService.createTicket({
        subject: form.subject.trim(),
        category: form.category === 'other' ? form.otherCategory.trim() : form.category,
        priority: form.priority,
        description: form.description.trim(),
      })
      if (res.success) {
        showSuccessToast('Ticket Created', 'Our support team will get back to you shortly.')
        onCreated()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create ticket.'
      showErrorToast('Submission Failed', msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Same field definition as Profile Information, so a text input looks the
  // same wherever it appears in the account area.
  const inputCls = (bad?: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-[15px] text-[#1a1a1a] transition-colors duration-200 placeholder:text-[#a89a8d] focus:outline-none focus:ring-2 ${
      bad
        ? 'border-[#e0a9a4] bg-[#fdf6f4] focus:border-[#c41617] focus:ring-[#c41617]/25'
        : 'border-[#e6dcd0] bg-white focus:border-[#e01a1b] focus:ring-[#e01a1b]/25'
    }`

  const labelCls = 'mb-2 block text-[13px] font-semibold text-[#5f5550]'

  return (
    <Reveal className={CARD}>
      <div className="mb-6 flex items-start gap-3 border-b border-[#f2e9df] pb-5">
        <button onClick={onCancel} className={BACK_BTN} aria-label="Back to tickets">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <span className={EYEBROW}>
            <span aria-hidden className="h-px w-5 bg-[#c41617]" />
            New ticket
          </span>
          <h2 className="font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl">
            Tell us what happened
          </h2>
          <p className="mt-1 text-[13px] text-[#7a6d62]">
            The more detail you give, the faster we can sort it out
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className={`grid grid-cols-1 gap-5 ${form.category === 'other' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <div>
            <label htmlFor="ticket-subject" className={labelCls}>
              Subject <span className="text-[#e01a1b]">*</span>
            </label>
            <input
              id="ticket-subject"
              value={form.subject}
              onChange={(e) => { setForm((p) => ({ ...p, subject: e.target.value })); clearErr('subject') }}
              placeholder="Brief summary of your issue"
              className={inputCls(!!errors.subject)}
            />
            {errors.subject && <p className="mt-1.5 text-xs font-medium text-[#a01718]">{errors.subject}</p>}
          </div>
          <div>
            <Dropdown
              label="Category"
              value={form.category}
              options={CATEGORY_OPTIONS}
              onChange={(v) => { const n = v as string; setForm((p) => ({ ...p, category: n, otherCategory: n === 'other' ? p.otherCategory : '' })); if (n !== 'other') clearErr('otherCategory') }}
              placeholder="Select category"
            />
          </div>
          {form.category === 'other' && (
            <div>
              <label htmlFor="ticket-other" className={labelCls}>
                Specify <span className="text-[#e01a1b]">*</span>
              </label>
              <input
                id="ticket-other"
                value={form.otherCategory}
                onChange={(e) => { setForm((p) => ({ ...p, otherCategory: e.target.value })); clearErr('otherCategory') }}
                placeholder="Enter the category"
                className={inputCls(!!errors.otherCategory)}
              />
              {errors.otherCategory && <p className="mt-1.5 text-xs font-medium text-[#a01718]">{errors.otherCategory}</p>}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="ticket-description" className={labelCls}>
            Description <span className="text-[#e01a1b]">*</span>
          </label>
          <textarea
            id="ticket-description"
            value={form.description}
            onChange={(e) => { setForm((p) => ({ ...p, description: e.target.value })); clearErr('description') }}
            rows={5}
            placeholder="Describe your issue in detail — include order numbers or dates where relevant."
            className={inputCls(!!errors.description) + ' resize-none leading-relaxed'}
          />
          <div className="mt-1.5 flex justify-between">
            {errors.description ? (
              <p className="text-xs font-medium text-[#a01718]">{errors.description}</p>
            ) : <span />}
            <span className={`text-xs tabular-nums ${form.description.length > DESCRIPTION_MAX ? 'font-semibold text-[#a01718]' : 'text-[#a89a8d]'}`}>
              {form.description.length}/{DESCRIPTION_MAX}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#f2e9df] pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#e6dcd0] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#5f5550] transition-colors hover:bg-[#faf7f3]"
          >
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={PRIMARY_BTN}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Submitting…' : 'Submit ticket'}
          </button>
        </div>
      </form>
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Ticket detail + thread
// ---------------------------------------------------------------------------
function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await supportService.getTicketById(ticketId)
      if (res.success && res.data) {
        setTicket(res.data)
        setMessages(res.data.messages || [])
      }
    } catch {
      showErrorToast('Error', 'Failed to load ticket details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [ticketId])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      const res = await supportService.replyToTicket(ticketId, { message: reply.trim() })
      if (res.success) { setReply(''); load() }
    } catch (err) {
      showErrorToast('Failed', err instanceof Error ? err.message : 'Failed to send reply.')
    } finally {
      setSending(false)
    }
  }

  const setStatus = async (status: string, label: string) => {
    try {
      const res = await supportService.updateTicketStatus(ticketId, status)
      if (res.success) { showSuccessToast('Updated', label); load() }
    } catch (err) {
      showErrorToast('Failed', err instanceof Error ? err.message : 'Failed to update status.')
    }
  }

  if (loading) {
    return (
      <div className={CARD}>
        <Spinner label="Loading ticket…" />
      </div>
    )
  }
  if (!ticket) {
    return (
      <div className={CARD}>
        <div className="rounded-2xl border border-[#efe4d8] bg-[#faf7f3] px-6 py-14 text-center">
          <span aria-hidden className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#fdf3f0] text-[#a01718]">
            <AlertCircle className="h-5 w-5" />
          </span>
          <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a]">Ticket not found</h3>
          <p className="mx-auto mt-1.5 mb-6 max-w-sm text-sm text-[#5f5550]">
            It may have been removed, or the link is out of date.
          </p>
          <button onClick={onBack} className={PRIMARY_BTN}>
            <ArrowLeft className="h-4 w-4" /> Back to tickets
          </button>
        </div>
      </div>
    )
  }

  const sm = statusMeta(ticket.status)
  const isClosed = ['resolved', 'closed'].includes(normStatus(ticket.status))

  return (
    <Reveal className={CARD}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-start gap-3 border-b border-[#f2e9df] pb-5">
        <button onClick={onBack} className={BACK_BTN} aria-label="Back to tickets">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <TicketMeta ticket={ticket} showPriorityWord />
          <h2 className="mt-2 font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a]">
            {ticket.subject}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#a89a8d]">
            <span className="inline-flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> {ticket.category}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {fmtDate(ticket.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* ── The original message ───────────────────────────────────────── */}
      <div className="mb-4 rounded-xl border border-[#efe4d8] bg-[#faf7f3] p-4">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a89a8d]">
          Your issue
        </p>
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-[#3d352f]">
          {ticket.description}
        </p>
        <TicketAttachments urls={ticket.attachments} />
      </div>

      {/* ── Conversation ───────────────────────────────────────────────── */}
      <div className="mb-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="py-10 text-center">
            <MessageSquare className="mx-auto mb-2 h-7 w-7 text-[#d6c9ba]" />
            <p className="text-sm text-[#7a6d62]">No replies yet. Our team will respond soon.</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderType === 'user'
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    mine
                      ? 'bg-[#e01a1b] text-white'
                      : 'border border-[#efe4d8] bg-[#faf7f3] text-[#1a1a1a]'
                  }`}
                >
                  <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${mine ? 'text-white/75' : 'text-[#a89a8d]'}`}>
                    {mine ? <UserIcon className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {mine ? 'You' : (m.senderName || 'Support')}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                  <TicketAttachments urls={m.attachments} dark={mine} />
                  <p className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-[#a89a8d]'}`}>
                    {fmtDateTime(m.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* ── Reply / actions ────────────────────────────────────────────── */}
      {isClosed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f2e9df] pt-4">
          <p className="inline-flex items-center gap-2 text-sm text-[#5f5550]">
            <CheckCircle className="h-4 w-4 text-[#2f6b45]" />
            This ticket is {sm.label.toLowerCase()}.
          </p>
          <button
            onClick={() => setStatus('open', 'Ticket reopened')}
            className="text-[13px] font-semibold text-[#7a0f10] transition-colors hover:text-[#e01a1b] hover:underline"
          >
            Reopen ticket
          </button>
        </div>
      ) : (
        <form onSubmit={sendReply} className="border-t border-[#f2e9df] pt-4">
          <div className="flex items-end gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              placeholder="Type your reply…"
              aria-label="Your reply"
              className="flex-1 resize-none rounded-xl border border-[#e6dcd0] bg-white px-4 py-3 text-sm leading-relaxed text-[#1a1a1a] transition-colors placeholder:text-[#a89a8d] focus:border-[#e01a1b] focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/25"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e) } }}
            />
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#e01a1b] px-4 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#c41617] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setStatus('resolved', 'Ticket marked as resolved')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7a6d62] transition-colors hover:text-[#2f6b45]"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Mark as resolved
            </button>
          </div>
        </form>
      )}
    </Reveal>
  )
}
