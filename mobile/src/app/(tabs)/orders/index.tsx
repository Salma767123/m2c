import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StatusBar,
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
} from 'lucide-react-native';
import { router } from 'expo-router';
import { orderService, Order } from '@/services/orderService';
import { userAuthService } from '@/services/userAuthService';
import { showErrorToast } from '@/lib/toast-utils';
import { OrdersSkeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const fmt = (n: number) => `$${n.toFixed(2)}`;

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const [tab, setTab] = useState<'active' | 'history'>('active');
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

  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(normalizeStatus(o.status)));
  const history = orders.filter((o) => ['delivered', 'cancelled'].includes(normalizeStatus(o.status)));
  const display = tab === 'active' ? active : history;

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

      {/* Segmented tab control */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
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
      accessibilityLabel={`Order ${order.orderId}, ${status.label}, total ${fmt(order.totalAmount)}`}
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
              {fmt(order.totalAmount)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#111827',
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
            backgroundColor: '#111827',
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
