import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Download,
  RotateCcw,
  Copy,
  ExternalLink,
  Calendar,
  LifeBuoy,
  Star,
  ShoppingCart,
  Eye,
  Sparkles,
} from 'lucide-react-native';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import { router } from 'expo-router';
import { orderService, Order } from '@/services/orderService';
import { userAuthService } from '@/services/userAuthService';
import { showErrorToast, showSuccessToast } from '@/lib/toast-utils';
import { OrdersSkeleton } from '@/components/ui/Skeleton';
import { Palette, Radius, Fonts } from '@/constants/theme';
import { getRegionalPrice, getRegion, formatPrice } from '@/lib/currency';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import axios from '@/lib/axios';
import { courierName, courierTrackingUrl } from '@/lib/couriers';
import OrderActionModal, { type OrderAction } from '@/components/WebSite/Order/OrderActionModal';
import EmptyState from '@/components/WebSite/Shared/EmptyState';
import { LinearGradient } from 'expo-linear-gradient';
import {
  publicProductService,
  type PublicProduct,
} from '@/services/publicProductService';
import ReturnRequestModal from '@/components/WebSite/Order/ReturnRequestModal';
import {
  returnService,
  returnStatusStyle,
  type ReturnRequest,
} from '@/services/returnService';

/* `bg-slate-50` — #f8fafc. The order list is one of the few pages the web
   keeps on a cool ground rather than a warm one, so this follows it rather
   than the warm #f9f5f2 the cart and product pages use. */
const ORDERS_GROUND = '#f8fafc';

// ─── Status styling ───────────────────────────────────────────────────────────
type CustomerStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled';
type StatusInfo = { icon: any; label: string; bg: string; fg: string; dot: string };

// Collapse internal/admin statuses → 4 customer-facing statuses (matches web Order.tsx).
// Customers never see internal states like order_created, packed_by_vendor,
// in_transit_to_admin_hub, approved_by_admin_hub, etc.
const normalizeStatus = (s: string): CustomerStatus => {
  const n = (s || '').toLowerCase();
  if (['dispatched', 'shipped', 'shipped_to_customer'].includes(n)) return 'shipped';
  if (['completed', 'delivered', 'received', 'returned'].includes(n)) return 'delivered';
  if (['cancelled', 'failed', 'rejected', 'rejected_by_admin_hub'].includes(n)) return 'cancelled';
  return 'processing';
};

const STATUS_MAP: Record<CustomerStatus, StatusInfo> = {
  processing: { icon: Clock,       label: 'Processing', bg: '#fffbeb', fg: '#b45309', dot: '#f59e0b' },
  shipped:    { icon: Truck,       label: 'Shipped',    bg: '#eff6ff', fg: '#1d4ed8', dot: '#3b82f6' },
  delivered:  { icon: CheckCircle, label: 'Delivered',  bg: '#ecfdf5', fg: '#047857', dot: '#10b981' },
  cancelled:  { icon: XCircle,     label: 'Cancelled',  bg: '#fef2f2', fg: '#b91c1c', dot: '#ef4444' },
};

const getStatus = (s: string): StatusInfo => STATUS_MAP[normalizeStatus(s)];

/** Same options as the web list's status dropdown. */
const STATUS_FILTERS = [
  { value: 'all', label: 'All Orders' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  /* "Returned" is not an order status — it means a return request exists for
     the order. Returns are INR-only, so the web gates this option on region
     and so does the chip below. */
  { value: 'returned', label: 'Returned' },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]['value'];

/**
 * Statuses a customer may still cancel from — everything up to dispatch.
 *
 * Verbatim from frontend Order.tsx (and the same set orders/[id].tsx already
 * uses), so the list and the detail screen agree on when Cancel is offered.
 */
const CANCELLABLE_STATUSES = new Set([
  'ORDER_CREATED',
  'VENDOR_PROCESSING',
  'PACKED_BY_VENDOR',
  'IN_TRANSIT_TO_ADMIN_HUB',
  'RECEIVED_AT_ADMIN_HUB',
  'APPROVED_BY_ADMIN_HUB',
]);

/**
 * Money for an order row.
 *
 * Bound to the ORDER's own currency, not the app region. Two reasons, both of
 * which the previous hardcoded `$${n.toFixed(2)}` got wrong:
 *  - an INR order rendered as "$1234.00";
 *  - even using formatPrice() bare would fall back to the region, so a USD order
 *    viewed from the .in region would render as ₹.
 * An order's currency is fixed at purchase — it is what the customer was actually
 * charged and what a refund must be issued in. Mirrors OrderDetail.tsx on the web.
 */
const money = (n: number, currency?: string | null) =>
  formatPrice(n, currency === 'USD' ? 'USD' : 'INR');

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  /* Date range. Held as YYYY-MM-DD strings exactly as the web does, so the
     range test below can stay a copy of its `withinDates`. */
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  /* Everything below backs the per-order actions the web list card carries and
     mobile's did not: the card ended at "View Details", so cancelling, returning,
     pulling an invoice or reading a tracking id all required opening the order
     first. The detail screen already had them; the list did not. */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [actionModal, setActionModal] = useState<{ order: Order; type: OrderAction } | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [trackOrder, setTrackOrder] = useState<Order | null>(null);
  const [returnModalOrder, setReturnModalOrder] = useState<Order | null>(null);
  /* Latest return request per order code — drives the Return control's state
     and the badge that replaces it once a return has been raised. */
  const [returnsByOrder, setReturnsByOrder] = useState<Record<string, ReturnRequest>>({});
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  useEffect(() => {
    (async () => {
      const auth = await userAuthService.isAuthenticated();
      setIsAuth(auth);
      if (auth) fetchOrders();
      else setLoading(false);
    })();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getUserOrders();
      if (res.success && res.data) setOrders(res.data);
    } catch {
      showErrorToast('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMyReturns = useCallback(async () => {
    try {
      const res = await returnService.getMyReturns();
      const map: Record<string, ReturnRequest> = {};
      // Newest-first from the API, so the first seen per order is the latest.
      for (const r of res.data || []) if (!map[r.orderCode]) map[r.orderCode] = r;
      setReturnsByOrder(map);
    } catch {
      /* non-blocking — the Return control just falls back to its default */
    }
  }, []);

  useEffect(() => {
    if (isAuth) fetchMyReturns();
  }, [isAuth, fetchMyReturns]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
    fetchMyReturns();
  }, [fetchMyReturns]);

  /** Show every line of an order inline, as the web's chevron toggle does. */
  const toggleExpand = useCallback((orderId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  /**
   * Cancel / return, then refetch so the card's status and action set update
   * without the user pulling to refresh.
   */
  const submitAction = useCallback(
    async (reason: string) => {
      if (!actionModal) return;
      setActionSubmitting(true);
      try {
        /* Cancel only. Returns go through ReturnRequestModal and POST /returns;
           the branch that used to sit here called the older
           /orders/:id/return and is no longer reachable from this screen. */
        const res = await orderService.cancelOrder(actionModal.order.id, reason || undefined);
        showSuccessToast('Order Cancelled', res.message || 'Your order has been cancelled.');
        setActionModal(null);
        await fetchOrders();
      } catch (err: any) {
        showErrorToast('Failed', err?.message || 'Could not complete that. Please try again.');
      } finally {
        setActionSubmitting(false);
      }
    },
    [actionModal],
  );

  /** Same endpoint and WebView presentation as orders/[id].tsx. */
  const downloadInvoice = useCallback(async (orderId: string) => {
    setLoadingInvoice(true);
    try {
      const res = await axios.get(`/orders/${orderId}/invoice`, { responseType: 'text' });
      setInvoiceHtml(typeof res.data === 'string' ? res.data : String(res.data));
    } catch {
      showErrorToast('Failed', 'Could not generate invoice. Please try again.');
    } finally {
      setLoadingInvoice(false);
    }
  }, []);

  /**
   * Search + status filter, matching the web list's semantics exactly:
   * search matches the order number OR any item name; the status filter is a
   * substring test against the normalised status.
   *
   * Applied BEFORE the active/history split so the tab counts reflect what the
   * filters actually leave behind — otherwise a tab could advertise "3" and then
   * render an empty list.
   */
  /**
   * Copy of the web's `withinDates`. Both bounds are inclusive: `from` opens at
   * local midnight, `to` closes at the last millisecond of that day, so picking
   * the same date for both keeps that day's orders.
   */
  const withinDates = useCallback(
    (iso?: string) => {
      if (!iso) return true;
      const t = new Date(iso).getTime();
      if (fromDate && t < new Date(`${fromDate}T00:00:00`).getTime()) return false;
      if (toDate && t > new Date(`${toDate}T23:59:59.999`).getTime()) return false;
      return true;
    },
    [fromDate, toDate],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesSearch =
        !q ||
        o.orderId?.toLowerCase().includes(q) ||
        // An order line's name field is `productName`. This read `it.name`,
        // which is never set on mobile's OrderItem, so searching by product
        // silently matched nothing and only order numbers ever hit.
        (o.items ?? []).some((it) => it?.productName?.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (!withinDates(o.orderDate || o.createdAt)) return false;
      if (statusFilter === 'all') return true;
      // "Returned" asks whether a return exists, not what the order's status is.
      if (statusFilter === 'returned') return !!returnsByOrder[o.orderId];
      return normalizeStatus(o.status).includes(statusFilter);
    });
  }, [orders, search, statusFilter, withinDates, returnsByOrder]);

  const active = filtered.filter((o) => !['delivered', 'cancelled'].includes(normalizeStatus(o.status)));
  const history = filtered.filter((o) => ['delivered', 'cancelled'].includes(normalizeStatus(o.status)));
  const display = tab === 'active' ? active : history;
  const isFiltering =
    search.trim().length > 0 || statusFilter !== 'all' || fromDate !== '' || toDate !== '';

  /** The web's clearFilters — resets every control in the bar, not just search. */
  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: ORDERS_GROUND }}>
        <ScreenHeader icon={Package} title="My Orders" subtitle="Track and manage your orders" trailing={{ value: 0, label: 'Total Orders' }} />
        <OrdersSkeleton />
      </View>
    );
  }

  // ── Auth required ───────────────────────────────────────────────────────
  if (!isAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: ORDERS_GROUND }}>
        <ScreenHeader icon={Package} title="My Orders" subtitle="Track and manage your orders" trailing={{ value: 0, label: 'Total Orders' }} />
        <EmptyState
          icon={Package}
          title="Login Required"
          subtitle="Sign in to view and track your orders."
          ctaLabel="Login to Continue"
          onPress={() => router.push('/(auth)/Login')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: ORDERS_GROUND }}>
      <ScreenHeader icon={Package} title="My Orders" subtitle="Track and manage your orders" trailing={{ value: filtered.length, label: 'Total Orders' }} />

      {/* One white card holding every control, as the web does: what, which
          status, and when. Each field carries the same small uppercase label so
          the row lines up and nothing sits in an unlabelled band. */}
      <View style={os.filterCard}>
        <View>
          <Text style={os.fieldLabel}>Search</Text>
          <View style={os.searchBar}>
            <Search size={16} color={Palette.textSubtle} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Order no. or product…"
              placeholderTextColor={Palette.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={os.searchInput}
              accessibilityLabel="Search orders"
            />
            {search.length > 0 ? (
              <Pressable
                onPress={() => setSearch('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <X size={15} color={Palette.textSubtle} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Status. The web uses a dropdown; chips keep the current selection
            visible without a tap and give a proper touch target. */}
        <View style={{ marginTop: 12 }}>
          <Text style={os.fieldLabel}>Status</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            style={{ flexGrow: 0 }}
          >
            {STATUS_FILTERS.filter((f) => f.value !== 'returned' || getRegion() === 'IN').map((f) => {
              const isActive = statusFilter === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setStatusFilter(f.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Filter by ${f.label}`}
                  style={[os.filterChip, isActive && os.filterChipActive]}
                >
                  <Text style={[os.filterChipText, isActive && os.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <DateField
            label="From"
            value={fromDate}
            onChange={setFromDate}
            maximumDate={toDate ? new Date(`${toDate}T00:00:00`) : undefined}
          />
          <DateField
            label="To"
            value={toDate}
            onChange={setToDate}
            minimumDate={fromDate ? new Date(`${fromDate}T00:00:00`) : undefined}
          />
        </View>

        {isFiltering ? (
          <Pressable
            onPress={clearFilters}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            style={os.clearBtn}
          >
            <Text style={os.clearBtnText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Segmented tab control */}
      {/* Segmented tab control */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#e9eaee',
            borderRadius: 12,
            padding: 4,
          }}
        >
          {/* The web stacks two sections, "Current Orders" and "Past Orders".
              A phone switches between them rather than scrolling past one to
              reach the other, but the words are the web's. */}
          <SegTab label="Current" count={active.length} active={tab === 'active'} onPress={() => setTab('active')} />
          <SegTab label="Past" count={history.length} active={tab === 'history'} onPress={() => setTab('history')} />
        </View>
      </View>

      {display.length === 0 ? (
        /* The panels below stay even with no orders — the web shows them either
           way, and an account with nothing in it is exactly when somewhere to
           go next is worth offering. */
        <ScrollView
          contentContainerStyle={{ paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        >
        {/* "Nothing matched your filters" is a different problem from "you have no
           orders" — offering Start Shopping to someone mid-search is unhelpful, so
           the filtered case offers a way back out of the filters instead. */}
        {isFiltering ? (
          <EmptyState
            fill={false}
            icon={Package}
            title="No Orders Found"
            subtitle="Try adjusting your search, status or dates"
            ctaLabel="Clear Filters"
            onPress={clearFilters}
          />
        ) : (
          <EmptyState
            fill={false}
            icon={Package}
            title="No Orders Found"
            subtitle={
              tab === 'active'
                ? "You haven't placed any orders yet"
                : 'Completed and cancelled orders will appear here.'
            }
            ctaLabel="Start Shopping"
            onPress={() => router.push('/(tabs)' as any)}
          />
        )}
        <SidebarSections />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />}
        >
          {display.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expanded.has(order.id)}
              onToggleExpand={() => toggleExpand(order.id)}
              onTrack={() => setTrackOrder(order)}
              onInvoice={() => downloadInvoice(order.id)}
              invoiceBusy={loadingInvoice}
              onCancel={() => setActionModal({ order, type: 'cancel' })}
              onReturn={() => setReturnModalOrder(order)}
              existingReturn={returnsByOrder[order.orderId]}
            />
          ))}
          <SidebarSections />
        </ScrollView>
      )}

      {/* Cancel / return — the same sheet the detail screen uses, so the reason
          lists stay identical no matter where the customer acts from. */}
      <OrderActionModal
        action={actionModal?.type ?? null}
        submitting={actionSubmitting}
        onSubmit={submitAction}
        onClose={() => setActionModal(null)}
      />

      <ReturnRequestModal
        open={!!returnModalOrder}
        order={returnModalOrder}
        onClose={() => setReturnModalOrder(null)}
        onSubmitted={() => {
          setReturnModalOrder(null);
          fetchOrders();
          fetchMyReturns();
        }}
      />

      <TrackOrderModal order={trackOrder} onClose={() => setTrackOrder(null)} />

      {/* Invoice — the backend returns rendered HTML. */}
      <Modal
        visible={invoiceHtml !== null}
        animationType="slide"
        onRequestClose={() => setInvoiceHtml(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
          <View style={os.invoiceBar}>
            <Text style={os.invoiceTitle}>Invoice</Text>
            <Pressable
              onPress={() => setInvoiceHtml(null)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close invoice"
            >
              <X size={22} color={Palette.text} />
            </Pressable>
          </View>
          {invoiceHtml ? (
            <WebView originWhitelist={['*']} source={{ html: invoiceHtml }} style={{ flex: 1 }} />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// ─── Track Order modal ────────────────────────────────────────────────────────
/**
 * Ports the web list's track dialog: courier partner, the consignment id with a
 * copy button, and a link out to the courier's own page when one is configured.
 */
function TrackOrderModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  if (!order) return null;

  const tracking = order.trackingReference || '';
  const url = courierTrackingUrl(order.courier, tracking);
  const name = order.courier ? courierName(order.courier) : 'Courier';

  const copy = async () => {
    await Clipboard.setStringAsync(tracking);
    showSuccessToast('Copied', 'Tracking ID copied');
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={os.trackBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={os.trackSheet}>
          <View style={os.trackAccent} />
          <View style={os.trackHead}>
            <View style={os.trackIcon}>
              <Truck size={20} color={Palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={os.trackTitle}>Track Order</Text>
              <Text style={os.trackSub}>#{order.orderId}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color="#94a3b8" />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
            <View style={os.trackBox}>
              <Text style={os.trackLabel}>Courier Partner</Text>
              <Text style={os.trackValue}>{name}</Text>
            </View>

            <View style={os.trackBox}>
              <Text style={os.trackLabel}>Tracking ID</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={[os.trackValue, { flex: 1, marginTop: 0 }]} selectable>
                  {tracking}
                </Text>
                <Pressable
                  onPress={copy}
                  accessibilityRole="button"
                  accessibilityLabel="Copy tracking ID"
                  style={os.copyBtn}
                >
                  <Copy size={13} color="#475569" />
                  <Text style={os.copyText}>Copy</Text>
                </Pressable>
              </View>
            </View>

            {url ? (
              <Pressable
                onPress={() => Linking.openURL(url)}
                accessibilityRole="link"
                accessibilityLabel={`Track on ${name} website`}
                style={os.trackCta}
              >
                <Text style={os.trackCtaText}>Track on {name} website</Text>
                <ExternalLink size={15} color="#ffffff" />
              </Pressable>
            ) : (
              <Text style={os.trackNote}>
                Use the tracking ID on {name}&apos;s website to see live status.
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
// ─── Date field ───────────────────────────────────────────────────────────────
/**
 * One FROM / TO control, backed by the platform's own date dialog.
 *
 * The web uses a native `<input type="date">` precisely so the calendar is the
 * operating system's; this is the same bargain on the phone.
 *
 * Values are held as `YYYY-MM-DD` strings, matching the web's state, so the
 * range check below can stay identical to `withinDates` in Order.tsx.
 */
function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const [open, setOpen] = useState(false);

  // Parse as LOCAL midnight. `new Date('2026-09-21')` parses as UTC and can
  // land on the previous day west of Greenwich.
  const asDate = (v: string): Date | null => {
    if (!v) return null;
    const [y, m, d] = v.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const current = asDate(value);

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={os.fieldLabel}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label} date, ${current ? value : 'any date'}`}
        style={os.dateBtn}
      >
        <Calendar size={15} color={Palette.textSubtle} />
        <Text style={[os.dateText, !current && os.datePlaceholder]} numberOfLines={1}>
          {current
            ? current.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Any date'}
        </Text>
        {current ? (
          <Pressable
            onPress={() => onChange('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label} date`}
          >
            <X size={13} color={Palette.textSubtle} />
          </Pressable>
        ) : null}
      </Pressable>

      {open ? (
        <DateTimePicker
          value={current ?? new Date()}
          mode="date"
          // Android's dialog dismisses itself; iOS keeps the spinner mounted.
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, picked) => {
            setOpen(Platform.OS === 'ios' && event.type !== 'dismissed');
            if (event.type === 'set' && picked) onChange(toIso(picked));
          }}
        />
      ) : null}
    </View>
  );
}

// ─── Segmented Tab ──────────────────────────────────────────────────────────────
function SegTab({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count} orders`}
      style={{ flex: 1 }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 40,
          borderRadius: 9,
          backgroundColor: active ? '#fff' : 'transparent',
          gap: 6,
          shadowColor: active ? '#0f172a' : 'transparent',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: active ? 0.1 : 0,
          shadowRadius: 3,
          elevation: active ? 2 : 0,
        }}
      >
        <Text style={{ fontFamily: Fonts.sansBold, fontSize: 14, fontWeight: '700', color: active ? '#0f172a' : '#64748b' }}>
          {label}
        </Text>
        <View
          style={{
            minWidth: 22,
            height: 20,
            borderRadius: 10,
            paddingHorizontal: 6,
            backgroundColor: active ? '#111827' : '#d6d8dd',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: Fonts.sansBold, fontSize: 11, fontWeight: '800', color: active ? '#fff' : '#475569' }}>
            {count}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({
  order,
  expanded,
  onToggleExpand,
  onTrack,
  onInvoice,
  invoiceBusy,
  onCancel,
  onReturn,
  existingReturn,
}: {
  order: Order;
  expanded: boolean;
  onToggleExpand: () => void;
  onTrack: () => void;
  onInvoice: () => void;
  invoiceBusy: boolean;
  onCancel: () => void;
  onReturn: () => void;
  /** The latest return raised against this order, if any. */
  existingReturn?: ReturnRequest;
}) {
  const status = getStatus(order.status);
  const items = order.items || [];
  const firstItem = items[0];
  const extraCount = items.length - 1;
  const shown = expanded ? items : items.slice(0, 1);

  // Gating copied from the web list card (and matching orders/[id].tsx).
  const canCancel = CANCELLABLE_STATUSES.has(order.status);
  const returnStatus = order.returnRequest?.status;
  /*
   * Returns are an INR feature: the web offers Return only when the order is
   * DELIVERED, its currency is not USD, and at least one line is still
   * return-eligible. A delivered USD order gets Contact Support instead —
   * mobile used to offer Return on both, and the request would have been
   * rejected server-side.
   */
  const delivered = order.status === 'DELIVERED';
  const hasReturnableItem = (order.items || []).some(
    (it) => it.returnable !== false,
  );
  const canReturn =
    delivered &&
    order.currency !== 'USD' &&
    hasReturnableItem &&
    !existingReturn &&
    returnStatus !== 'Requested' &&
    returnStatus !== 'Approved';
  const showContactSupport = delivered && order.currency === 'USD' && !existingReturn;
  const returnPending = returnStatus === 'Requested';
  const refund = order.refundStatus;
  const showRefund = !!refund && ['INITIATED', 'PROCESSED', 'MANUAL'].includes(refund);
  const normalized = normalizeStatus(order.status);
  const showEta =
    !!order.estimatedDelivery && normalized !== 'delivered' && normalized !== 'cancelled';

  const openDetail = () => router.push(`/(tabs)/orders/${order.id}` as any);

  return (
    /* The card root is a plain View, not a Pressable. It used to wrap the whole
       card, which would leave every action button below as a nested pressable
       competing with the parent for the touch. The tappable region is now the
       summary only, and the actions sit outside it. */
    <View style={os.card}>
      <Pressable
        onPress={openDetail}
        accessibilityRole="button"
        accessibilityLabel={`Order ${order.orderId}, ${status.label}, total ${money(order.totalAmount, order.currency)}`}
        android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
      >
        {/* Header: order id + date / status */}
        <View style={os.cardHead}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={os.orderNo}>#{order.orderId}</Text>
            <Text style={os.orderDate}>
              {orderService.formatDate(order.orderDate || order.createdAt)}
            </Text>
          </View>
          <View style={[os.statusPill, { backgroundColor: status.bg }]}>
            <View style={[os.statusDot, { backgroundColor: status.dot }]} />
            <Text style={[os.statusText, { color: status.fg }]}>{status.label}</Text>
          </View>
        </View>

        {/* Item preview */}
        {firstItem ? (
          <View style={{ marginHorizontal: 16, gap: 8 }}>
            {shown.map((it, i) => (
              <View key={it.id || `${it.productId}-${i}`} style={os.itemRow}>
                <View style={os.itemThumb}>
                  {it.productImage ? (
                    <Image
                      source={{ uri: it.productImage }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="contain"
                    />
                  ) : (
                    <Package size={22} color="#94a3b8" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={os.itemName} numberOfLines={1}>
                    {it.productName}
                  </Text>
                  <Text style={os.itemMeta}>
                    Qty: {it.quantity}
                    {/* Variant identity — the order line carries size and colour
                        and the card was dropping both. */}
                    {it.size ? `  ·  ${it.size}` : ''}
                    {it.color ? `  ·  ${it.color}` : ''}
                    {!expanded && extraCount > 0
                      ? `  ·  +${extraCount} more ${extraCount === 1 ? 'item' : 'items'}`
                      : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>

      {/* Expand / collapse the remaining lines, as the web's chevron toggle does. */}
      {extraCount > 0 ? (
        <Pressable
          onPress={onToggleExpand}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? 'Show fewer items' : `Show all ${items.length} items`}
          style={os.expandRow}
        >
          <Text style={os.expandText}>
            {expanded ? 'Show less' : `Show all ${items.length} items`}
          </Text>
          <ChevronDown
            size={15}
            color={Palette.primary}
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
          />
        </Pressable>
      ) : null}

      {/* Estimated delivery */}
      {showEta ? (
        <View style={os.etaBox}>
          <Text style={os.etaText}>
            Estimated delivery: {orderService.formatDate(order.estimatedDelivery!)}
          </Text>
        </View>
      ) : null}

      {/* Total */}
      <View style={os.totalRow}>
        <View>
          <Text style={os.totalLabel}>Total</Text>
          <Text style={os.totalValue}>{money(order.totalAmount, order.currency)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={os.actionRow}>
        <Pressable
          onPress={openDetail}
          accessibilityRole="button"
          accessibilityLabel="View details"
          style={[os.actionBtn, os.actionPrimary]}
        >
          <Text style={os.actionPrimaryText}>View Details</Text>
          <ChevronRight size={15} color="#fff" strokeWidth={2.5} />
        </Pressable>

        {/* Nothing left to track once it has arrived — the web hides this on a
            delivered order and mobile kept showing it. */}
        {order.trackingReference && normalized !== 'delivered' ? (
          <Pressable
            onPress={onTrack}
            accessibilityRole="button"
            accessibilityLabel="Track order"
            style={[os.actionBtn, os.actionOutlineBrand]}
          >
            <Truck size={14} color={Palette.primary} />
            <Text style={os.actionOutlineBrandText}>Track Order</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onInvoice}
          disabled={invoiceBusy}
          accessibilityRole="button"
          accessibilityLabel="Download invoice"
          accessibilityState={{ disabled: invoiceBusy, busy: invoiceBusy }}
          style={[os.actionBtn, os.actionMuted, invoiceBusy && { opacity: 0.6 }]}
        >
          {invoiceBusy ? (
            <ActivityIndicator size="small" color="#334155" />
          ) : (
            <Download size={14} color="#334155" />
          )}
          <Text style={os.actionMutedText}>Invoice</Text>
        </Pressable>

        {canCancel ? (
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel order"
            style={[os.actionBtn, os.actionOutlineDanger]}
          >
            <XCircle size={14} color="#dc2626" />
            <Text style={os.actionOutlineDangerText}>Cancel</Text>
          </Pressable>
        ) : null}

        {/* A return already exists → its status replaces the button, so a second
            one cannot be raised for the same order. */}
        {existingReturn ? (
          (() => {
            const rst = returnStatusStyle(existingReturn.status);
            return (
              <Pressable
                onPress={() => router.push('/(any)/returns-replacements' as any)}
                accessibilityRole="button"
                accessibilityLabel={`Return ${existingReturn.status}. View return details`}
                style={[os.statePill, { backgroundColor: rst.bg }]}
              >
                <View style={[os.statusDot, { backgroundColor: rst.dot }]} />
                <Text style={[os.statePillText, { color: rst.text, marginLeft: 5 }]}>
                  Return · {existingReturn.status}
                </Text>
              </Pressable>
            );
          })()
        ) : canReturn ? (
          <Pressable
            onPress={onReturn}
            accessibilityRole="button"
            accessibilityLabel="Request a return"
            style={[os.actionBtn, os.actionOutlineNeutral]}
          >
            <RotateCcw size={14} color="#334155" />
            <Text style={os.actionOutlineNeutralText}>Return</Text>
          </Pressable>
        ) : showContactSupport ? (
          <Pressable
            onPress={() => router.push('/(any)/support' as any)}
            accessibilityRole="button"
            accessibilityLabel="Contact support about this order"
            style={[os.actionBtn, os.actionOutlineNeutral]}
          >
            <LifeBuoy size={14} color="#334155" />
            <Text style={os.actionOutlineNeutralText}>Contact Support</Text>
          </Pressable>
        ) : null}

        {returnPending ? (
          <View style={[os.statePill, { backgroundColor: '#fffbeb' }]}>
            <Text style={[os.statePillText, { color: '#b45309' }]}>Return Requested</Text>
          </View>
        ) : null}

        {showRefund ? (
          <View style={[os.statePill, { backgroundColor: '#f0fdf4' }]}>
            <Text style={[os.statePillText, { color: '#15803d' }]}>
              Refund{' '}
              {refund === 'PROCESSED'
                ? 'Completed'
                : refund === 'MANUAL'
                  ? 'Being Processed'
                  : 'Initiated'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Sidebar sections ─────────────────────────────────────────────────────────
/**
 * Top Selling, Best Seller and Quick Actions.
 *
 * I had skipped these as "web layout concerns" — the web puts them in a column
 * beside the orders and a phone has no column. But they are not layout: they
 * are three panels of content, and the web stacks them under the orders at its
 * own mobile width. They stack here too.
 *
 * Fails silently, as the web's does: a sidebar that cannot load should cost the
 * page a panel, not an error.
 */
function SidebarSections() {
  const [topSelling, setTopSelling] = useState<PublicProduct[]>([]);
  const [bestSellers, setBestSellers] = useState<PublicProduct[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [topRes, bestRes] = await Promise.all([
          publicProductService.getProducts({
            sortBy: 'rating',
            sortOrder: 'desc',
            limit: 4,
            inStock: true,
          }),
          publicProductService.getProductsByTag('Best Seller', 4),
        ]);
        if (!alive) return;
        if (topRes.success && topRes.data) setTopSelling(topRes.data.items);
        if (bestRes.success && bestRes.data) setBestSellers(bestRes.data.items);
      } catch {
        /* the sidebar failing silently is okay */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingBottom: 32 }}>
      <ProductPanel
        title="Top Selling Products"
        Icon={Star}
        iconColor="#eab308"
        items={topSelling}
        ctaLabel="View All Products"
        ctaColor="#e01a1b"
        ctaBorder="rgba(224,26,27,0.3)"
        onCta={() => router.push('/(any)/products' as any)}
        showDiscount={false}
      />

      <ProductPanel
        title="Best Seller"
        Icon={Package}
        iconColor="#16a34a"
        items={bestSellers}
        ctaLabel="View Best Sellers"
        ctaColor="#16a34a"
        ctaBorder="#bbf7d0"
        onCta={() => router.push({ pathname: '/(any)/products', params: { collection: 'best-seller' } })}
        emptyText="No Best Sellers found"
        showDiscount
      />

      <View style={os.panel}>
        <Text style={os.panelTitle}>Quick Actions</Text>
        <View style={{ gap: 8 }}>
          {[
            { Icon: Package, color: '#e01a1b', label: 'Browse Products', to: '/(any)/products' },
            { Icon: ShoppingCart, color: '#16a34a', label: 'View Cart', to: '/(tabs)/cart' },
            { Icon: Eye, color: '#e01a1b', label: 'Account Settings', to: '/(tabs)/profile' },
          ].map(({ Icon, color, label, to }) => (
            <Pressable
              key={label}
              onPress={() => router.push(to as any)}
              accessibilityRole="button"
              accessibilityLabel={label}
              android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
              style={os.quickRow}
            >
              <Icon size={18} color={color} />
              <Text style={os.quickLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function ProductPanel({
  title,
  Icon,
  iconColor,
  items,
  ctaLabel,
  ctaColor,
  ctaBorder,
  onCta,
  emptyText = 'Loading...',
  showDiscount,
}: {
  title: string;
  Icon: any;
  iconColor: string;
  items: PublicProduct[];
  ctaLabel: string;
  ctaColor: string;
  ctaBorder: string;
  onCta: () => void;
  emptyText?: string;
  showDiscount: boolean;
}) {
  return (
    <View style={os.panel}>
      <View style={os.panelHead}>
        <Icon size={18} color={iconColor} />
        <Text style={os.panelTitle}>{title}</Text>
      </View>

      <View style={{ gap: 10 }}>
        {items.map((p) => {
          const rating = Number(p.rating) || 0;
          const reviews = Number(p.reviews) || 0;
          const price = getRegionalPrice(p);
          const discount = Number((p as any).discount) || 0;
          const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url;

          return (
            <Pressable
              key={p.id}
              onPress={() => router.push({ pathname: '/(any)/products/[id]', params: { id: p.id } })}
              accessibilityRole="button"
              accessibilityLabel={p.name}
              android_ripple={{ color: 'rgba(15,23,42,0.05)' }}
              style={os.productRow}
            >
              <View style={os.productThumb}>
                {img ? (
                  <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Package size={20} color="#94a3b8" />
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={os.productName} numberOfLines={2}>
                  {p.name}
                </Text>

                <View style={os.productPriceRow}>
                  <Text style={os.productPrice}>{formatPrice(price)}</Text>
                  {showDiscount && discount > 0 ? (
                    <View style={os.offChip}>
                      <Text style={os.offChipText}>{discount}% OFF</Text>
                    </View>
                  ) : null}
                </View>

                {/* The web shows a rating badge once a product has reviews, and
                    a "New" badge until then — so the row is never a bare name. */}
                {reviews > 0 ? (
                  <LinearGradient
                    colors={['#F5A524', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={os.ratingChip}
                  >
                    <Text style={os.ratingScore}>{rating.toFixed(1)}</Text>
                    <Sparkles size={10} color="#ffffff" fill="#ffffff" strokeWidth={1.5} />
                    <Text style={os.ratingCount}>{reviews}</Text>
                  </LinearGradient>
                ) : (
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={os.newChip}
                  >
                    <Text style={os.newChipText}>New</Text>
                  </LinearGradient>
                )}
              </View>
            </Pressable>
          );
        })}

        {items.length === 0 ? <Text style={os.panelEmpty}>{emptyText}</Text> : null}
      </View>

      <Pressable
        onPress={onCta}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
        style={[os.panelCta, { borderColor: ctaBorder }]}
      >
        <Text style={[os.panelCtaText, { color: ctaColor }]}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const os = StyleSheet.create({
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  panelTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 16,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 0,
  },
  panelEmpty: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 14,
  },
  panelCta: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  panelCtaText: { fontFamily: Fonts.sansMedium, fontSize: 13.5, fontWeight: '500' },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
  },
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
    color: '#0f172a',
  },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  productPrice: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  offChip: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  offChipText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 10.5,
    fontWeight: '600',
    color: '#15803d',
  },

  ratingChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 5,
  },
  ratingScore: { fontFamily: Fonts.sansBold, fontSize: 10.5, fontWeight: '700', color: '#ffffff' },
  ratingCount: { fontFamily: Fonts.sans, fontSize: 10.5, color: 'rgba(255,255,255,0.85)' },
  newChip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 5,
  },
  newChipText: {
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#ffffff',
  },

  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  quickLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eceef1',
  },
  /* `font-playfair text-2xl font-semibold tracking-tight text-[#1a1a1a]` */
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  headerSub: { fontFamily: Fonts.sans, fontSize: 13, color: '#475569', marginTop: 1 },
  headerCount: {
    fontFamily: Fonts.sansBold,
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.4,
  },
  headerCountLabel: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#475569' },

  // ── Filter card ─────────────────────────────────────────────────────────
  filterCard: {
    margin: 16,
    marginBottom: 4,
    padding: 14,
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  /* `text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400` */
  fieldLabel: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#94a3b8',
    marginBottom: 6,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 42,
    paddingHorizontal: 11,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  dateText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Palette.ink,
  },
  datePlaceholder: { color: Palette.textSubtle },
  clearBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 16,
    height: 38,
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: Palette.surface,
  },
  clearBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#475569',
  },

  searchWrap: { paddingHorizontal: 16, paddingTop: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: Palette.ink,
    paddingVertical: 0,
    includeFontPadding: false,
  },

  filterChip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: Radius.full,
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  filterChipActive: { backgroundColor: Palette.primary, borderColor: Palette.primary },
  filterChipText: { fontFamily: Fonts.sansSemibold, fontSize: 12.5, fontWeight: '600', color: Palette.text },
  filterChipTextActive: { color: Palette.onPrimary },

  // ── Order card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eceef1',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    // Android paints elevation only.
    elevation: 2,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  orderNo: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  orderDate: { fontFamily: Fonts.sans, fontSize: 12, color: '#64748b', marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Fonts.sansBold, fontSize: 12, fontWeight: '700' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f8fa',
    borderRadius: 14,
    padding: 10,
  },
  itemThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eceef1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { fontFamily: Fonts.sansBold, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  itemMeta: { fontFamily: Fonts.sans, fontSize: 12, color: '#64748b', marginTop: 3 },

  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    marginTop: 4,
  },
  expandText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.primary,
  },

  /* `bg-[#e01a1b]/5 border border-[#e01a1b]/20 text-[#c41617]` */
  etaBox: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(224,26,27,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(224,26,27,0.2)',
  },
  etaText: { fontFamily: Fonts.sans, fontSize: 12.5, color: '#c41617' },

  totalRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  totalLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontFamily: Fonts.sansBold,
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
    letterSpacing: -0.3,
  },

  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
  },
  actionPrimary: { backgroundColor: Palette.primary, paddingRight: 10 },
  actionPrimaryText: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  actionOutlineBrand: { borderWidth: 1, borderColor: Palette.primary },
  actionOutlineBrandText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.primary,
  },
  /* `bg-slate-100 text-slate-700` */
  actionMuted: { backgroundColor: '#f1f5f9' },
  actionMutedText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  /* `border-red-300 text-red-600` */
  actionOutlineDanger: { borderWidth: 1, borderColor: '#fca5a5' },
  actionOutlineDangerText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#dc2626',
  },
  /* `border-slate-300 text-slate-700` */
  actionOutlineNeutral: { borderWidth: 1, borderColor: '#cbd5e1' },
  actionOutlineNeutralText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  statePill: {
    justifyContent: 'center',
    height: 38,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  statePillText: { fontFamily: Fonts.sansSemibold, fontSize: 12, fontWeight: '600' },

  // ── Invoice modal ───────────────────────────────────────────────────────
  invoiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.outline,
  },
  invoiceTitle: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    fontWeight: '600',
    color: Palette.ink,
  },

  // ── Track modal ─────────────────────────────────────────────────────────
  trackBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  trackSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
  },
  trackAccent: { height: 4, backgroundColor: Palette.primary },
  trackHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  trackIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224,26,27,0.1)',
  },
  trackTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  trackSub: { fontFamily: Fonts.sans, fontSize: 12.5, color: '#64748b', marginTop: 1 },
  trackBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  trackLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#64748b',
  },
  trackValue: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 4,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  copyText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  trackCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
  },
  trackCtaText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#ffffff',
  },
  trackNote: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
