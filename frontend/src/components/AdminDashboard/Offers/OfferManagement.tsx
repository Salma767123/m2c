'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Percent, Calendar, Tag, Loader2, X, ImageIcon, Upload, CheckCircle, Clock, XCircle, PauseCircle, PlayCircle } from 'lucide-react'
import { offerService, type Offer, type OfferInput, type OfferStatus } from '@/services/offerService'
import { categoryService } from '@/services/categoryService'
import { adminProductService, type AdminProduct } from '@/services/adminProductService'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import type { OfferType, OfferScope, OfferRegion } from '@/lib/offers'
import Dropdown from '@/components/UI/Dropdown'
import Pagination from '@/components/UI/Pagination'

const TYPE_LABELS: Record<OfferType, string> = {
  PERCENTAGE: 'Percentage off',
  FLAT: 'Flat ₹ off (per unit)',
  QUANTITY: 'Quantity deal',
  BOGO: 'Buy X Get Y free',
  THRESHOLD: 'Cart threshold',
}

const SCOPE_LABELS: Record<OfferScope, string> = {
  PRODUCT: 'Specific products',
  CATEGORY: 'Categories',
  STORE: 'Whole store',
}

const REGION_LABELS: Record<OfferRegion, string> = {
  BOTH: 'Both storefronts',
  IN_ONLY: 'India (.in / ₹)',
  COM_ONLY: 'International (.com / $)',
}

const STATUS_STYLES: Record<OfferStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  PAUSED: 'bg-amber-100 text-amber-700',
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function discountSummary(o: Offer): string {
  switch (o.type) {
    case 'PERCENTAGE':
      return `${o.discountPercent}% off`
    case 'FLAT':
      return `₹${o.discountFlatINR} off/unit`
    case 'QUANTITY':
      return `Buy ${o.minQty}+ → ${o.discountPercent}% off`
    case 'BOGO':
      return `Buy ${o.minQty} get ${o.getQty} free`
    case 'THRESHOLD':
      return `Spend ₹${o.minCartValueINR} → ${o.discountPercent}% off`
    default:
      return '—'
  }
}

export default function OfferManagement() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Offer | null>(null)
  // Clickable metric cards filter the table by status; 'ALL' clears the filter.
  const [statusFilter, setStatusFilter] = useState<OfferStatus | 'ALL'>('ALL')

  // `loading` starts true so the first render shows the spinner without a synchronous
  // setState in the effect (which the React-compiler lint flags). All state updates in
  // load() happen after the await, so re-fetches from handlers are lint-clean too.
  const load = async () => {
    try {
      setOffers(await offerService.getOffers())
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : 'Failed to load offers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(() => {
    const c = { ACTIVE: 0, SCHEDULED: 0, EXPIRED: 0, PAUSED: 0 } as Record<OfferStatus, number>
    offers.forEach((o) => {
      if (o.status) c[o.status] += 1
    })
    return c
  }, [offers])

  // Table respects the active metric-card filter.
  const displayedOffers = useMemo(
    () => (statusFilter === 'ALL' ? offers : offers.filter((o) => (o.status || 'PAUSED') === statusFilter)),
    [offers, statusFilter],
  )

  // Pagination — 10 rows/page, reset to page 1 whenever the filter changes.
  const OFFERS_PER_PAGE = 10
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [statusFilter])
  const totalPages = Math.max(1, Math.ceil(displayedOffers.length / OFFERS_PER_PAGE))
  const pagedOffers = useMemo(
    () => displayedOffers.slice((page - 1) * OFFERS_PER_PAGE, page * OFFERS_PER_PAGE),
    [displayedOffers, page],
  )

  // Metric cards — click to filter the table by that status (click the active one to clear).
  const statCards = [
    { key: 'ACTIVE' as const,    title: 'Active',    value: counts.ACTIVE,    subtitle: 'Live now',     Icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', countColor: 'text-emerald-700', activeClass: 'border-emerald-400 bg-emerald-50/60' },
    { key: 'SCHEDULED' as const, title: 'Scheduled', value: counts.SCHEDULED, subtitle: 'Upcoming',     Icon: Clock,       iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500',  countColor: 'text-indigo-700',  activeClass: 'border-indigo-400 bg-indigo-50/60' },
    { key: 'EXPIRED' as const,   title: 'Expired',   value: counts.EXPIRED,   subtitle: 'Past window',  Icon: XCircle,     iconBg: 'bg-red-50',     iconColor: 'text-red-500',     countColor: 'text-red-700',     activeClass: 'border-red-400 bg-red-50/60' },
    { key: 'PAUSED' as const,    title: 'Paused',    value: counts.PAUSED,    subtitle: 'Disabled',     Icon: PauseCircle, iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   countColor: 'text-amber-700',   activeClass: 'border-amber-400 bg-amber-50/60' },
  ]

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (o: Offer) => {
    setEditing(o)
    setModalOpen(true)
  }

  const handleDelete = async (o: Offer) => {
    if (!window.confirm(`Delete offer "${o.title}"? This cannot be undone.`)) return
    try {
      await offerService.deleteOffer(o.id)
      showSuccessToast('Offer deleted')
      load()
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : 'Failed to delete offer')
    }
  }

  // Activate / pause an offer straight from the row.
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const handleToggleActive = async (o: Offer) => {
    try {
      setTogglingId(o.id)
      await offerService.setOfferActive(o.id, !o.isActive)
      showSuccessToast(o.isActive ? 'Offer paused' : 'Offer activated')
      load()
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : 'Failed to update offer')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Percent className="w-6 h-6 text-[#e01a1b]" /> Offers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automatic, code-less promotions. Applied on the selling price at checkout — vendor payouts are never affected.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-[#e01a1b] text-white px-4 py-2 rounded-lg hover:bg-[#c01718] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Create Offer
        </button>
      </div>

      {/* Metric cards — click a card to filter the table by that status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {statCards.map(({ key, title, value, subtitle, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const isActive = statusFilter === key
          const toggle = () => setStatusFilter((prev) => (prev === key ? 'ALL' : key))
          return (
            <button
              key={key}
              type="button"
              onClick={toggle}
              className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${isActive ? activeClass : 'border-slate-200/80 hover:border-slate-300'}`}
            >
              <div className="flex flex-row items-center justify-between px-3.5 pt-3 pb-1">
                <span className="text-[13px] font-medium text-slate-500">{title}</span>
                <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace('50', '100') : iconBg} transition-transform duration-150 group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
              <div className="px-3.5 pb-3">
                <div className={`text-xl font-bold ${countColor}`}>{value}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : displayedOffers.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Tag className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p>{statusFilter === 'ALL' ? 'No offers yet. Create your first promotion.' : `No ${statusFilter.toLowerCase()} offers.`}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="!bg-brand-500/[0.06] border-b border-brand-100/50 text-left">
                <tr>
                  <th className="px-4 py-3 h-11 font-bold !text-brand-500/60 text-[10px] uppercase tracking-wider">Offer</th>
                  <th className="px-4 py-3 h-11 font-bold !text-brand-500/60 text-[10px] uppercase tracking-wider">Discount</th>
                  <th className="px-4 py-3 h-11 font-bold !text-brand-500/60 text-[10px] uppercase tracking-wider">Scope</th>
                  <th className="px-4 py-3 h-11 font-bold !text-brand-500/60 text-[10px] uppercase tracking-wider">Region</th>
                  <th className="px-4 py-3 h-11 font-bold !text-brand-500/60 text-[10px] uppercase tracking-wider">Window</th>
                  <th className="px-4 py-3 h-11 font-bold !text-brand-500/60 text-[10px] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 h-11 font-bold !text-brand-500/60 text-[10px] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedOffers.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition-colors duration-150 border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{o.title}</div>
                      <div className="text-xs text-gray-400">{TYPE_LABELS[o.type]}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{discountSummary(o)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {SCOPE_LABELS[o.scope]}
                      {o.scope === 'CATEGORY' && o.categoryNames.length > 0 && (
                        <span className="text-xs text-gray-400"> ({o.categoryNames.length})</span>
                      )}
                      {o.scope === 'PRODUCT' && o.productIds.length > 0 && (
                        <span className="text-xs text-gray-400"> ({o.productIds.length})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{REGION_LABELS[o.region]}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {fmtDate(o.startsAt)} → {fmtDate(o.endsAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[o.status || 'PAUSED']}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(o)}
                          disabled={togglingId === o.id}
                          className={`p-1.5 rounded disabled:opacity-50 ${o.isActive ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                          title={o.isActive ? 'Pause offer' : 'Activate offer'}
                        >
                          {togglingId === o.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : o.isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openEdit(o)} className="p-1.5 text-gray-500 hover:text-[#e01a1b] hover:bg-red-50 rounded" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(o)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>

      {modalOpen && (
        <OfferModal
          offer={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            load()
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────── Modal ─────────────────────────────────────

const emptyForm: OfferInput = {
  title: '',
  description: '',
  type: 'PERCENTAGE',
  scope: 'STORE',
  region: 'BOTH',
  priority: 0,
  isActive: true,
  productIds: [],
  categoryNames: [],
}

function toLocalInput(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

function OfferModal({ offer, onClose, onSaved }: { offer: Offer | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<OfferInput>(
    offer
      ? {
          ...offer,
          startsAt: toLocalInput(offer.startsAt),
          endsAt: toLocalInput(offer.endsAt),
        }
      : { ...emptyForm, endsAt: '' }
  )
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [freeProductQuery, setFreeProductQuery] = useState('')

  const set = <K extends keyof OfferInput>(k: K, v: OfferInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  // Load pickers lazily when either the BUY scope or the CROSS-BOGO FREE scope needs them.
  const needsCategories = form.scope === 'CATEGORY' || form.freeScope === 'CATEGORY'
  const needsProducts = form.scope === 'PRODUCT' || form.freeScope === 'PRODUCT'
  useEffect(() => {
    if (needsCategories && categories.length === 0) {
      categoryService
        .getCategories({})
        .then((r) => setCategories(Array.from(new Set(r.data.map((c) => c.name))).sort()))
        .catch(() => {})
    }
    if (needsProducts && products.length === 0) {
      adminProductService
        .getAllProducts({ limit: 500, approvalStatus: 'APPROVED' })
        .then((r) => setProducts(r.data?.products || []))
        .catch(() => {})
    }
  }, [needsCategories, needsProducts, categories.length, products.length])

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(productQuery.toLowerCase())).slice(0, 60),
    [products, productQuery]
  )
  const filteredFreeProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(freeProductQuery.toLowerCase())).slice(0, 60),
    [products, freeProductQuery]
  )

  const toggleId = (list: string[] | undefined, id: string): string[] => {
    const arr = list || []
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
  }

  const submit = async () => {
    if (!form.title?.trim()) return showErrorToast('Title is required')
    if (!form.endsAt) return showErrorToast('End date is required')
    if (form.type === 'BOGO' && form.bogoMode === 'CROSS') {
      if (form.scope === 'STORE') return showErrorToast('Pick a buy product or category for a cross-product BOGO')
      if (!form.freeScope) return showErrorToast('Choose the free item type (product or category)')
      if (form.freeScope === 'PRODUCT' && !(form.freeProductIds || []).length) return showErrorToast('Select at least one free product')
      if (form.freeScope === 'CATEGORY' && !(form.freeCategoryNames || []).length) return showErrorToast('Select at least one free category')
    }
    setSaving(true)
    try {
      const payload: OfferInput = {
        ...form,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: new Date(form.endsAt).toISOString(),
      }
      if (offer) {
        await offerService.updateOffer(offer.id, payload)
        showSuccessToast('Offer updated')
      } else {
        await offerService.createOffer(payload)
        showSuccessToast('Offer created')
      }
      onSaved()
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : 'Failed to save offer')
    } finally {
      setSaving(false)
    }
  }

  // Banner image → base64 data URI; the backend uploads it to Cloudinary on save.
  // Shown on the storefront /offers page (and campaign strips).
  const handleBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast('Image must be less than 5MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => set('bannerImage', reader.result as string)
    reader.readAsDataURL(file)
  }

  const t = form.type
  const showPercent = t === 'PERCENTAGE' || t === 'QUANTITY' || t === 'THRESHOLD'
  const isCrossBogo = t === 'BOGO' && form.bogoMode === 'CROSS'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{offer ? 'Edit Offer' : 'Create Offer'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={form.title || ''}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Weekend Towel Sale — 20% off"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#e01a1b]/30 focus:border-[#e01a1b] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#e01a1b]/30 focus:border-[#e01a1b] outline-none"
            />
          </div>

          {/* Banner image — shown on the storefront /offers page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" /> Banner image
              <span className="text-xs font-normal text-gray-400">(shown on the Offers page)</span>
            </label>
            {form.bannerImage ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.bannerImage} alt="Offer banner" className="w-full max-w-xs h-32 object-cover rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={() => set('bannerImage', null)}
                  className="absolute -top-2 -right-2 bg-white rounded-full shadow p-1 text-gray-500 hover:text-red-600 border border-gray-200"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-lg py-6 cursor-pointer hover:border-[#e01a1b]/50 hover:bg-gray-50 transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">Click to upload (max 5MB)</span>
                <input type="file" accept="image/*" onChange={handleBanner} className="hidden" />
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dropdown
              label="Offer type *"
              value={form.type || 'PERCENTAGE'}
              onChange={(v) => set('type', v as OfferType)}
              options={(Object.keys(TYPE_LABELS) as OfferType[]).map((k) => ({ value: k, label: TYPE_LABELS[k] }))}
            />
            <Dropdown
              label={isCrossBogo ? 'Buy — applies to *' : 'Applies to *'}
              value={form.scope || 'STORE'}
              onChange={(v) => set('scope', v as OfferScope)}
              disabled={form.type === 'THRESHOLD'}
              options={(Object.keys(SCOPE_LABELS) as OfferScope[])
                // A cross-product BOGO must have a specific buy set — hide "Whole store".
                .filter((k) => !(isCrossBogo && k === 'STORE'))
                .map((k) => ({ value: k, label: SCOPE_LABELS[k] }))}
            />
          </div>

          {/* BOGO: how the free item is chosen. */}
          {t === 'BOGO' && (
            <Dropdown
              label="Free item by"
              value={form.bogoMode || 'SAME'}
              onChange={(v) => {
                set('bogoMode', v as 'SAME' | 'CROSS')
                if (v === 'SAME') {
                  set('freeScope', null)
                  set('freeProductIds', [])
                  set('freeCategoryNames', [])
                } else if (form.scope === 'STORE') {
                  // cross needs a specific buy set — nudge off "Whole store"
                  set('scope', 'PRODUCT')
                }
              }}
              options={[
                { value: 'SAME', label: 'Quantity — same item (buy N, get M of it free)' },
                { value: 'CROSS', label: 'Product / Category — buy one item, get a different one free' },
              ]}
            />
          )}

          {/* Discount magnitude */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {showPercent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.discountPercent ?? ''}
                  onChange={(e) => set('discountPercent', e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e01a1b]"
                />
              </div>
            )}
            {t === 'FLAT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flat ₹ off per unit</label>
                <input
                  type="number"
                  min={1}
                  value={form.discountFlatINR ?? ''}
                  onChange={(e) => set('discountFlatINR', e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e01a1b]"
                />
                <p className="text-xs text-gray-400 mt-1">USD is converted automatically at the live rate.</p>
              </div>
            )}
            {showPercent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max ₹ off per unit (cap, optional)</label>
                <input
                  type="number"
                  min={0}
                  value={form.maxDiscountINR ?? ''}
                  onChange={(e) => set('maxDiscountINR', e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e01a1b]"
                />
              </div>
            )}
            {t === 'QUANTITY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min quantity to trigger</label>
                <input
                  type="number"
                  min={2}
                  value={form.minQty ?? ''}
                  onChange={(e) => set('minQty', e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e01a1b]"
                />
              </div>
            )}
            {t === 'BOGO' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buy quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={form.minQty ?? ''}
                    onChange={(e) => set('minQty', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e01a1b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Get free quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={form.getQty ?? ''}
                    onChange={(e) => set('getQty', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e01a1b]"
                  />
                </div>
              </>
            )}
            {t === 'THRESHOLD' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min cart value (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={form.minCartValueINR ?? ''}
                  onChange={(e) => set('minCartValueINR', e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e01a1b]"
                />
              </div>
            )}
          </div>

          {/* BOGO explainer — spells out the deal so there's no "is this working?" doubt. */}
          {t === 'BOGO' && (
            <div className="rounded-lg border border-[#f0d5cf] bg-[#fdf6f4] px-3 py-2.5 text-xs leading-relaxed text-[#7a5a52]">
              <span className="font-semibold text-[#c41617]">
                Buy {form.minQty || 0} &amp; get {form.getQty || 0} free
              </span>{' '}
              {isCrossBogo ? (
                <>
                  — the customer buys from the <span className="font-semibold">buy set</span> and
                  gets a <span className="font-semibold">different</span> item from the{' '}
                  <span className="font-semibold">free set</span> free. They must add the free item
                  to the cart themselves; the cheapest qualifying one is discounted.
                </>
              ) : (
                <>
                  — the free item is the <span className="font-semibold">same product</span> the
                  customer buys.{' '}
                  {form.scope === 'STORE'
                    ? 'Applies to every product in the store (counted per product).'
                    : form.scope === 'PRODUCT'
                      ? 'Applies only to the products you select below.'
                      : 'Applies only to products in the categories you select below.'}
                </>
              )}
            </div>
          )}

          {/* Scope targeting */}
          {form.scope === 'CATEGORY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t === 'BOGO' ? (isCrossBogo ? 'Buy categories' : 'Buy & free categories (same item)') : 'Target categories'}
              </label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {categories.map((c) => {
                  const on = (form.categoryNames || []).includes(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('categoryNames', toggleId(form.categoryNames, c))}
                      className={`px-2.5 py-1 rounded-full text-xs border ${on ? 'bg-[#e01a1b] text-white border-[#e01a1b]' : 'bg-white text-gray-600 border-gray-300'}`}
                    >
                      {c}
                    </button>
                  )
                })}
                {categories.length === 0 && <span className="text-xs text-gray-400">Loading categories…</span>}
              </div>
            </div>
          )}

          {form.scope === 'PRODUCT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t === 'BOGO' ? (isCrossBogo ? 'Buy products' : 'Buy & free products (same item)') : 'Target products'}{' '}
                <span className="text-xs text-gray-400">({(form.productIds || []).length} selected)</span>
              </label>
              <input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Search products…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-[#e01a1b]"
              />
              <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredProducts.map((p) => {
                  const on = (form.productIds || []).includes(p.id)
                  return (
                    <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={on} onChange={() => set('productIds', toggleId(form.productIds, p.id))} />
                      <span className="text-gray-800">{p.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{p.category}</span>
                    </label>
                  )
                })}
                {products.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Loading products…</div>}
              </div>
            </div>
          )}

          {/* ── CROSS BOGO: the FREE (get) set — a different product/category ── */}
          {isCrossBogo && (
            <div className="rounded-lg border border-[#e6f2ea] bg-[#f6fbf8] p-3 space-y-3">
              <p className="text-sm font-semibold text-[#157f4a]">Free item — what the customer gets</p>
              <Dropdown
                label="Free item is a *"
                value={form.freeScope || ''}
                onChange={(v) => set('freeScope', v as OfferScope)}
                placeholder="Choose product or category"
                options={[
                  { value: 'PRODUCT', label: 'Specific products' },
                  { value: 'CATEGORY', label: 'Categories' },
                ]}
              />

              {form.freeScope === 'CATEGORY' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Free categories <span className="text-xs text-gray-400">({(form.freeCategoryNames || []).length} selected)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                    {categories.map((c) => {
                      const on = (form.freeCategoryNames || []).includes(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => set('freeCategoryNames', toggleId(form.freeCategoryNames, c))}
                          className={`px-2.5 py-1 rounded-full text-xs border ${on ? 'bg-[#157f4a] text-white border-[#157f4a]' : 'bg-white text-gray-600 border-gray-300'}`}
                        >
                          {c}
                        </button>
                      )
                    })}
                    {categories.length === 0 && <span className="text-xs text-gray-400">Loading categories…</span>}
                  </div>
                </div>
              )}

              {form.freeScope === 'PRODUCT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Free products <span className="text-xs text-gray-400">({(form.freeProductIds || []).length} selected)</span>
                  </label>
                  <input
                    value={freeProductQuery}
                    onChange={(e) => setFreeProductQuery(e.target.value)}
                    placeholder="Search products…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-[#157f4a]"
                  />
                  <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
                    {filteredFreeProducts.map((p) => {
                      const on = (form.freeProductIds || []).includes(p.id)
                      return (
                        <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" checked={on} onChange={() => set('freeProductIds', toggleId(form.freeProductIds, p.id))} />
                          <span className="text-gray-800">{p.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{p.category}</span>
                        </label>
                      )
                    })}
                    {products.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Loading products…</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Region + priority + window + active */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dropdown
              label="Region"
              value={form.region || 'BOTH'}
              onChange={(v) => set('region', v as OfferRegion)}
              options={(Object.keys(REGION_LABELS) as OfferRegion[]).map((k) => ({ value: k, label: REGION_LABELS[k] }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority (higher wins ties)</label>
              <input
                type="number"
                value={form.priority ?? 0}
                onChange={(e) => set('priority', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e01a1b]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Starts
              </label>
              <input
                type="datetime-local"
                value={form.startsAt || ''}
                onChange={(e) => set('startsAt', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e01a1b]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Ends *
              </label>
              <input
                type="datetime-local"
                value={form.endsAt || ''}
                onChange={(e) => set('endsAt', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e01a1b]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => set('isActive', e.target.checked)} />
            Active (uncheck to pause without deleting)
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#e01a1b] text-white px-4 py-2 rounded-lg hover:bg-[#c01718] text-sm font-medium disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {offer ? 'Save changes' : 'Create offer'}
          </button>
        </div>
      </div>
    </div>
  )
}
