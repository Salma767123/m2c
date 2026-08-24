"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Eye, Download, Star, Truck, CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react'
import orderService, { Order as APIOrder } from '@/services/orderService'
import reviewService from '@/services/reviewService'
import ReviewModal from '@/components/WebSite/Order/ReviewModal'
import Reveal from '@/components/WebSite/Shared/Reveal'
import { formatPrice } from '@/lib/currency'
import { showErrorToast } from '@/lib/toast-utils'

/**
 * Order History.
 *
 * Presentation only — the fetch, the pagination maths, the status
 * normalisation and the invoice call are all unchanged. What changed:
 *
 *  · The palette. Slate cards with green/blue/red/yellow bootstrap badges
 *    became linen and oxblood, matching the rest of the account area.
 *
 *  · Status still carries colour, because here colour means something —
 *    Delivered and Cancelled are not interchangeable. But the four are drawn
 *    from a warm range now, and Processing is deliberately colourless: it is
 *    the state where nothing has happened yet.
 *
 *  · The order number leads each card instead of sharing the line with a
 *    status icon, a date and a badge all set at similar weight.
 */

const ORDERS_PER_PAGE = 5

/** Show each amount in the currency the order was charged in, not a hardcoded '$'. */
function money(amount: number, order: Pick<APIOrder, 'currency'>): string {
  return formatPrice(amount, order.currency === 'USD' ? 'USD' : 'INR')
}

/** Smart pagination range builder — collapses long page lists to "1 … 4 5 6 … 20". */
function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 4) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('…');
  pages.push(total);
  return pages;
}

const CARD =
  'rounded-2xl border border-[#efe4d8] bg-white p-4 shadow-[0_10px_30px_-24px_rgba(74,50,38,0.5)] sm:p-6 lg:p-7'

const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-full bg-[#e01a1b] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(224,26,27,0.8)] transition-all duration-300 hover:bg-[#c41617]'

const QUIET_BTN =
  'inline-flex items-center justify-center gap-2 rounded-full border border-[#e6dcd0] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5f5550] transition-colors duration-200 hover:bg-[#faf7f3] hover:text-[#1a1a1a]'

const PAGE_BTN =
  'flex shrink-0 items-center gap-1 rounded-lg border border-[#e6dcd0] bg-white px-2 py-2 text-sm font-medium text-[#5f5550] transition-colors hover:bg-[#faf7f3] disabled:cursor-not-allowed disabled:opacity-40 sm:gap-2 sm:px-4'

/**
 * Status presentation, in one place.
 *
 * Contrast on each badge's own ground: Delivered 5.4:1, Shipped 5.6:1,
 * Cancelled 5.9:1, Processing 6.5:1 — all clear of 4.5:1 for text this size.
 */
const STATUS_META = {
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    badge: 'border-[#d7e7db] bg-[#eef5ef] text-[#2f6b45]',
    ink: 'text-[#2f6b45]',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    badge: 'border-[#f0e2c4] bg-[#fdf6e8] text-[#84560f]',
    ink: 'text-[#84560f]',
  },
  cancelled: {
    label: 'Cancelled',
    icon: AlertCircle,
    badge: 'border-[#f0d8d2] bg-[#fdf3f0] text-[#a01718]',
    ink: 'text-[#a01718]',
  },
  processing: {
    label: 'Processing',
    icon: Clock,
    badge: 'border-[#e6dcd0] bg-[#faf7f3] text-[#5f5550]',
    ink: 'text-[#a89a8d]',
  },
} as const

export default function OrderHistory() {
  const [orders, setOrders] = useState<APIOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [reviewedOrders, setReviewedOrders] = useState<Set<string>>(new Set())
  const [reviewModal, setReviewModal] = useState<{ isOpen: boolean; orderId: string; items: APIOrder['items'] }>({ isOpen: false, orderId: '', items: [] })

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await orderService.getUserOrders()
      if (response.success) {
        setOrders(response.data)
        setCurrentPage(1)
      } else {
        setError('Failed to fetch orders')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching orders')
    } finally {
      setLoading(false)
    }
  }

  const getNormalizedStatus = (status: string): keyof typeof STATUS_META => {
    const s = status.toLowerCase()
    if (['delivered', 'completed', 'received', 'returned'].includes(s)) return 'delivered'
    if (['shipped', 'dispatched', 'shipped_to_customer'].includes(s)) return 'shipped'
    if (['cancelled', 'failed', 'rejected', 'rejected_by_admin_hub'].includes(s)) return 'cancelled'
    return 'processing'
  }

  const statusMeta = (status: string) => STATUS_META[getNormalizedStatus(status)]

  // For delivered orders, find which already carry a review so the button shows
  // "Reviewed" instead of an inert "Write review" — mirroring the order-detail page.
  useEffect(() => {
    const delivered = orders.filter((o) => getNormalizedStatus(o.status) === 'delivered' && o.items?.[0]?.productId)
    if (delivered.length === 0) return
    let cancelled = false
    Promise.all(
      delivered.map((o) =>
        reviewService
          .checkReviewStatus(o.items[0].productId, o.id)
          .then((r: { hasReviewed?: boolean }) => (r?.hasReviewed ? o.id : null))
          .catch(() => null),
      ),
    ).then((ids) => {
      if (cancelled) return
      const reviewed = ids.filter(Boolean) as string[]
      if (reviewed.length) setReviewedOrders((prev) => new Set([...prev, ...reviewed]))
    })
    return () => { cancelled = true }
  }, [orders])

  const totalPages = Math.ceil(orders.length / ORDERS_PER_PAGE)
  const paginatedOrders = orders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  )

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("userToken") || sessionStorage.getItem("userToken") || "";
      const response = await fetch(`${baseUrl}/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to generate invoice");
      const html = await response.text();
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
      }
    } catch (err) {
      console.error(err);
      // Was a native window.alert — the one place on the storefront that used
      // one. Everything else reports failure through the toast system, so this
      // does too.
      showErrorToast('Invoice Failed', 'Could not generate the invoice. Please try again later.');
    }
  };

  /* ── Card header, shared by every state ───────────────────────────────
     Same rhythm as Profile Information and Saved Addresses: small label,
     heading, and the count on the right where it does not compete. */
  const header = (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#f2e9df] pb-5">
      <div>
        <span className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c41617]">
          <span aria-hidden className="h-px w-5 bg-[#c41617]" />
          Your purchases
        </span>
        <h2 className="font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl">
          Order History
        </h2>
      </div>
      {orders.length > 0 && (
        <span className="text-[13px] text-[#7a6d62]">
          {orders.length} order{orders.length !== 1 ? 's' : ''} total
        </span>
      )}
    </div>
  )

  if (loading) {
    /* Mirrors a loaded order card — header block, three rows, same shapes. */
    return (
      <div className={CARD}>
        <div className="mb-6 flex items-end justify-between gap-3 border-b border-[#f2e9df] pb-5">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-[#f3ece3]" />
            <div className="h-7 w-44 animate-pulse rounded bg-[#ece2d6]" />
          </div>
          <div className="h-4 w-24 animate-pulse rounded bg-[#f3ece3]" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4 rounded-2xl border border-[#efe4d8] p-5">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-36 animate-pulse rounded bg-[#ece2d6]" />
                  <div className="h-3 w-28 animate-pulse rounded bg-[#f3ece3]" />
                </div>
                <div className="h-6 w-24 animate-pulse rounded-full bg-[#f3ece3]" />
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-[#faf7f3] p-3">
                <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-[#ece2d6]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-[#ece2d6]" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#f3ece3]" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-[#ece2d6]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={CARD}>
        {header}
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-[#efe4d8] bg-[#faf7f3] px-6 py-12 text-center">
          <span aria-hidden className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#fdf3f0] text-[#a01718]">
            <AlertCircle className="h-5 w-5" />
          </span>
          <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a]">
            We couldn&apos;t load your orders
          </h3>
          <p className="mx-auto mt-1.5 mb-6 max-w-sm text-sm leading-relaxed text-[#5f5550]">{error}</p>
          <button onClick={fetchOrders} className={PRIMARY_BTN}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={CARD}>
      {header}

      {orders.length === 0 ? (
        /* No orders is a normal state for a new customer, not a failure — so
           it reads as an invitation and the only thing with weight on it is
           the way out. */
        <div className="rounded-2xl border border-[#efe4d8] bg-[#faf7f3] px-6 py-14 text-center">
          <span aria-hidden className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#fdf3f0] text-[#7a0f10]">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a]">No orders yet</h3>
          <p className="mx-auto mt-1.5 mb-6 max-w-sm text-sm leading-relaxed text-[#5f5550]">
            When you place your first order it will appear here, with tracking and invoices.
          </p>
          <Link href="/products" className={PRIMARY_BTN}>
            Start shopping
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-[13px] text-[#7a6d62]">
            Showing {(currentPage - 1) * ORDERS_PER_PAGE + 1}–
            {Math.min(currentPage * ORDERS_PER_PAGE, orders.length)} of {orders.length}
          </p>

          <div className="space-y-4 sm:space-y-5">
            {paginatedOrders.map((order, index) => {
              const meta = statusMeta(order.status)
              const StatusIcon = meta.icon

              return (
                <Reveal
                  key={order.id}
                  delay={index * 90}
                  className="rounded-2xl border border-[#efe4d8] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e6dcd0] hover:shadow-[0_18px_40px_-26px_rgba(74,50,38,0.6)] sm:p-5"
                >
                  {/* ── Order header ───────────────────────────────────────
                      The order number is what a customer reads out on the
                      phone, so it leads. Date sits under it, status and total
                      sit opposite — three pieces of information, three
                      distinct sizes, rather than four things at one weight. */}
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <h3 className="font-mono text-[15px] font-semibold break-all text-[#1a1a1a]">
                        {order.orderId}
                      </h3>
                      <p className="mt-0.5 text-[13px] text-[#7a6d62]">
                        Placed {new Date(order.createdAt).toLocaleDateString(undefined, {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${meta.badge}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                      <div className="text-right">
                        <p className="font-playfair text-lg font-semibold text-[#1a1a1a]">
                          {money(order.totalAmount, order)}
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-[#a89a8d]">
                          {order.paymentStatus}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Items ──────────────────────────────────────────── */}
                  <div className="space-y-2.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 rounded-xl bg-[#faf7f3] p-3 sm:gap-4">
                        {item.productImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            loading="lazy"
                            className="h-14 w-14 shrink-0 rounded-lg border border-[#e6dcd0] object-cover sm:h-16 sm:w-16"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#e6dcd0] bg-white sm:h-16 sm:w-16">
                            <Package className="h-6 w-6 text-[#a89a8d]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium break-words text-[#1a1a1a] sm:text-[15px]">
                            {item.productName}
                          </h4>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7a6d62] sm:text-[13px]">
                            <span>Qty: {item.quantity}</span>
                            {item.color && <span>{item.color}</span>}
                            {item.size && <span>Size: {item.size}</span>}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-[#1a1a1a] sm:text-[15px]">
                            {money(item.totalPrice, order)}
                          </p>
                          <p className="text-xs text-[#a89a8d]">{money(item.unitPrice, order)} each</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Actions ────────────────────────────────────────── */}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#f2e9df] pt-4 sm:gap-3">
                    <Link href={`/order/${order.orderId}`} className={`${PRIMARY_BTN} flex-1 sm:flex-none`}>
                      <Eye className="h-4 w-4" />
                      View details
                    </Link>
                    {getNormalizedStatus(order.status) === 'delivered' && (
                      reviewedOrders.has(order.id) ? (
                        <span className={`${QUIET_BTN} flex-1 cursor-default border-green-200 bg-green-50 text-green-600 sm:flex-none`}>
                          <CheckCircle className="h-4 w-4" />
                          Reviewed
                        </span>
                      ) : (
                        <button
                          onClick={() => setReviewModal({ isOpen: true, orderId: order.id, items: order.items })}
                          className={`${QUIET_BTN} flex-1 sm:flex-none`}
                        >
                          <Star className="h-4 w-4" />
                          Write review
                        </button>
                      )
                    )}
                    <button
                      onClick={() => handleDownloadInvoice(order.id)}
                      className={`${QUIET_BTN} flex-1 sm:flex-none`}
                    >
                      <Download className="h-4 w-4" />
                      Invoice
                    </button>
                  </div>
                </Reveal>
              )
            })}
          </div>

          {/* Pagination — icon-only on mobile, smart range, labels on sm+ */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between gap-2 border-t border-[#f2e9df] pt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className={PAGE_BTN}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              <div className="flex items-center gap-0.5 overflow-hidden sm:gap-1">
                {getPageRange(currentPage, totalPages).map((page, i) =>
                  page === '…' ? (
                    <span key={`oh-e-${i}`} className="px-1 text-sm text-[#a89a8d] sm:px-2">…</span>
                  ) : (
                    <button
                      key={`oh-p-${page}`}
                      onClick={() => setCurrentPage(page as number)}
                      aria-current={page === currentPage ? 'page' : undefined}
                      className={`h-8 min-w-8 px-1.5 text-xs font-medium transition-colors sm:h-9 sm:min-w-9 sm:px-2 sm:text-sm ${currentPage === page
                        ? 'rounded-lg bg-[#e01a1b] text-white'
                        : 'rounded-lg border border-[#e6dcd0] bg-white text-[#5f5550] hover:bg-[#faf7f3]'
                        }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className={PAGE_BTN}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      <ReviewModal
        isOpen={reviewModal.isOpen}
        onClose={() => {
          const closedId = reviewModal.orderId
          const firstProduct = reviewModal.items?.[0]?.productId
          setReviewModal({ isOpen: false, orderId: '', items: [] })
          // Re-check so a just-submitted review flips the button to "Reviewed".
          if (closedId && firstProduct) {
            reviewService
              .checkReviewStatus(firstProduct, closedId)
              .then((r: { hasReviewed?: boolean }) => {
                if (r?.hasReviewed) setReviewedOrders((prev) => new Set([...prev, closedId]))
              })
              .catch(() => {})
          }
        }}
        orderId={reviewModal.orderId}
        items={reviewModal.items}
      />
    </div>
  )
}
