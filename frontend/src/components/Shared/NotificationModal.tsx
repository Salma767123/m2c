'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Bell, X, CheckCheck, ArrowLeft, Search,
  Check, Package, CreditCard, Star, AlertCircle, ShoppingCart,
  Calendar, Factory,
} from 'lucide-react'
import { notificationService, AppNotification } from '@/services/notificationService'

// Icons and backgrounds — consistent with NotificationDropdown
const ICON_MAP: Record<string, React.ReactNode> = {
  ORDER_RECEIVED:                <ShoppingCart className="h-5 w-5 text-blue-600" />,
  ORDER_CONFIRMED:               <Package      className="h-5 w-5 text-green-600" />,
  ORDER_IN_TRANSIT_TO_ADMIN_HUB: <Package      className="h-5 w-5 text-blue-600" />,
  ORDER_RECEIVED_AT_ADMIN_HUB:   <Package      className="h-5 w-5 text-teal-600" />,
  ORDER_SHIPPED_TO_CUSTOMER:     <Package      className="h-5 w-5 text-purple-600" />,
  ORDER_DELIVERED:               <Check        className="h-5 w-5 text-green-600" />,
  ORDER_CANCELLED:               <AlertCircle  className="h-5 w-5 text-red-600" />,
  PRODUCT_APPROVED:              <Check        className="h-5 w-5 text-green-600" />,
  PRODUCT_REJECTED:              <AlertCircle  className="h-5 w-5 text-red-600" />,
  REINSPECTION_REQUIRED:         <AlertCircle  className="h-5 w-5 text-orange-600" />,
  QC_ASSIGNED:                   <Star         className="h-5 w-5 text-blue-600" />,
  PAYMENT_RECEIVED:              <CreditCard   className="h-5 w-5 text-emerald-600" />,
  REVIEW_RECEIVED:               <Star         className="h-5 w-5 text-yellow-500" />,
  SUPPORT_REPLY:                 <Bell         className="h-5 w-5 text-indigo-600" />,
  VENDOR_STATUS_CHANGED:         <Check        className="h-5 w-5 text-gray-600" />,
  NEW_ORDER:                     <ShoppingCart className="h-5 w-5 text-blue-600" />,
  NEW_VENDOR_REGISTRATION:       <Star         className="h-5 w-5 text-purple-600" />,
  PRODUCT_PENDING_APPROVAL:      <Package      className="h-5 w-5 text-yellow-600" />,
  INSPECTION_COMPLETED:          <Check        className="h-5 w-5 text-green-600" />,
  NEW_SUPPORT_TICKET:            <Bell         className="h-5 w-5 text-indigo-600" />,
  ORDER_STATUS_CHANGE:           <Package      className="h-5 w-5 text-blue-600" />,
  LOW_STOCK_ALERT:               <AlertCircle  className="h-5 w-5 text-yellow-600" />,
  OUT_OF_STOCK:                  <AlertCircle  className="h-5 w-5 text-red-600" />,
  NEW_ENQUIRY:                   <Star         className="h-5 w-5 text-blue-600" />,
  REINSPECTION_RESULT:           <Check        className="h-5 w-5 text-orange-600" />,
  ORDER_RETURNED:                <CreditCard   className="h-5 w-5 text-red-600" />,
  ORDER_VENDOR_PROCESSING:       <Package      className="h-5 w-5 text-blue-600" />,
  ORDER_APPROVED_BY_ADMIN_HUB:   <Check        className="h-5 w-5 text-green-600" />,
  PAYMENT_OVERDUE:               <AlertCircle  className="h-5 w-5 text-red-600" />,
  // QC Checker notification types (sent by backend to QC_CHECKER role)
  VENDOR_ASSIGNED:               <Factory      className="h-5 w-5 text-brand-600" />,
  PRODUCT_ASSIGNED:              <Package      className="h-5 w-5 text-brand-600" />,
  INSPECTION_SCHEDULED:          <Calendar     className="h-5 w-5 text-blue-600" />,
  REINSPECTION_RAISED:           <AlertCircle  className="h-5 w-5 text-orange-600" />,
  INSPECTION_SUBMITTED:          <Check        className="h-5 w-5 text-teal-600" />,
  REINSPECTION_COMPLETED:        <Check        className="h-5 w-5 text-green-600" />,
  INSPECTION_FINAL_REJECTED:     <AlertCircle  className="h-5 w-5 text-red-600" />,
}

const BG_MAP: Record<string, string> = {
  ORDER_RECEIVED: 'bg-blue-50', ORDER_CONFIRMED: 'bg-green-50',
  ORDER_IN_TRANSIT_TO_ADMIN_HUB: 'bg-blue-50', ORDER_RECEIVED_AT_ADMIN_HUB: 'bg-teal-50',
  ORDER_SHIPPED_TO_CUSTOMER: 'bg-purple-50', ORDER_DELIVERED: 'bg-green-50',
  ORDER_CANCELLED: 'bg-red-50', PRODUCT_APPROVED: 'bg-green-50',
  PRODUCT_REJECTED: 'bg-red-50', REINSPECTION_REQUIRED: 'bg-orange-50',
  QC_ASSIGNED: 'bg-blue-50', PAYMENT_RECEIVED: 'bg-emerald-50',
  REVIEW_RECEIVED: 'bg-yellow-50', SUPPORT_REPLY: 'bg-indigo-50',
  VENDOR_STATUS_CHANGED: 'bg-gray-100', NEW_ORDER: 'bg-blue-50',
  NEW_VENDOR_REGISTRATION: 'bg-purple-50', PRODUCT_PENDING_APPROVAL: 'bg-yellow-50',
  INSPECTION_COMPLETED: 'bg-green-50', NEW_SUPPORT_TICKET: 'bg-indigo-50',
  ORDER_STATUS_CHANGE: 'bg-blue-50', LOW_STOCK_ALERT: 'bg-yellow-50',
  OUT_OF_STOCK: 'bg-red-50', NEW_ENQUIRY: 'bg-blue-50',
  REINSPECTION_RESULT: 'bg-orange-50', ORDER_RETURNED: 'bg-red-50',
  ORDER_VENDOR_PROCESSING: 'bg-blue-50', ORDER_APPROVED_BY_ADMIN_HUB: 'bg-green-50',
  PAYMENT_OVERDUE: 'bg-red-50',
  VENDOR_ASSIGNED: 'bg-brand-50',
  PRODUCT_ASSIGNED: 'bg-brand-50',
  INSPECTION_SCHEDULED: 'bg-blue-50',
  REINSPECTION_RAISED: 'bg-orange-50',
  INSPECTION_SUBMITTED: 'bg-teal-50',
  REINSPECTION_COMPLETED: 'bg-green-50',
  INSPECTION_FINAL_REJECTED: 'bg-red-50',
}

export interface CategoryDef {
  key: string
  label: string
  types: string[]
}

/** Default categories shown in Vendor / Admin panels */
export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { key: 'orders', label: 'Orders', types: ['ORDER_RECEIVED','ORDER_CONFIRMED','ORDER_IN_TRANSIT_TO_ADMIN_HUB','ORDER_RECEIVED_AT_ADMIN_HUB','ORDER_SHIPPED_TO_CUSTOMER','ORDER_DELIVERED','ORDER_CANCELLED','NEW_ORDER','ORDER_STATUS_CHANGE','ORDER_RETURNED','ORDER_VENDOR_PROCESSING','ORDER_APPROVED_BY_ADMIN_HUB'] },
  { key: 'products', label: 'Products', types: ['PRODUCT_APPROVED','PRODUCT_REJECTED','REINSPECTION_REQUIRED','QC_ASSIGNED','PRODUCT_PENDING_APPROVAL','INSPECTION_COMPLETED','REINSPECTION_RESULT','LOW_STOCK_ALERT','OUT_OF_STOCK'] },
  { key: 'payments', label: 'Payments', types: ['PAYMENT_RECEIVED','PAYMENT_OVERDUE'] },
  { key: 'support', label: 'Support', types: ['SUPPORT_REPLY','NEW_SUPPORT_TICKET','NEW_ENQUIRY','REVIEW_RECEIVED'] },
  { key: 'system', label: 'System', types: ['VENDOR_STATUS_CHANGED','NEW_VENDOR_REGISTRATION'] },
]

/** Categories relevant to the Quality Checker workflow */
export const QC_CATEGORIES: CategoryDef[] = [
  { key: 'assignments', label: 'Assignments', types: ['VENDOR_ASSIGNED','PRODUCT_ASSIGNED','QC_ASSIGNED'] },
  { key: 'inspections', label: 'Inspections', types: ['INSPECTION_SCHEDULED','REINSPECTION_RAISED','INSPECTION_COMPLETED','INSPECTION_SUBMITTED','REINSPECTION_COMPLETED','INSPECTION_FINAL_REJECTED','REINSPECTION_REQUIRED','REINSPECTION_RESULT'] },
  { key: 'vendor_status', label: 'Vendor Status', types: ['VENDOR_STATUS_CHANGED'] },
  { key: 'approvals', label: 'Approvals', types: ['PRODUCT_APPROVED','PRODUCT_PENDING_APPROVAL'] },
  { key: 'rejections', label: 'Rejections', types: ['PRODUCT_REJECTED','INSPECTION_FINAL_REJECTED'] },
  { key: 'support', label: 'Support', types: ['SUPPORT_REPLY','NEW_SUPPORT_TICKET','NEW_ENQUIRY'] },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type ReadFilter = 'all' | 'unread' | 'read'

const PAGE_SIZE = 30

interface Props {
  onClose: () => void
  onUnreadCountChange: (count: number) => void
  /** Category chip definitions. Defaults to vendor/admin categories. */
  categories?: CategoryDef[]
  /** Color scheme for read/unread indicators and action buttons. Defaults to 'blue'. */
  colorScheme?: 'blue' | 'brand'
}

export default function NotificationModal({
  onClose,
  onUnreadCountChange,
  categories = DEFAULT_CATEGORIES,
  colorScheme = 'blue',
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = useRef(false)

  const isBrand = colorScheme === 'brand'

  // Derived: the currently-open notification (always in sync with allNotifications)
  const selectedNotification = selectedId
    ? allNotifications.find(n => n.id === selectedId) ?? null
    : null

  useEffect(() => { setMounted(true) }, [])

  // Reset category filter when categories change (e.g. panel switch)
  useEffect(() => { setCategoryFilter('all') }, [categories])

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ESC: detail → list, list → close modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (selectedId) setSelectedId(null)
      else onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedId, onClose])

  // Initial page load
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await notificationService.getNotifications(1, PAGE_SIZE)
        if (res.success) {
          setAllNotifications(res.data)
          setPage(1)
          setHasMore(res.pagination.totalPages > 1)
          setTotalUnread(res.unreadCount)
          onUnreadCountChange(res.unreadCount)
        }
      } finally {
        setLoading(false)
      }
    }
    fetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load next page (triggered by infinite scroll sentinel)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMoreRef.current) return
    isLoadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const next = page + 1
      const res = await notificationService.getNotifications(next, PAGE_SIZE)
      if (res.success) {
        setAllNotifications(prev => [...prev, ...res.data])
        setPage(next)
        setHasMore(next < res.pagination.totalPages)
      }
    } finally {
      setLoadingMore(false)
      isLoadingMoreRef.current = false
    }
  }, [hasMore, page])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loadMore])

  // Client-side filter + search
  const displayed = allNotifications.filter(n => {
    if (readFilter === 'unread' && n.isRead) return false
    if (readFilter === 'read' && !n.isRead) return false
    if (categoryFilter !== 'all') {
      const cat = categories.find(c => c.key === categoryFilter)
      if (!cat || !cat.types.includes(n.type)) return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
    }
    return true
  })

  // Adjust the shared unread count by a delta and notify parent
  const adjustUnread = useCallback((delta: number) => {
    setTotalUnread(prev => {
      const next = Math.max(0, prev + delta)
      onUnreadCountChange(next)
      return next
    })
  }, [onUnreadCountChange])

  const handleMarkAsRead = useCallback(async (id: string) => {
    const target = allNotifications.find(n => n.id === id)
    if (!target || target.isRead) return
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    adjustUnread(-1)
    try { await notificationService.markAsRead(id) } catch { /* silent */ }
  }, [allNotifications, adjustUnread])

  const handleMarkAsUnread = useCallback(async (id: string) => {
    const target = allNotifications.find(n => n.id === id)
    if (!target || !target.isRead) return
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n))
    adjustUnread(+1)
    try { await notificationService.markAsUnread(id) } catch { /* silent */ }
  }, [allNotifications, adjustUnread])

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setAllNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setTotalUnread(0)
      onUnreadCountChange(0)
    } catch { /* silent */ }
  }

  const openDetail = (n: AppNotification) => {
    setSelectedId(n.id)
    if (!n.isRead) handleMarkAsRead(n.id)
  }

  if (!mounted) return null

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden rounded-t-2xl h-[90vh] sm:h-[680px] animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-300">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          {selectedNotification ? (
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors -ml-1 px-2 py-1 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-gray-900">All Notifications</h2>
              {totalUnread > 0 && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isBrand ? 'bg-brand-100 text-brand-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {totalUnread} unread
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1">
            {!selectedNotification && totalUnread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className={`flex items-center gap-1.5 text-xs font-semibold transition-colors px-3 py-2 rounded-lg ${
                  isBrand
                    ? 'text-brand-600 hover:text-brand-800 hover:bg-brand-50'
                    : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                }`}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Filters (list view only) ────────────────────────── */}
        {!selectedNotification && (
          <div className="px-4 sm:px-5 pt-3 pb-3 border-b border-gray-100 space-y-2.5 shrink-0 bg-gray-50/60">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors placeholder:text-gray-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Read filter — pill tabs */}
            <div className="flex items-center gap-1 bg-gray-200/60 p-0.5 rounded-lg w-fit">
              {(['all', 'unread', 'read'] as ReadFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setReadFilter(f)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                    readFilter === f
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Read'}
                </button>
              ))}
            </div>

            {/* Category chips — rendered from props */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* "All" chip */}
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all ${
                  categoryFilter === 'all'
                    ? isBrand
                      ? 'bg-brand-700 text-white shadow-sm'
                      : 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setCategoryFilter(cat.key)}
                  className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all ${
                    categoryFilter === cat.key
                      ? isBrand
                        ? 'bg-brand-700 text-white shadow-sm'
                        : 'bg-slate-800 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Scrollable body ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Detail view */}
          {selectedNotification ? (
            <div className="p-5 sm:p-6 max-w-lg mx-auto">
              <div className="flex flex-col items-center text-center pt-3 pb-6 border-b border-gray-100 mb-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${BG_MAP[selectedNotification.type] || 'bg-gray-100'}`}>
                  <div className="scale-150">
                    {ICON_MAP[selectedNotification.type] || <Bell className="h-5 w-5 text-gray-500" />}
                  </div>
                </div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {selectedNotification.type.replace(/_/g, ' ')}
                </p>
                <h3 className="text-lg font-bold text-gray-900 mb-1.5">
                  {selectedNotification.title}
                </h3>
                <p className="text-xs text-gray-400">{formatFullDate(selectedNotification.createdAt)}</p>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {selectedNotification.message}
              </p>

              {/* Extra metadata from notification.data */}
              {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
                <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Details</p>
                  {Object.entries(selectedNotification.data).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-sm">
                      <span className="text-gray-500 shrink-0 capitalize">
                        {k.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-gray-800 font-medium break-all">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Read / Unread toggle */}
              <div className="mt-6">
                {selectedNotification.isRead ? (
                  <button
                    onClick={() => handleMarkAsUnread(selectedNotification.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Bell className="h-4 w-4" />
                    Mark as unread
                  </button>
                ) : (
                  <button
                    onClick={() => handleMarkAsRead(selectedNotification.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      isBrand
                        ? 'text-brand-600 border border-brand-200 hover:bg-brand-50'
                        : 'text-blue-600 border border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    Mark as read
                  </button>
                )}
              </div>
            </div>

          ) : loading ? (
            /* Loading */
            <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-500" />
              <p className="text-sm">Loading notifications...</p>
            </div>

          ) : displayed.length === 0 ? (
            /* Empty state */
            <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
              <Bell className="h-12 w-12 text-gray-200" />
              <p className="text-sm font-medium text-gray-500 mt-1">
                {search
                  ? 'No notifications match your search'
                  : readFilter !== 'all'
                  ? `No ${readFilter} notifications`
                  : 'No notifications yet'}
              </p>
              {(search || readFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  onClick={() => { setSearch(''); setReadFilter('all'); setCategoryFilter('all') }}
                  className="mt-1 text-xs text-brand-600 hover:underline font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>

          ) : (
            /* Notification list */
            <>
              {displayed.map(n => (
                <button
                  key={n.id}
                  onClick={() => openDetail(n)}
                  className={`w-full text-left px-4 sm:px-5 py-4 border-b border-gray-50 transition-colors hover:bg-gray-50 active:bg-gray-100 ${
                    !n.isRead
                      ? isBrand ? 'bg-brand-50/40' : 'bg-blue-50/40'
                      : ''
                  }`}
                >
                  <div className="flex gap-3.5 min-w-0">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 ${BG_MAP[n.type] || 'bg-gray-100'}`}>
                      {ICON_MAP[n.type] || <Bell className="h-4 w-4 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] text-gray-400 whitespace-nowrap">
                            {timeAgo(n.createdAt)}
                          </span>
                          {!n.isRead && (
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isBrand ? 'bg-brand-500' : 'bg-blue-500'}`} />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 break-words leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="py-5 flex justify-center">
                  {loadingMore && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-300" />
                  )}
                </div>
              )}

              {!hasMore && allNotifications.length >= PAGE_SIZE && (
                <p className="text-center text-xs text-gray-300 py-5">
                  All notifications loaded
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
