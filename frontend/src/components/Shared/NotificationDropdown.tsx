'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Package, CreditCard, Star, AlertCircle, ShoppingCart, X } from 'lucide-react';
import { notificationService, AppNotification } from '@/services/notificationService';
import { onForegroundMessage } from '@/services/webNotificationService';

const POLL_INTERVAL = 5000; // 5 seconds — fast polling for near-real-time feel

const ICON_MAP: Record<string, React.ReactNode> = {
  ORDER_RECEIVED: <ShoppingCart className="h-4 w-4 text-blue-600" />,
  ORDER_CONFIRMED: <Package className="h-4 w-4 text-green-600" />,
  ORDER_IN_TRANSIT_TO_ADMIN_HUB: <Package className="h-4 w-4 text-blue-600" />,
  ORDER_RECEIVED_AT_ADMIN_HUB: <Package className="h-4 w-4 text-teal-600" />,
  ORDER_SHIPPED_TO_CUSTOMER: <Package className="h-4 w-4 text-purple-600" />,
  ORDER_DELIVERED: <Check className="h-4 w-4 text-green-600" />,
  ORDER_CANCELLED: <AlertCircle className="h-4 w-4 text-red-600" />,
  PRODUCT_APPROVED: <Check className="h-4 w-4 text-green-600" />,
  PRODUCT_REJECTED: <AlertCircle className="h-4 w-4 text-red-600" />,
  REINSPECTION_REQUIRED: <AlertCircle className="h-4 w-4 text-orange-600" />,
  QC_ASSIGNED: <Star className="h-4 w-4 text-blue-600" />,
  PAYMENT_RECEIVED: <CreditCard className="h-4 w-4 text-emerald-600" />,
  REVIEW_RECEIVED: <Star className="h-4 w-4 text-yellow-500" />,
  SUPPORT_REPLY: <Bell className="h-4 w-4 text-indigo-600" />,
  VENDOR_STATUS_CHANGED: <Check className="h-4 w-4 text-gray-600" />,
  NEW_ORDER: <ShoppingCart className="h-4 w-4 text-blue-600" />,
  NEW_VENDOR_REGISTRATION: <Star className="h-4 w-4 text-purple-600" />,
  PRODUCT_PENDING_APPROVAL: <Package className="h-4 w-4 text-yellow-600" />,
  INSPECTION_COMPLETED: <Check className="h-4 w-4 text-green-600" />,
  NEW_SUPPORT_TICKET: <Bell className="h-4 w-4 text-indigo-600" />,
  ORDER_STATUS_CHANGE: <Package className="h-4 w-4 text-blue-600" />,
  LOW_STOCK_ALERT: <AlertCircle className="h-4 w-4 text-yellow-600" />,
  OUT_OF_STOCK: <AlertCircle className="h-4 w-4 text-red-600" />,
  NEW_ENQUIRY: <Star className="h-4 w-4 text-blue-600" />,
  REINSPECTION_RESULT: <Check className="h-4 w-4 text-orange-600" />,
  ORDER_RETURNED: <CreditCard className="h-4 w-4 text-red-600" />,
  ORDER_VENDOR_PROCESSING: <Package className="h-4 w-4 text-blue-600" />,
  ORDER_APPROVED_BY_ADMIN_HUB: <Check className="h-4 w-4 text-green-600" />,
  PAYMENT_OVERDUE: <AlertCircle className="h-4 w-4 text-red-600" />,
};

const BG_MAP: Record<string, string> = {
  ORDER_RECEIVED: 'bg-blue-50',
  ORDER_CONFIRMED: 'bg-green-50',
  ORDER_IN_TRANSIT_TO_ADMIN_HUB: 'bg-blue-50',
  ORDER_RECEIVED_AT_ADMIN_HUB: 'bg-teal-50',
  ORDER_SHIPPED_TO_CUSTOMER: 'bg-purple-50',
  ORDER_DELIVERED: 'bg-green-50',
  ORDER_CANCELLED: 'bg-red-50',
  PRODUCT_APPROVED: 'bg-green-50',
  PRODUCT_REJECTED: 'bg-red-50',
  REINSPECTION_REQUIRED: 'bg-orange-50',
  QC_ASSIGNED: 'bg-blue-50',
  PAYMENT_RECEIVED: 'bg-emerald-50',
  REVIEW_RECEIVED: 'bg-yellow-50',
  SUPPORT_REPLY: 'bg-indigo-50',
  VENDOR_STATUS_CHANGED: 'bg-gray-100',
  NEW_ORDER: 'bg-blue-50',
  NEW_VENDOR_REGISTRATION: 'bg-purple-50',
  PRODUCT_PENDING_APPROVAL: 'bg-yellow-50',
  INSPECTION_COMPLETED: 'bg-green-50',
  NEW_SUPPORT_TICKET: 'bg-indigo-50',
  ORDER_STATUS_CHANGE: 'bg-blue-50',
  LOW_STOCK_ALERT: 'bg-yellow-50',
  OUT_OF_STOCK: 'bg-red-50',
  NEW_ENQUIRY: 'bg-blue-50',
  REINSPECTION_RESULT: 'bg-orange-50',
  ORDER_RETURNED: 'bg-red-50',
  ORDER_VENDOR_PROCESSING: 'bg-blue-50',
  ORDER_APPROVED_BY_ADMIN_HUB: 'bg-green-50',
  PAYMENT_OVERDUE: 'bg-red-50',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

interface IncomingToast {
  title: string;
  body: string;
  type: string;
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<IncomingToast | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch notifications from backend API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationService.getNotifications(1, 50);
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch just the unread count (lightweight)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silent
    }
  }, []);

  // Poll unread count as fallback
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // FCM foreground listener — instant refresh on push + toast
  useEffect(() => {
    const unsub = onForegroundMessage((title, body, data) => {
      // Instantly refresh from API
      fetchNotifications();

      // Show toast banner
      setToast({ title, body, type: data.type || '' });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 5000);
    });

    return () => { if (unsub) unsub(); };
  }, [fetchNotifications]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const dismissToast = () => {
    setToast(null);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  };

  return (
    <>
      {/* Toast Banner — shows when FCM push arrives in foreground */}
      {toast && (
        <div className="fixed top-3 sm:top-4 right-3 sm:right-4 left-3 sm:left-auto z-100 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-gray-900 text-white rounded-xl shadow-2xl p-3 sm:p-4 sm:max-w-sm sm:ml-auto flex gap-2.5 sm:gap-3 border border-gray-700">
            <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${BG_MAP[toast.type] || 'bg-gray-700'}`}>
              {ICON_MAP[toast.type] || <Bell className="h-4 w-4 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{toast.title}</p>
              <p className="text-xs text-gray-300 mt-0.5 line-clamp-2 break-words">{toast.body}</p>
            </div>
            <button onClick={dismissToast} aria-label="Dismiss notification" className="shrink-0 p-1 hover:bg-gray-700 rounded-lg transition-colors self-start">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Bell + Dropdown */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(prev => !prev)}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          /* Dropdown — `fixed` on mobile so it anchors to the viewport (Bell sits in the middle of the icon row, so `right-0` relative to Bell would push it off-screen left). `absolute` on sm+ where Bell has enough room to the right. */
          <div className="fixed sm:absolute top-[4.25rem] sm:top-full sm:mt-2 right-2 sm:right-0 left-2 sm:left-auto sm:w-96 max-h-[82vh] sm:max-h-none bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 gap-2 shrink-0">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors shrink-0"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 sm:max-h-96 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No notifications yet</p>
                  <p className="text-xs text-gray-300 mt-1">You&apos;ll be notified about orders, approvals, and payments</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.isRead) handleMarkAsRead(n.id); }}
                    className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                      n.isRead ? '' : 'bg-blue-50/40'
                    }`}
                  >
                    <div className="flex gap-2.5 sm:gap-3 min-w-0">
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                        BG_MAP[n.type] || 'bg-gray-100'
                      }`}>
                        {ICON_MAP[n.type] || <Bell className="h-4 w-4 text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${n.isRead ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                            {n.title}
                          </p>
                          {!n.isRead && <span className="shrink-0 w-2 h-2 bg-blue-500 rounded-full" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 break-words">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
