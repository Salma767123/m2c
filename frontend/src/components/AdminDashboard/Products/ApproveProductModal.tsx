'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { convertINRtoUSD } from '@/lib/currency'
import { adminProductService } from '@/services/adminProductService'
import { categoryService, Category } from '@/services/categoryService'
import Dropdown from '@/components/UI/Dropdown'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import ManufacturerInfoCard from '@/components/Shared/ManufacturerInfoCard'
import { hasManufacturerInfo } from '@/lib/manufacturerInfo'

// Minimal product shape the modal needs — compatible with both the All Products
// (AdminProduct) list and the Vendor Product Requests list.
export interface ApprovableProduct {
  id: string
  name: string
  vendor?: { companyName?: string } | null
  basePrice: number
  originalPrice?: number | null
  // Physical specs — shown read-only so the admin can judge the margin. GSM
  // lives inside fabricSpecifications; weight/dimensions are product columns.
  weight?: string | null
  weightUnit?: string | null
  dimensions?: string | null
  fabricSpecifications?: Record<string, unknown> | null
  variants?: Array<{
    id: string
    variantName?: string | null
    size?: string | null
    color?: string | null
    colorHex?: string | null
    price: number
    originalPrice?: number | null
    stock: number
  }> | null
}

interface ApproveProductModalProps {
  product: ApprovableProduct | null
  open: boolean
  onClose: () => void
  onApproved: () => void
}

// Common colour names → hex, so the swatch shows even when colorHex isn't stored.
const NAMED_HEX: Record<string, string> = {
  black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080', silver: '#c0c0c0',
  red: '#ff0000', green: '#008000', lime: '#00ff00', blue: '#0000ff', navy: '#000080',
  yellow: '#ffff00', magenta: '#ff00ff', cyan: '#00ffff', maroon: '#800000', olive: '#808000',
  purple: '#800080', teal: '#008080', orange: '#ffa500', pink: '#ffc0cb', brown: '#a52a2a', beige: '#f5f5dc',
}

// Resolve a swatch colour from the stored hex, an inline "(#hex)" in the name,
// or a known colour name — in that order.
function resolveHex(colorHex?: string | null, color?: string | null): string | undefined {
  if (colorHex && /^#[0-9a-fA-F]{3,8}$/.test(colorHex.trim())) return colorHex.trim()
  const c = (color || '').trim()
  const inline = c.match(/#[0-9a-fA-F]{3,8}/)
  if (inline) return inline[0]
  return NAMED_HEX[c.toLowerCase()]
}

/**
 * Single source of truth for the admin "Approve Product" pricing form. Used by
 * both the All Products table and the Vendor Product Requests list so their
 * data, functionality and design stay identical. Approves via the shared
 * adminProductService.approveProduct endpoint (base price, original/MRP,
 * multi-currency, per-variant pricing).
 */
export default function ApproveProductModal({ product, open, onClose, onApproved }: ApproveProductModalProps) {
  const [adminPrice, setAdminPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({})
  const [variantOriginalPrices, setVariantOriginalPrices] = useState<Record<string, string>>({})
  const [originalPriceINR, setOriginalPriceINR] = useState('')
  const [priceVisibility, setPriceVisibility] = useState<'IN_ONLY' | 'COM_ONLY' | 'BOTH'>('BOTH')
  const [submitting, setSubmitting] = useState(false)
  // Profit margin % applied over the vendor base price to fill selling prices.
  const [margin, setMargin] = useState('')
  // Keys of fields that failed validation — used to red-outline them on submit.
  // Keys: 'adminPrice', 'originalPrice', `vp:<id>` (variant price),
  // `vop:<id>` (variant original price).
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const clearInvalid = (key: string) =>
    setInvalid((prev) => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })

  // ── Vendor-proposed category gate ────────────────────────────────────────
  // The product may sit on a category the vendor invented (status PENDING), which
  // the storefront cannot show. The backend refuses to publish until the admin
  // decides, and reports it as CATEGORY_PENDING_REVIEW — we then surface these
  // controls and retry with the decision attached.
  const [pendingCategory, setPendingCategory] = useState<{ categoryId: string; categoryName: string } | null>(null)
  const [categoryChoice, setCategoryChoice] = useState<'approve' | 'merge' | ''>('')
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [activeCategories, setActiveCategories] = useState<Category[]>([])

  // Load merge targets only once the gate actually trips.
  useEffect(() => {
    if (!pendingCategory) return
    categoryService
      .getCategories({ status: 'ACTIVE', showRootOnly: true, includeSubcategories: false })
      .then((res) => setActiveCategories((res.data || []).filter((c) => c.id !== pendingCategory.categoryId)))
      .catch(() => setActiveCategories([]))
  }, [pendingCategory])

  // Reset the gate whenever the modal is opened for a different product.
  useEffect(() => {
    setPendingCategory(null)
    setCategoryChoice('')
    setMergeTargetId('')
  }, [product?.id, open])

  const variants = product?.variants || []
  const hasVariants = variants.length > 0

  // Initialise the form from the product each time the modal opens.
  useEffect(() => {
    if (!open || !product) return
    setAdminPrice(product.basePrice != null ? String(product.basePrice) : '')
    setOriginalPrice(product.originalPrice != null ? String(product.originalPrice) : '')
    setOriginalPriceINR('')
    setPriceVisibility('BOTH')
    setMargin('')
    setInvalid(new Set())
    const p: Record<string, string> = {}
    const op: Record<string, string> = {}
    variants.forEach((v) => {
      p[v.id] = v.price != null ? String(v.price) : ''
      op[v.id] = v.originalPrice != null ? String(v.originalPrice) : ''
    })
    setVariantPrices(p)
    setVariantOriginalPrices(op)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id])

  if (!open || !product) return null

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

  // Border/focus classes for a price input, red when flagged invalid.
  const borderCls = (bad: boolean) => bad
    ? 'border-red-400 ring-2 ring-red-200 focus:ring-red-300 focus:border-red-400'
    : 'border-slate-300 focus:ring-brand-500/40 focus:border-brand-500'

  // Apply a profit margin over the VENDOR base price to fill every selling
  // price at once — product base and each variant. Margin sits on the vendor's
  // buying price (product.basePrice / variant.price), which is exactly the
  // figure the negotiation settles. The admin can still hand-edit any field
  // afterwards; re-typing the margin recomputes from the vendor base again.
  const applyMargin = (pctStr: string) => {
    setMargin(pctStr)
    const pct = parseFloat(pctStr)
    if (isNaN(pct)) return
    const factor = 1 + pct / 100
    if (product.basePrice != null) setAdminPrice(String(round2(product.basePrice * factor)))
    const next: Record<string, string> = {}
    variants.forEach((v) => { if (v.price != null) next[v.id] = String(round2(v.price * factor)) })
    if (Object.keys(next).length) setVariantPrices((prev) => ({ ...prev, ...next }))
  }

  // Read-only physical specs used to judge the margin.
  const fs = (product.fabricSpecifications || {}) as Record<string, unknown>
  const specGsm = fs.gsm != null && fs.gsm !== '' ? `${fs.gsm} GSM` : null
  const specWeight = product.weight
    ? `${product.weight}${product.weightUnit ? ` ${product.weightUnit}` : ''}`
    : (fs.weightValue != null && fs.weightValue !== '' ? `${fs.weightValue} g` : null)
  const specDims = product.dimensions
    || (fs.length && fs.breadth ? `${fs.length} × ${fs.breadth} cm` : null)
  const specs = [
    specGsm && { label: 'GSM', value: specGsm },
    specWeight && { label: 'Weight', value: specWeight },
    specDims && { label: 'Dimensions', value: specDims },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const handleSubmit = async () => {
    // Collect EVERY invalid field in one pass so all get outlined at once,
    // rather than surfacing them one toast at a time.
    const bad = new Set<string>()
    let msg = ''

    if (!adminPrice || parseFloat(adminPrice) <= 0) {
      bad.add('adminPrice'); msg ||= 'Enter a valid admin selling price'
    }
    if (!originalPrice || parseFloat(originalPrice) <= 0) {
      bad.add('originalPrice'); msg ||= 'Enter a valid original price (MRP)'
    } else if (adminPrice && parseFloat(originalPrice) <= parseFloat(adminPrice)) {
      bad.add('originalPrice'); msg ||= 'Original price (MRP) must be greater than the selling price'
    }

    if (hasVariants) {
      variants.forEach((v) => {
        const price = variantPrices[v.id]
        const orig = variantOriginalPrices[v.id]
        if (!price || parseFloat(price) <= 0) {
          bad.add(`vp:${v.id}`); msg ||= 'Enter a valid admin price for every variant'
        }
        if (!orig || parseFloat(orig) <= 0) {
          bad.add(`vop:${v.id}`); msg ||= 'Enter a valid original price for every variant'
        } else if (price && parseFloat(orig) <= parseFloat(price)) {
          bad.add(`vop:${v.id}`); msg ||= 'Each variant’s original price must exceed its admin price'
        }
      })
    }

    if (bad.size > 0) {
      setInvalid(bad)
      showErrorToast('Check the highlighted fields', msg)
      // Bring the first offending field into view and focus it.
      const firstKey = ['adminPrice', 'originalPrice', ...variants.flatMap((v) => [`vp:${v.id}`, `vop:${v.id}`])]
        .find((k) => bad.has(k))
      if (firstKey) {
        const el = document.querySelector<HTMLInputElement>(`[data-field="${firstKey}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => el?.focus(), 300)
      }
      return
    }

    setInvalid(new Set())
    setSubmitting(true)
    try {
      const variantPricesNum = hasVariants
        ? Object.fromEntries(Object.entries(variantPrices).map(([id, price]) => [id, parseFloat(price)]))
        : undefined
      const variantOriginalPricesNum = hasVariants
        ? Object.fromEntries(Object.entries(variantOriginalPrices).filter(([, price]) => price && parseFloat(price) > 0).map(([id, price]) => [id, parseFloat(price)]))
        : undefined
      const multiCurrency = {
        originalPriceINR: originalPriceINR ? parseFloat(originalPriceINR) : undefined,
        priceVisibility,
      }
      // Only send a resolution once the admin has actually chosen one.
      const categoryResolution =
        pendingCategory && categoryChoice
          ? { action: categoryChoice, targetCategoryId: categoryChoice === 'merge' ? mergeTargetId : undefined }
          : undefined

      const response = await adminProductService.approveProduct(
        product.id,
        parseFloat(adminPrice),
        variantPricesNum,
        originalPrice ? parseFloat(originalPrice) : undefined,
        variantOriginalPricesNum && Object.keys(variantOriginalPricesNum).length > 0 ? variantOriginalPricesNum : undefined,
        multiCurrency,
        undefined,
        categoryResolution,
      )
      if (response.success) {
        showSuccessToast('Product Approved', 'The product has been approved successfully.')
        onApproved()
        onClose()
      } else {
        showErrorToast('Approval Failed', response.message || 'Unable to approve product.')
      }
    } catch (error: any) {
      // The product sits on a vendor-proposed category — surface the decision
      // controls inline instead of a dead-end error.
      if (error?.code === 'CATEGORY_PENDING_REVIEW' && error?.details?.categoryId) {
        setPendingCategory(error.details)
        showErrorToast('Category Needs Review', error.message || 'Resolve the vendor-proposed category to publish this product.')
      } else {
        showErrorToast('Approval Failed', error.message || 'Unable to approve product.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const discountPct = originalPrice && adminPrice && parseFloat(originalPrice) > parseFloat(adminPrice)
    ? Math.round(((parseFloat(originalPrice) - parseFloat(adminPrice)) / parseFloat(adminPrice)) * 100)
    : null

  // Once the gate has tripped, Approve stays disabled until a decision is made
  // (and, for a merge, a target is chosen).
  const categoryResolutionIncomplete =
    !!pendingCategory && (!categoryChoice || (categoryChoice === 'merge' && !mergeTargetId))

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Approve Product</h3>
            <p className="text-sm text-slate-500 mt-1">Set the final pricing customers will see, then approve the product.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product summary */}
        <div className="mb-6 p-4 bg-brand-50/40 border border-brand-100 rounded-xl">
          <p className="text-sm font-bold text-slate-900">{product.name}</p>
          {product.vendor?.companyName && <p className="text-sm text-slate-600">{product.vendor.companyName}</p>}
          <p className="text-sm text-slate-600 mt-1">
            Vendor Base Price: <span className="text-base font-bold text-slate-900">₹{product.basePrice}</span>
          </p>

          {/* Physical specs — reference for setting the margin */}
          {specs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-brand-100 flex flex-wrap gap-2.5">
              {specs.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</span>
                  <span className="text-sm text-slate-900 font-bold">{s.value}</span>
                </span>
              ))}
            </div>
          )}

          {/* Who made the item */}
          {hasManufacturerInfo((product as any).manufacturerInfo) && (
            <div className="mt-3 pt-3 border-t border-brand-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Manufacturer</p>
              <ManufacturerInfoCard info={(product as any).manufacturerInfo} variant="plain" />
            </div>
          )}
        </div>

        {/* Vendor-proposed category — must be resolved before publishing */}
        {pendingCategory && (
          <section className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900">Category needs review</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  <span className="font-semibold">&quot;{pendingCategory.categoryName}&quot;</span> was proposed by the vendor and
                  isn&apos;t part of the live catalog yet. Customers couldn&apos;t browse to this product until it is resolved.
                </p>

                <div className="mt-3 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoryChoice"
                      checked={categoryChoice === 'approve'}
                      onChange={() => setCategoryChoice('approve')}
                      className="mt-1 accent-brand-500"
                    />
                    <span className="text-sm text-slate-700">
                      <span className="font-semibold">Approve this category</span> — add &quot;{pendingCategory.categoryName}&quot; to the live catalog.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoryChoice"
                      checked={categoryChoice === 'merge'}
                      onChange={() => setCategoryChoice('merge')}
                      className="mt-1 accent-brand-500"
                    />
                    <span className="text-sm text-slate-700">
                      <span className="font-semibold">Merge into an existing category</span> — use when it duplicates one you already have.
                    </span>
                  </label>

                  {categoryChoice === 'merge' && (
                    <div className="pl-6 pt-1">
                      <Dropdown
                        value={mergeTargetId}
                        options={activeCategories.map((c) => ({ value: c.id, label: c.name }))}
                        placeholder={activeCategories.length ? 'Select a category' : 'No active categories'}
                        onChange={(v) => setMergeTargetId((Array.isArray(v) ? v[0] : v) || '')}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Base Pricing */}
        <section className="mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-500 mb-3">Base Pricing (INR)</h4>

          {/* Profit margin — fills all selling prices from the vendor base */}
          <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="text-sm font-semibold text-slate-800">Profit Margin (%)</label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="relative w-32">
                <input
                  type="number" value={margin} onChange={(e) => applyMargin(e.target.value)} onFocus={(e) => e.currentTarget.select()}
                  className="w-full pl-3 pr-7 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none text-sm"
                  placeholder="e.g. 20" step="0.1" min="0" disabled={submitting}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-500">
                Applies over the vendor base price to auto-fill the selling price below and every variant.
                {margin && !isNaN(parseFloat(margin)) && (
                  <> Base ₹{product.basePrice} → <span className="font-semibold text-slate-700">₹{round2(product.basePrice * (1 + parseFloat(margin) / 100))}</span></>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-800">Admin Selling Price (₹) <span className="text-brand-500">*</span></label>
                <span className="text-xs text-slate-400">Base ₹{product.basePrice}</span>
              </div>
              <input type="number" data-field="adminPrice" value={adminPrice} onChange={(e) => { setAdminPrice(e.target.value); clearInvalid('adminPrice') }} onFocus={(e) => e.currentTarget.select()}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:outline-none text-sm ${borderCls(invalid.has('adminPrice'))}`}
                placeholder="Enter selling price" step="0.01" min="0" disabled={submitting} />
              <p className="text-xs text-slate-400 mt-1">Final price customers see.</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-800">Original Price / MRP (₹) <span className="text-brand-500">*</span></label>
                {discountPct != null && <span className="text-xs font-semibold text-emerald-600">{discountPct}% off</span>}
              </div>
              <input type="number" data-field="originalPrice" value={originalPrice} onChange={(e) => { setOriginalPrice(e.target.value); clearInvalid('originalPrice') }} onFocus={(e) => e.currentTarget.select()}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:outline-none text-sm ${borderCls(invalid.has('originalPrice'))}`}
                placeholder="Enter original price" step="0.01" min="0" disabled={submitting} />
              <p className="text-xs text-slate-400 mt-1">Shown with a strikethrough to display the discount.</p>
            </div>
          </div>
        </section>

        {/* Currency Pricing */}
        <section className="mb-6 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Currency Pricing</h4>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">.com prices auto-convert from INR at the live exchange rate.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-brand-100/70">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Selling Price (.in)</p>
              <p className="text-lg font-bold text-slate-900">₹{adminPrice || '—'}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-brand-100/70">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Selling Price (.com)</p>
              <p className="text-lg font-bold text-slate-900">{adminPrice ? `$${convertINRtoUSD(parseFloat(adminPrice)).toFixed(2)}` : '—'}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Auto-calculated</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Original Prices (MRP)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Original ₹ (MRP)</label>
                <input type="number" value={originalPriceINR} onChange={(e) => setOriginalPriceINR(e.target.value)} onFocus={(e) => e.currentTarget.select()}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm"
                  placeholder="MRP for .in" step="0.01" min="0" disabled={submitting} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Original $ (MRP)</label>
                <div className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-500">
                  {originalPriceINR ? `$${convertINRtoUSD(parseFloat(originalPriceINR)).toFixed(2)}` : 'Auto'}
                </div>
                <p className="text-[10px] text-emerald-600 mt-1">Auto-calculated</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Visibility</label>
                <select value={priceVisibility} onChange={(e) => setPriceVisibility(e.target.value as 'IN_ONLY' | 'COM_ONLY' | 'BOTH')}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm" disabled={submitting}>
                  <option value="BOTH">Both (.in + .com)</option>
                  <option value="IN_ONLY">.in Only (India)</option>
                  <option value="COM_ONLY">.com Only (International)</option>
                </select>
              </div>
            </div>
          </div>
          <p className="text-xs text-brand-600/80 mt-3">INR/USD prices override the admin selling price for their region. Original prices show as strikethrough.</p>
        </section>

        {/* Variant Pricing */}
        {hasVariants && (
          <section className="mb-6">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-500 mb-1">Variant Pricing</h4>
            <p className="text-xs text-slate-500 mb-3">Set the selling &amp; original price for each variant — discount % auto-calculates.</p>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {variants.map((variant) => {
                const vDiscount = variantOriginalPrices[variant.id] && variantPrices[variant.id] && parseFloat(variantOriginalPrices[variant.id]) > parseFloat(variantPrices[variant.id])
                  ? Math.round(((parseFloat(variantOriginalPrices[variant.id]) - parseFloat(variantPrices[variant.id])) / parseFloat(variantPrices[variant.id])) * 100)
                  : null
                const hex = resolveHex(variant.colorHex, variant.color)
                // Strip an inline "(#hex)" from the display name (it's shown separately).
                const colorLabel = (variant.color || '').replace(/\s*\(#[0-9a-fA-F]{3,8}\)\s*/, '').trim()
                return (
                  <div key={variant.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="mb-3 flex items-center gap-2.5">
                      {hex ? (
                        <span className="w-7 h-7 rounded-md border border-slate-300 shadow-sm shrink-0" style={{ backgroundColor: hex }} title={hex} />
                      ) : (
                        <span className="w-7 h-7 rounded-md border border-dashed border-slate-300 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {variant.variantName?.trim() || colorLabel || [variant.size, variant.color].filter(Boolean).join(' – ') || 'Variant'}
                          </p>
                          {colorLabel && <span className="text-xs text-slate-500">{colorLabel}</span>}
                          {hex && <span className="text-[10px] font-mono uppercase text-slate-400">{hex}</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Vendor ₹{variant.price} · Stock: {variant.stock}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Admin Price (₹) *</label>
                        <input type="number" data-field={`vp:${variant.id}`} value={variantPrices[variant.id] || ''} onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => { setVariantPrices((prev) => ({ ...prev, [variant.id]: e.target.value })); clearInvalid(`vp:${variant.id}`) }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${borderCls(invalid.has(`vp:${variant.id}`))}`}
                          placeholder="Selling price" step="0.01" min="0" disabled={submitting} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Original Price / MRP (₹) *</label>
                        <input type="number" data-field={`vop:${variant.id}`} value={variantOriginalPrices[variant.id] || ''} onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => { setVariantOriginalPrices((prev) => ({ ...prev, [variant.id]: e.target.value })); clearInvalid(`vop:${variant.id}`) }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${borderCls(invalid.has(`vop:${variant.id}`))}`}
                          placeholder="Original price" step="0.01" min="0" disabled={submitting} />
                        {vDiscount != null && <p className="text-xs text-emerald-600 mt-1">{vDiscount}% off</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting || categoryResolutionIncomplete}
            title={categoryResolutionIncomplete ? 'Resolve the vendor-proposed category first' : undefined}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Approving...' : 'Approve Product'}
          </button>
        </div>
      </div>
    </div>
  )
}
