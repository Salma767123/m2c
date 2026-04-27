import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
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
  AlertCircle,
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
type StatusInfo = { icon: any; label: string; bg: string; fg: string };

const STATUS_MAP: Record<string, StatusInfo> = {
  delivered:        { icon: CheckCircle, label: 'Delivered',    bg: '#f0fdf4', fg: '#16a34a' },
  shipped:          { icon: Truck,       label: 'Shipped',      bg: '#eff6ff', fg: '#2563eb' },
  processing:       { icon: Clock,       label: 'Processing',   bg: '#fffbeb', fg: '#d97706' },
  confirmed:        { icon: Clock,       label: 'Confirmed',    bg: '#fffbeb', fg: '#d97706' },
  order_created:    { icon: Package,     label: 'Order Placed', bg: '#f3f4f6', fg: '#374151' },
  packed_by_vendor: { icon: Package,     label: 'Packed',       bg: '#eff6ff', fg: '#2563eb' },
  cancelled:        { icon: XCircle,     label: 'Cancelled',    bg: '#fef2f2', fg: '#dc2626' },
};

const getStatus = (s: string): StatusInfo =>
  STATUS_MAP[s.toLowerCase()] ?? { icon: AlertCircle, label: s, bg: '#f3f4f6', fg: '#374151' };

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

  const active = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const history = orders.filter((o) => ['DELIVERED', 'CANCELLED'].includes(o.status));
  const display = tab === 'active' ? active : history;

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScreenHeader activeCount={0} historyCount={0} />
        <OrdersSkeleton />
      </View>
    );
  }

  // ── Auth required ───────────────────────────────────────────────────────
  if (!isAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScreenHeader activeCount={0} historyCount={0} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Package size={40} color="#d1d5db" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6 }}>Login Required</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
            Sign in to view and track your orders.
          </Text>
          <Pressable onPress={() => router.push('/(auth)/Login')} accessibilityRole="button">
            <View style={{ backgroundColor: '#111827', paddingHorizontal: 28, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Login to Continue</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScreenHeader activeCount={active.length} historyCount={history.length} />

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f8fafc', gap: 8 }}>
        <TabButton label="Active" count={active.length} active={tab === 'active'} onPress={() => setTab('active')} />
        <TabButton label="History" count={history.length} active={tab === 'history'} onPress={() => setTab('history')} />
      </View>

      {display.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <ShoppingCart size={40} color="#d1d5db" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
            {tab === 'active' ? 'No Active Orders' : 'No Order History'}
          </Text>
          <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>
            {tab === 'active'
              ? "Your active orders will appear here."
              : "Completed and cancelled orders appear here."}
          </Text>
          <Pressable onPress={() => router.push('/(tabs)' as any)} accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', paddingHorizontal: 24, height: 48, borderRadius: 12, gap: 8 }}>
              <ShoppingCart size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Start Shopping</Text>
            </View>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
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
function ScreenHeader({ activeCount, historyCount }: { activeCount: number; historyCount: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: insets.top + 12,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>My Orders</Text>
      <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
        {activeCount + historyCount > 0
          ? `${activeCount + historyCount} total · ${activeCount} active`
          : 'Track and manage your purchases'}
      </Text>
    </View>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabButton({
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
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 40,
          borderRadius: 10,
          backgroundColor: active ? '#111827' : '#ffffff',
          borderWidth: active ? 0 : 1,
          borderColor: '#e5e7eb',
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : '#6b7280' }}>
          {label}
        </Text>
        <View
          style={{
            minWidth: 20,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 5,
            backgroundColor: active ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '800', color: active ? '#fff' : '#6b7280' }}>
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
  const preview = order.items.slice(0, 3);
  const extra = order.items.length - 3;

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/orders/${order.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderId}, ${status.label}`}
      android_ripple={{ color: 'rgba(15,23,42,0.05)' }}
    >
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#e5e7eb',
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View style={{ padding: 16 }}>
          {/* Row 1: Order ID + Status */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>
                #{order.orderId}
              </Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                {orderService.formatDate(order.createdAt)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: status.bg,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
              }}
            >
              <Icon size={12} color={status.fg} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: status.fg }}>
                {status.label}
              </Text>
            </View>
          </View>

          {/* Row 2: Item thumbnails + name */}
          {preview.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f9fafb',
                borderRadius: 12,
                padding: 10,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', marginRight: 10 }}>
                {preview.map((item: any, i: number) => (
                  <View
                    key={item.id}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: '#e5e7eb',
                      borderWidth: 2,
                      borderColor: '#fff',
                      marginLeft: i === 0 ? 0 : -10,
                    }}
                  >
                    {item.productImage ? (
                      <Image source={{ uri: item.productImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={14} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                ))}
                {extra > 0 ? (
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: '#111827',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: -10,
                      borderWidth: 2,
                      borderColor: '#fff',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>+{extra}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                  {preview[0].productName}
                </Text>
                {order.items.length > 1 ? (
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                    +{order.items.length - 1} more
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Row 3: Total + View Details */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600' }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>
                {fmt(order.totalAmount)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#111827',
                paddingHorizontal: 16,
                height: 38,
                borderRadius: 10,
                gap: 4,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>View Details</Text>
              <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
