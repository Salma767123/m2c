"use client"

import { useEffect, useRef, useState } from 'react'
import {
  LifeBuoy, Plus, ArrowLeft, Send, Clock, CheckCircle, AlertCircle,
  Shield, MessageSquare, Tag, Calendar, User as UserIcon, ChevronRight,
} from 'lucide-react'
import Reveal from '@/components/WebSite/Shared/Reveal'
import Dropdown from '@/components/UI/Dropdown'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import supportService, { SupportTicket, TicketMessage } from '@/services/supportService'
import TicketAttachments from '@/components/AdminDashboard/Support/TicketAttachments'

// The ticket status/priority are stored as free strings on the backend. Normalise
// here so a value written by any portal (admin uses "in-progress", the schema comment
// says "in_progress") renders consistently for the customer.
const normStatus = (s?: string) => (s || '').toLowerCase().replace(/_/g, '-')

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  open: { label: 'Open', cls: 'bg-red-50 text-red-700 border-red-200', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  'in-progress': { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock className="w-3.5 h-3.5" /> },
  resolved: { label: 'Resolved', cls: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  closed: { label: 'Closed', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Shield className="w-3.5 h-3.5" /> },
}
const statusMeta = (s?: string) => STATUS_META[normStatus(s)] || STATUS_META.open

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  urgent: { label: 'Urgent', cls: 'bg-red-50 text-red-700 border-red-200' },
  high: { label: 'High', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  low: { label: 'Low', cls: 'bg-green-50 text-green-700 border-green-200' },
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
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const DESCRIPTION_MIN = 20
const DESCRIPTION_MAX = 600

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
    <Reveal className="bg-white rounded-2xl ring-1 ring-black/5 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a] flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-[#e01a1b]" /> Support Tickets
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">Raise an issue and track responses from our team</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="inline-flex items-center gap-2 bg-[#e01a1b] hover:bg-[#c41617] text-white text-sm font-semibold py-2.5 px-4 rounded-full transition-colors shrink-0 shadow-[0_6px_20px_rgba(224,26,27,0.25)]"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#e01a1b]" />
          <span className="ml-3 text-slate-500 text-sm">Loading tickets…</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4">
            <LifeBuoy className="w-7 h-7 text-[#e01a1b]" />
          </div>
          <p className="font-semibold text-slate-800">No support tickets yet</p>
          <p className="text-sm text-slate-500 mt-1 mb-5">Have an issue with an order or your account? Raise a ticket and we&apos;ll help.</p>
          <button
            onClick={() => setView('create')}
            className="inline-flex items-center gap-2 bg-[#e01a1b] hover:bg-[#c41617] text-white text-sm font-semibold py-2.5 px-5 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" /> Create your first ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const sm = statusMeta(t.status)
            const pm = priorityMeta(t.priority)
            return (
              <button
                key={t.id}
                onClick={() => openDetail(t.id)}
                className="w-full text-left border border-slate-200 rounded-xl p-4 hover:border-[#e01a1b]/40 hover:bg-red-50/20 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">{t.ticketId}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sm.cls}`}>
                        {sm.icon}{sm.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${pm.cls}`}>{pm.label}</span>
                    </div>
                    <p className="font-semibold text-slate-900 mt-1.5 truncate">{t.subject}</p>
                    <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{t.description}</p>
                    <p className="text-xs text-slate-400 mt-1.5">Raised {fmtDate(t.createdAt)}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#e01a1b] shrink-0 mt-1" />
                </div>
              </button>
            )
          })}
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

  const inputCls = (bad?: boolean) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
      bad ? 'border-red-400 bg-red-50/40 focus:ring-red-500/30' : 'border-slate-300 focus:ring-[#e01a1b]/30 focus:border-transparent'
    }`

  return (
    <Reveal className="bg-white rounded-2xl ring-1 ring-black/5 p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 rounded-full hover:bg-slate-100 transition-colors" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a]">New Support Ticket</h3>
          <p className="text-sm text-slate-500 mt-0.5">Tell us what went wrong and we&apos;ll help sort it out</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className={`grid grid-cols-1 gap-4 ${form.category === 'other' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
            <input
              value={form.subject}
              onChange={(e) => { setForm((p) => ({ ...p, subject: e.target.value })); clearErr('subject') }}
              placeholder="Brief summary of your issue"
              className={inputCls(!!errors.subject)}
            />
            {errors.subject && <p className="text-xs text-red-600 mt-1">{errors.subject}</p>}
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
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Specify <span className="text-red-500">*</span></label>
              <input
                value={form.otherCategory}
                onChange={(e) => { setForm((p) => ({ ...p, otherCategory: e.target.value })); clearErr('otherCategory') }}
                placeholder="Enter the category"
                className={inputCls(!!errors.otherCategory)}
              />
              {errors.otherCategory && <p className="text-xs text-red-600 mt-1">{errors.otherCategory}</p>}
            </div>
          )}
        </div>

        <div className="sm:max-w-[50%]">
          <Dropdown
            label="Priority"
            value={form.priority}
            options={PRIORITY_OPTIONS}
            onChange={(v) => setForm((p) => ({ ...p, priority: v as string }))}
            placeholder="Select priority"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description <span className="text-red-500">*</span></label>
          <textarea
            value={form.description}
            onChange={(e) => { setForm((p) => ({ ...p, description: e.target.value })); clearErr('description') }}
            rows={5}
            placeholder="Describe your issue in detail — include order numbers or dates where relevant."
            className={inputCls(!!errors.description) + ' resize-none'}
          />
          <div className="flex justify-between mt-1">
            {errors.description ? <p className="text-xs text-red-600">{errors.description}</p> : <span />}
            <span className={`text-xs ${form.description.length > DESCRIPTION_MAX ? 'text-red-600' : 'text-slate-400'}`}>{form.description.length}/{DESCRIPTION_MAX}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-[#e01a1b] hover:bg-[#c41617] disabled:opacity-60 text-white text-sm font-semibold py-2.5 px-5 rounded-full transition-colors shadow-[0_6px_20px_rgba(224,26,27,0.25)]"
          >
            <Send className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Submit Ticket'}
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
      <div className="bg-white rounded-2xl ring-1 ring-black/5 p-6 flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#e01a1b]" />
        <span className="ml-3 text-slate-500 text-sm">Loading ticket…</span>
      </div>
    )
  }
  if (!ticket) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-black/5 p-6 text-center py-16">
        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Ticket not found</p>
        <button onClick={onBack} className="mt-4 text-sm text-[#e01a1b] font-semibold hover:underline">Back to tickets</button>
      </div>
    )
  }

  const sm = statusMeta(ticket.status)
  const pm = priorityMeta(ticket.priority)
  const isClosed = ['resolved', 'closed'].includes(normStatus(ticket.status))

  return (
    <Reveal className="bg-white rounded-2xl ring-1 ring-black/5 p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 transition-colors shrink-0" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400">{ticket.ticketId}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sm.cls}`}>{sm.icon}{sm.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${pm.cls}`}>{pm.label} priority</span>
          </div>
          <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a] mt-1.5">{ticket.subject}</h3>
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {ticket.category}</span>
            <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtDate(ticket.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Original description */}
      <div className="bg-slate-50 rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Your issue</p>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
        <TicketAttachments urls={ticket.attachments} />
      </div>

      {/* Conversation */}
      <div className="space-y-3 mb-4 max-h-[360px] overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No replies yet. Our team will respond soon.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderType === 'user'
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-[#e01a1b] text-white' : 'bg-slate-100 text-slate-800'}`}>
                  <div className={`flex items-center gap-1.5 mb-1 text-[11px] font-semibold ${mine ? 'text-white/80' : 'text-slate-500'}`}>
                    {mine ? <UserIcon className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    {mine ? 'You' : (m.senderName || 'Support')}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                  <TicketAttachments urls={m.attachments} dark={mine} />
                  <p className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-slate-400'}`}>{fmtDateTime(m.createdAt)}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Reply / actions */}
      {isClosed ? (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500 inline-flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-600" /> This ticket is {sm.label.toLowerCase()}.
          </p>
          <button
            onClick={() => setStatus('open', 'Ticket reopened')}
            className="text-sm font-semibold text-[#e01a1b] hover:underline"
          >
            Reopen ticket
          </button>
        </div>
      ) : (
        <form onSubmit={sendReply} className="border-t border-slate-100 pt-4">
          <div className="flex items-end gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              placeholder="Type your reply…"
              className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/30 focus:border-transparent"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e) } }}
            />
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className="inline-flex items-center gap-2 bg-[#e01a1b] hover:bg-[#c41617] disabled:opacity-50 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors shrink-0"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={() => setStatus('resolved', 'Ticket marked as resolved')}
              className="text-xs font-semibold text-slate-500 hover:text-green-700 transition-colors inline-flex items-center gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Mark as resolved
            </button>
          </div>
        </form>
      )}
    </Reveal>
  )
}
