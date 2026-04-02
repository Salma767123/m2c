import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ChevronRight,
  ShoppingBag,
  LogIn,
  Layers,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { orderService, Order } from '@/services/orderService';
import { userAuthService } from '@/services/userAuthService';
import { showErrorToast } from '@/lib/toast-utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_W = (SCREEN_WIDTH - 48) / 2;

// ── Status Config — strict black / white / grey ────────────────────────────────
const STATUS_CONFIG: Record<string, {
  icon: any;
  label: string;
}> = {
  delivered:     { icon: CheckCircle, label: 'Delivered' },
  shipped:       { icon: Truck,       label: 'Shipped' },
  processing:    { icon: Clock,       label: 'Processing' },
  confirmed:     { icon: Clock,       label: 'Confirmed' },
  order_created: { icon: Package,     label: 'Order Placed' },
  packed_by_vendor: { icon: Package,  label: 'Packed' },
  cancelled:     { icon: XCircle,     label: 'Cancelled' },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status.toLowerCase()] ?? { icon: AlertCircle, label: status };

// ── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({ order, index }: { order: Order; index: number }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const cfg  = getStatusConfig(order.status);
  const Icon = cfg.icon;

  const previewItems = order.items.slice(0, 2);
  const extra        = order.items.length - 2;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 380, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="mb-3">
      <TouchableOpacity
        onPress={() => router.push(`/(tabs)/orders/${order.id}` as any)}
        activeOpacity={0.78}
        className="bg-white rounded-2xl overflow-hidden"
        style={{
          borderWidth: 1,
          borderColor: '#e5e5e5',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        {/* Top accent strip — thin black */}
        <View style={{ height: 3, backgroundColor: '#111827' }} />

        <View className="p-4">

          {/* ── Row 1: Order ID | Status Badge ───────────────────────────── */}
          <View className="flex-row items-center justify-between mb-3">
            {/* Left: ORDER meta */}
            <View className="flex-1 mr-3">
              <Text className="text-[9px] text-gray-400 font-bold tracking-widest uppercase mb-0.5">
                ORDER
              </Text>
              <Text
                className="text-sm font-black text-gray-900 tracking-tight"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                #{order.orderId}
              </Text>
              <Text className="text-[11px] text-gray-400 mt-0.5">
                {orderService.formatDate(order.createdAt)}
              </Text>
            </View>

            {/* Right: Status pill — mono */}
            <View
              className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1.5"
              style={{ backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e5e5' }}
            >
              <View className="w-5 h-5 rounded-full bg-gray-800 items-center justify-center">
                <Icon size={10} color="#ffffff" />
              </View>
              <Text className="text-[11px] font-bold text-gray-700">
                {cfg.label}
              </Text>
            </View>
          </View>

          {/* ── Row 2: Item preview ───────────────────────────────────────── */}
          {previewItems.length > 0 && (
            <View
              className="flex-row items-center rounded-xl p-2.5 mb-3"
              style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6' }}
            >
              {/* Stacked thumbnails */}
              <View className="flex-row mr-2.5">
                {previewItems.map((item, i) => (
                  <View
                    key={item.id}
                    className="w-10 h-10 rounded-xl overflow-hidden items-center justify-center"
                    style={{
                      marginLeft: i === 0 ? 0 : -10,
                      backgroundColor: '#e5e7eb',
                      borderWidth: 2,
                      borderColor: '#ffffff',
                    }}
                  >
                    {item.productImage ? (
                      <Image source={{ uri: item.productImage }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <Package size={16} color="#9ca3af" />
                    )}
                  </View>
                ))}
                {extra > 0 && (
                  <View
                    className="w-10 h-10 rounded-xl bg-gray-800 items-center justify-center"
                    style={{ marginLeft: -10, borderWidth: 2, borderColor: '#ffffff' }}
                  >
                    <Text className="text-white text-[10px] font-extrabold">+{extra}</Text>
                  </View>
                )}
              </View>

              {/* Product name */}
              <View className="flex-1">
                <Text className="text-[13px] font-bold text-gray-800" numberOfLines={1}>
                  {previewItems[0].productName}
                </Text>
                {order.items.length > 1 && (
                  <Text className="text-[10px] text-gray-400 mt-0.5">
                    +{order.items.length - 1} more item{order.items.length - 1 > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* ── Row 3: Total + CTA (each 50%) ──────────────────────────── */}
          <View className="flex-row items-center">
            {/* Left 50%: Payment status + Total */}
            <View className="w-1/2 pr-2">
              {/* Payment badge — mono */}
              <View
                className="self-start px-2 py-0.5 rounded-md mb-1"
                style={{ backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e5e5' }}
              >
                <Text className="text-[9px] font-extrabold tracking-wider text-gray-500 uppercase">
                  {order.paymentStatus}
                </Text>
              </View>
              <Text className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
                Total
              </Text>
              <Text className="text-xl font-black text-gray-900 tracking-tight" numberOfLines={1}>
                ₹{order.totalAmount.toFixed(2)}
              </Text>
            </View>

            {/* Right 50%: View Details CTA */}
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/orders/${order.id}` as any)}
              className="w-1/2 flex-row items-center justify-center gap-2 bg-gray-900 rounded-xl py-3"
              activeOpacity={0.82}
            >
              <Text className="text-white text-[13px] font-bold">View Details</Text>
              <ChevronRight size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>

        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const [activeTab, setActiveTab]         = useState<'current' | 'history'>('current');
  const [orders, setOrders]               = useState<Order[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { checkAuthAndFetch(); }, []);

  useEffect(() => {
    Animated.spring(tabAnim, {
      toValue: activeTab === 'current' ? 0 : 1,
      useNativeDriver: true,
      tension: 72,
      friction: 10,
    }).start();
  }, [activeTab]);

  const checkAuthAndFetch = async () => {
    const auth = await userAuthService.isAuthenticated();
    setIsAuthenticated(auth);
    if (auth) fetchOrders(); else setLoading(false);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getUserOrders();
      if (res.success && res.data) setOrders(res.data);
    } catch { showErrorToast('Error', 'Failed to load orders'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchOrders(); }, []);

  const active  = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const history = orders.filter(o =>  ['DELIVERED', 'CANCELLED'].includes(o.status));
  const display = activeTab === 'current' ? active : history;

  // ── Header ───────────────────────────────────────────────────────────────────
  const Header = (
    <View
      className={`bg-black ${Platform.OS === 'ios' ? 'pt-14' : 'pt-6'} pb-5 px-5`}
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 6 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Title row */}
      <View className="flex-row items-center justify-between mb-5">
        <View>
          <Text className="text-[26px] font-black text-white tracking-tight">My Orders</Text>
          <Text className="text-[12px] text-gray-500 mt-0.5">Track and manage your purchases</Text>
        </View>
        <View
          className="w-11 h-11 rounded-2xl items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
        >
          <Layers size={18} color="#ffffff" />
        </View>
      </View>

      {/* Tab switcher */}
      <View
        className="flex-row rounded-2xl p-1 relative"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
      >
        {/* Animated pill — white */}
        <Animated.View
          className="absolute top-1 left-1 h-[40px] rounded-xl bg-white"
          style={{
            width: TAB_W,
            transform: [{ translateX: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, TAB_W] }) }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 4,
          }}
        />
        {[
          { key: 'current', label: 'Active',  count: active.length },
          { key: 'history', label: 'History', count: history.length },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            className="flex-1 h-[40px] items-center justify-center z-10 flex-row gap-1.5"
            activeOpacity={0.8}
          >
            <Text className={`text-sm font-extrabold ${activeTab === tab.key ? 'text-gray-900' : 'text-gray-500'}`}>
              {tab.label}
            </Text>
            <View
              className="min-w-[20px] h-[18px] rounded-full items-center justify-center px-1.5"
              style={{ backgroundColor: activeTab === tab.key ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)' }}
            >
              <Text className={`text-[10px] font-extrabold ${activeTab === tab.key ? 'text-gray-900' : 'text-gray-500'}`}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ── Not authed ───────────────────────────────────────────────────────────────
  if (!loading && !isAuthenticated) {
    return (
      <View className="flex-1 bg-gray-50">
        {Header}
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-6"
            style={{ borderWidth: 1, borderColor: '#e5e5e5' }}
          >
            <LogIn size={40} color="#9ca3af" />
          </View>
          <Text className="text-2xl font-black text-gray-900 text-center mb-2">Login Required</Text>
          <Text className="text-sm text-gray-400 text-center leading-5 mb-8">
            Sign in to view your orders and{'\n'}track deliveries in real-time
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/Login')}
            activeOpacity={0.85}
            className="bg-gray-900 rounded-2xl px-10 py-4"
          >
            <Text className="text-white font-extrabold text-base">Login Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        {Header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#111827" />
          <Text className="text-gray-400 mt-3 text-xs tracking-widest uppercase">Loading orders…</Text>
        </View>
      </View>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-50">
      {Header}

      {display.length === 0 ? (
        <View className="flex-1 items-center justify-center px-9">
          <View className="w-28 h-28 rounded-full bg-gray-100 items-center justify-center mb-7"
            style={{ borderWidth: 1, borderColor: '#e5e5e5' }}
          >
            <ShoppingBag size={48} color="#d1d5db" />
          </View>
          <Text className="text-[22px] font-black text-gray-900 mb-2 text-center">
            {activeTab === 'current' ? 'No Active Orders' : 'No Order History'}
          </Text>
          <Text className="text-sm text-gray-400 text-center leading-5 mb-9">
            {activeTab === 'current'
              ? "You don't have any active orders.\nStart shopping to place your first order!"
              : "Your completed and cancelled orders\nwill appear here."}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)' as any)}
            activeOpacity={0.85}
            className="bg-gray-900 rounded-2xl px-9 py-4 flex-row items-center gap-2"
          >
            <ShoppingBag size={16} color="#ffffff" />
            <Text className="text-white font-extrabold text-[15px]">Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" colors={['#111827']} />
          }
        >
          {/* ── Stat strip ───────────────────────────────────────────────── */}
          <View
            className="flex-row bg-white rounded-2xl p-4 mb-4"
            style={{ borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}
          >
            {[
              { label: 'Total Orders', value: orders.length },
              { label: 'Active',       value: active.length },
              { label: 'Completed',    value: history.filter(o => o.status === 'DELIVERED').length },
            ].map((stat, i) => (
              <View
                key={stat.label}
                className={`flex-1 items-center ${i < 2 ? 'border-r border-gray-100' : ''}`}
              >
                <Text className="text-[22px] font-black text-gray-900">{stat.value}</Text>
                <Text className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">{stat.label}</Text>
              </View>
            ))}
          </View>

          {display.map((order, i) => (
            <OrderCard key={order.id} order={order} index={i} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
