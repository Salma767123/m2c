'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { convertINRtoUSD } from '@/lib/currency'
import { adminProductService } from '@/services/adminProductService'
import { categoryService, Category } from '@/services/categoryService'
import Dropdown from '@/components/UI/Dropdown'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

// Minimal product shape the modal needs — compatible with both the All Products
// (AdminProduct) list and the Vendor Product Requests list.
export interface ApprovableProduct {
  id: string
  name: string
  vendor?: { companyName?: string } | null
  basePrice: number
  originalPrice?: number | null
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

  const handleSubmit = async () => {
    if (!adminPrice || parseFloat(adminPrice) <= 0) {
      showErrorToast('Invalid Price', 'Please enter a valid admin selling price'); return
    }
    if (!originalPrice || parseFloat(originalPrice) <= 0) {
      showErrorToast('Invalid Price', 'Please enter a valid original price'); return
    }
    if (parseFloat(originalPrice) <= parseFloat(adminPrice)) {
      showErrorToast('Invalid Price', 'Original price must be greater than selling price'); return
    }
    if (hasVariants) {
      if (variants.some((v) => !variantPrices[v.id] || parseFloat(variantPrices[v.id]) <= 0)) {
        showErrorToast('Invalid Prices', 'Please enter valid admin prices for all variants'); return
      }
      if (variants.some((v) => !variantOriginalPrices[v.id] || parseFloat(variantOriginalPrices[v.id]) <= 0)) {
        showErrorToast('Invalid Prices', 'Please enter valid original prices for all variants'); return
      }
      if (variants.some((v) => parseFloat(variantOriginalPrices[v.id]) <= parseFloat(variantPrices[v.id]))) {
        showErrorToast('Invalid Prices', 'Original price must be greater than admin price for all variants'); return
      }
    }

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
          <p className="text-xs text-slate-500 mt-0.5">Vendor Base Price: ₹{product.basePrice}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-800">Admin Selling Price (₹) <span className="text-brand-500">*</span></label>
                <span className="text-xs text-slate-400">Base ₹{product.basePrice}</span>
              </div>
              <input type="number" value={adminPrice} onChange={(e) => setAdminPrice(e.target.value)} onFocus={(e) => e.currentTarget.select()}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none text-sm"
                placeholder="Enter selling price" step="0.01" min="0" disabled={submitting} />
              <p className="text-xs text-slate-400 mt-1">Final price customers see.</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-800">Original Price (₹) <span className="text-brand-500">*</span></label>
                {discountPct != null && <span className="text-xs font-semibold text-emerald-600">{discountPct}% off</span>}
              </div>
              <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} onFocus={(e) => e.currentTarget.select()}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none text-sm"
                placeholder="Enter original price" step="0.01" min="0" disabled={submitting} />
              <p className="text-xs text-slate-400 mt-1">Struck-through to show the discount.</p>
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
                        <input type="number" value={variantPrices[variant.id] || ''} onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => setVariantPrices((prev) => ({ ...prev, [variant.id]: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm"
                          placeholder="Selling price" step="0.01" min="0" disabled={submitting} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Original Price (₹) *</label>
                        <input type="number" value={variantOriginalPrices[variant.id] || ''} onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => setVariantOriginalPrices((prev) => ({ ...prev, [variant.id]: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm"
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
