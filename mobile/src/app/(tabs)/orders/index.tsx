import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StatusBar,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  ShoppingCart,
  Search,
  X,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { orderService, Order } from '@/services/orderService';
import { userAuthService } from '@/services/userAuthService';
import { showErrorToast } from '@/lib/toast-utils';
import { OrdersSkeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Radius } from '@/constants/theme';
import { formatPrice } from '@/lib/currency';

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
  { value: 'all', label: 'All' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]['value'];

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
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
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesSearch =
        !q ||
        o.orderId?.toLowerCase().includes(q) ||
        (o.items ?? []).some((it: any) => it?.name?.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (statusFilter === 'all') return true;
      return normalizeStatus(o.status).includes(statusFilter);
    });
  }, [orders, search, statusFilter]);

  const active = filtered.filter((o) => !['delivered', 'cancelled'].includes(normalizeStatus(o.status)));
  const history = filtered.filter((o) => ['delivered', 'cancelled'].includes(normalizeStatus(o.status)));
  const display = tab === 'active' ? active : history;
  const isFiltering = search.trim().length > 0 || statusFilter !== 'all';

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f4f5f7' }}>
        <ScreenHeader total={0} />
        <OrdersSkeleton />
      </View>
    );
  }

  // ── Auth required ───────────────────────────────────────────────────────
  if (!isAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f4f5f7' }}>
        <ScreenHeader total={0} />
        <EmptyState
          icon={<Package size={40} color="#cbd5e1" />}
          title="Login Required"
          subtitle="Sign in to view and track your orders."
          ctaLabel="Login to Continue"
          onPress={() => router.push('/(auth)/Login')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f5f7' }}>
      <ScreenHeader total={orders.length} />

      {/* Search — matches order number or any item name, same as the web list. */}
      <View style={os.searchWrap}>
        <View style={os.searchBar}>
          <Search size={16} color={Palette.textSubtle} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by order ID or product"
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

      {/* Status filter — the web uses a dropdown; chips suit a touch target
          better and keep the current selection visible without a tap. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={os.filterTrack}
        style={{ flexGrow: 0 }}
      >
        {STATUS_FILTERS.map((f) => {
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
          <SegTab label="Active" count={active.length} active={tab === 'active'} onPress={() => setTab('active')} />
          <SegTab label="History" count={history.length} active={tab === 'history'} onPress={() => setTab('history')} />
        </View>
      </View>

      {display.length === 0 ? (
        /* "Nothing matched your filters" is a different problem from "you have no
           orders" — offering Start Shopping to someone mid-search is unhelpful, so
           the filtered case offers a way back out of the filters instead. */
        isFiltering ? (
          <EmptyState
            icon={<Search size={40} color="#cbd5e1" />}
            title="No Matching Orders"
            subtitle={
              search.trim()
                ? `No orders match “${search.trim()}”. Try a different order ID or product name.`
                : 'No orders match the selected status.'
            }
            ctaLabel="Clear Filters"
            onPress={() => {
              setSearch('');
              setStatusFilter('all');
            }}
          />
        ) : (
          <EmptyState
            icon={<ShoppingCart size={40} color="#cbd5e1" />}
            title={tab === 'active' ? 'No Active Orders' : 'No Order History'}
            subtitle={
              tab === 'active'
                ? 'Your active orders will appear here once you place one.'
                : 'Completed and cancelled orders will appear here.'
            }
            ctaLabel="Start Shopping"
            ctaIcon={<ShoppingCart size={16} color="#fff" />}
            onPress={() => router.push('/(tabs)' as any)}
          />
        )
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />}
        >
          {display.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function ScreenHeader({ total }: { total: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: insets.top + 14,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eceef1',
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Text style={{ fontSize: 26, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 }}>
        My Orders
      </Text>
      <Text style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
        {total > 0 ? `${total} ${total === 1 ? 'order' : 'orders'} in total` : 'Track and manage your purchases'}
      </Text>
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
        <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#0f172a' : '#64748b' }}>
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
          <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#fff' : '#475569' }}>
            {count}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: Order }) {
  const status = getStatus(order.status);
  const Icon = status.icon;
  const firstItem: any = order.items[0];
  const extraCount = order.items.length - 1;

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/orders/${order.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderId}, ${status.label}, total ${money(order.totalAmount, order.currency)}`}
      android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 18,
          borderWidth: 1,
          borderColor: '#eceef1',
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
          overflow: 'hidden',
        }}
      >
        {/* ── Header: order id + date / status ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 12,
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', letterSpacing: -0.2 }}>
              #{order.orderId}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {orderService.formatDate(order.createdAt)}
            </Text>
          </View>
          {/* Status pill with dot */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: status.bg,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: status.dot }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: status.fg }}>{status.label}</Text>
          </View>
        </View>

        {/* ── Item preview ── */}
        {firstItem ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 16,
              backgroundColor: '#f7f8fa',
              borderRadius: 14,
              padding: 10,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#eceef1',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {firstItem.productImage ? (
                <Image
                  source={{ uri: firstItem.productImage }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              ) : (
                <Package size={22} color="#94a3b8" />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                {firstItem.productName}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                Qty: {firstItem.quantity}
                {extraCount > 0 ? `  ·  +${extraCount} more ${extraCount === 1 ? 'item' : 'items'}` : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Footer: total + view details ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 14,
            marginTop: 12,
            borderTopWidth: 1,
            borderTopColor: '#f1f3f5',
          }}
        >
          <View>
            <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total
            </Text>
            <Text style={{ fontSize: 19, fontWeight: '800', color: '#0f172a', marginTop: 1, letterSpacing: -0.3 }}>
              {money(order.totalAmount, order.currency)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Palette.primary,
              paddingLeft: 16,
              paddingRight: 12,
              height: 40,
              borderRadius: 11,
              gap: 3,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>View Details</Text>
            <ChevronRight size={16} color="#fff" strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Empty / Auth State ─────────────────────────────────────────────────────────
function EmptyState({
  icon,
  title,
  subtitle,
  ctaLabel,
  ctaIcon,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaIcon?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 28,
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: '#eceef1',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        {icon}
      </View>
      <Text style={{ fontSize: 19, fontWeight: '800', color: '#0f172a', marginBottom: 6, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 21, marginBottom: 24 }}>
        {subtitle}
      </Text>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={ctaLabel}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Palette.primary,
            paddingHorizontal: 28,
            height: 52,
            borderRadius: 14,
            gap: 8,
          }}
        >
          {ctaIcon}
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{ctaLabel}</Text>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Filter bar styles ────────────────────────────────────────────────────────
const os = StyleSheet.create({
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
    fontSize: 13.5,
    color: Palette.ink,
    paddingVertical: 0,
    includeFontPadding: false,
  },

  filterTrack: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
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
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: Palette.text },
  filterChipTextActive: { color: Palette.onPrimary },
});
