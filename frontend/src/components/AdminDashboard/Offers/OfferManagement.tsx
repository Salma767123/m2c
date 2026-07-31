'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Percent, Calendar, Tag, Loader2, X, ImageIcon, Upload } from 'lucide-react'
import { offerService, type Offer, type OfferInput, type OfferStatus } from '@/services/offerService'
import { categoryService } from '@/services/categoryService'
import { adminProductService, type AdminProduct } from '@/services/adminProductService'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import type { OfferType, OfferScope, OfferRegion } from '@/lib/offers'

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

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Percent className="w-6 h-6 text-[#e01a1b]" /> Offers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
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

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {(['ACTIVE', 'SCHEDULED', 'EXPIRED', 'PAUSED'] as OfferStatus[]).map((s) => (
          <div key={s} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">{s.toLowerCase()}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{counts[s]}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Tag className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p>No offers yet. Create your first promotion.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Offer</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Scope</th>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Window</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {offers.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
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

  const set = <K extends keyof OfferInput>(k: K, v: OfferInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  // Load pickers lazily when the scope needs them.
  useEffect(() => {
    if (form.scope === 'CATEGORY' && categories.length === 0) {
      categoryService
        .getCategories({})
        .then((r) => setCategories(Array.from(new Set(r.data.map((c) => c.name))).sort()))
        .catch(() => {})
    }
    if (form.scope === 'PRODUCT' && products.length === 0) {
      adminProductService
        .getAllProducts({ limit: 500, approvalStatus: 'APPROVED' })
        .then((r) => setProducts(r.data?.products || []))
        .catch(() => {})
    }
  }, [form.scope, categories.length, products.length])

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(productQuery.toLowerCase())).slice(0, 60),
    [products, productQuery]
  )

  const toggleId = (list: string[] | undefined, id: string): string[] => {
    const arr = list || []
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
  }

  const submit = async () => {
    if (!form.title?.trim()) return showErrorToast('Title is required')
    if (!form.endsAt) return showErrorToast('End date is required')
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Offer type *</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value as OfferType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#e01a1b]/30 focus:border-[#e01a1b] outline-none"
              >
                {(Object.keys(TYPE_LABELS) as OfferType[]).map((k) => (
                  <option key={k} value={k}>
                    {TYPE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Applies to *</label>
              <select
                value={form.scope}
                onChange={(e) => set('scope', e.target.value as OfferScope)}
                disabled={form.type === 'THRESHOLD'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#e01a1b]/30 focus:border-[#e01a1b] outline-none disabled:bg-gray-50"
              >
                {(Object.keys(SCOPE_LABELS) as OfferScope[]).map((k) => (
                  <option key={k} value={k}>
                    {SCOPE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

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

          {/* Scope targeting */}
          {form.scope === 'CATEGORY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target categories</label>
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
                Target products{' '}
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

          {/* Region + priority + window + active */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <select
                value={form.region}
                onChange={(e) => set('region', e.target.value as OfferRegion)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#e01a1b]"
              >
                {(Object.keys(REGION_LABELS) as OfferRegion[]).map((k) => (
                  <option key={k} value={k}>
                    {REGION_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
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
