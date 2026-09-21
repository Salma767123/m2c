'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, Star, Package, PenLine } from 'lucide-react'
import { getRecentlyViewed } from '@/lib/browsingHistory'
import { publicProductService, type PublicProduct } from '@/services/publicProductService'
import orderService from '@/services/orderService'
import reviewService from '@/services/reviewService'
import ReviewModal from '@/components/WebSite/Order/ReviewModal'
import { formatPrice, getRegionalPrice } from '@/lib/currency'

/**
 * Two account discovery rails shown under Profile Information:
 *  1. "Awaiting your review" — delivered orders the customer has not reviewed yet, with a
 *     one-tap Write-review button (reuses the order ReviewModal). Nudges reviews.
 *  2. "Recently viewed" — this shopper's own recently-viewed products (from local browsing
 *     history), so they can jump back to something they were looking at.
 * Each rail hides itself when it has nothing to show, so the profile stays clean.
 */

type ReviewPending = { orderId: string; productName: string; productImage?: string; items: unknown[] }

const isDelivered = (status?: string) =>
  ['delivered', 'completed', 'received'].includes(String(status || '').toLowerCase())

export default function AccountDiscovery() {
  const [recent, setRecent] = useState<PublicProduct[]>([])
  const [pending, setPending] = useState<ReviewPending[]>([])
  const [reviewModal, setReviewModal] = useState<{ isOpen: boolean; orderId: string; items: unknown[] }>({ isOpen: false, orderId: '', items: [] })

  // Recently viewed — resolve the stored ids to live products.
  useEffect(() => {
    const ids = getRecentlyViewed().slice(0, 10)
    if (!ids.length) return
    let cancelled = false
    Promise.all(
      ids.map((id) => publicProductService.getProduct(id).then((r) => (r.success ? r.data : null)).catch(() => null))
    ).then((list) => {
      if (!cancelled) setRecent(list.filter(Boolean) as PublicProduct[])
    })
    return () => { cancelled = true }
  }, [])

  // Awaiting review — delivered orders whose first item has no review yet.
  const loadPending = useCallback(async () => {
    try {
      const res = await orderService.getUserOrders()
      if (!res?.success || !Array.isArray(res.data)) return
      const delivered = (res.data as unknown as Array<{ id: string; status?: string; items?: Array<{ productId?: string; productName?: string; productImage?: string }> }>)
        .filter((o) => isDelivered(o.status) && o.items?.[0]?.productId)
      const out: ReviewPending[] = []
      for (const o of delivered) {
        const first = o.items![0]
        try {
          const r = await reviewService.checkReviewStatus(first.productId as string, o.id)
          if (!r?.hasReviewed) {
            out.push({ orderId: o.id, productName: first.productName || 'Your purchase', productImage: first.productImage, items: o.items as unknown[] })
          }
        } catch { /* ignore a single failed check */ }
      }
      setPending(out)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadPending() }, [loadPending])

  if (!recent.length && !pending.length) return null

  return (
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      {/* ── Awaiting your review ── */}
      {pending.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(90,60,40,0.05)] ring-1 ring-[#efe6df] sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <PenLine className="h-4 w-4 text-[#e01a1b]" />
            <h3 className="text-[15px] font-bold text-[#1a1a1a]">Awaiting your review</h3>
            <span className="rounded-full bg-[#fdf1ef] px-2 py-0.5 text-[11px] font-semibold text-[#c41617]">{pending.length}</span>
          </div>
          <p className="mb-3 text-[13px] text-[#8a807a]">You bought these — share what you think and help other shoppers.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pending.map((p) => (
              <div key={p.orderId} className="flex items-center gap-3 rounded-2xl border border-[#efe6df] bg-white p-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f6f1ea]">
                  {p.productImage ? (
                    <Image src={p.productImage} alt={p.productName} fill sizes="56px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Package className="h-5 w-5 text-[#c9aeab]" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1a1a1a]">{p.productName}</p>
                  <p className="text-[12px] text-[#8a807a]">Delivered · not reviewed yet</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewModal({ isOpen: true, orderId: p.orderId, items: p.items })}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#e01a1b] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#c41617]"
                >
                  <Star className="h-3.5 w-3.5" />
                  Write review
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Recently viewed ── */}
      {recent.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(90,60,40,0.05)] ring-1 ring-[#efe6df] sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#e01a1b]" />
            <h3 className="text-[15px] font-bold text-[#1a1a1a]">Recently viewed</h3>
          </div>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {recent.map((p) => {
              const img = p.images?.[0]?.url
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="group w-36 shrink-0 rounded-2xl border border-[#efe6df] bg-white p-2 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(90,60,40,0.4)]"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#f6f1ea]">
                    {img ? (
                      <Image src={img} alt={p.name} fill sizes="144px" className="object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Package className="h-6 w-6 text-[#c9aeab]" /></div>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[12.5px] font-medium text-[#1a1a1a]">{p.name}</p>
                  <p className="mt-0.5 text-[13px] font-bold text-[#e01a1b]">{formatPrice(getRegionalPrice(p as never))}</p>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <ReviewModal
        isOpen={reviewModal.isOpen}
        orderId={reviewModal.orderId}
        items={reviewModal.items as never}
        onClose={() => {
          setReviewModal({ isOpen: false, orderId: '', items: [] })
          // A just-submitted review should drop the item off this list.
          loadPending()
        }}
      />
    </div>
  )
}
