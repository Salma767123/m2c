import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  CreditCard,
  Phone,
  Mail,
  XCircle,
  ShieldCheck,
  Receipt,
  CalendarDays,
  RotateCcw,
  AlertCircle,
  Hash,
  Wallet,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { orderService, Order } from '@/services/orderService';
import { showErrorToast } from '@/lib/toast-utils';

// ── Status Config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { iconBg: string; textColor: string; bgColor: string; borderColor: string; icon: any; label: string }> = {
  delivered:     { iconBg: '#10b981', textColor: '#065f46', bgColor: '#ecfdf5', borderColor: '#a7f3d0', label: 'Delivered',   icon: CheckCircle },
  shipped:       { iconBg: '#3b82f6', textColor: '#1e40af', bgColor: '#eff6ff', borderColor: '#bfdbfe', label: 'Shipped',     icon: Truck },
  processing:    { iconBg: '#f59e0b', textColor: '#78350f', bgColor: '#fffbeb', borderColor: '#fde68a', label: 'Processing',  icon: Clock },
  confirmed:     { iconBg: '#f59e0b', textColor: '#78350f', bgColor: '#fffbeb', borderColor: '#fde68a', label: 'Confirmed',   icon: Clock },
  order_created: { iconBg: '#8b5cf6', textColor: '#5b21b6', bgColor: '#faf5ff', borderColor: '#ddd6fe', label: 'Order Placed',icon: Package },
  cancelled:     { iconBg: '#ef4444', textColor: '#991b1b', bgColor: '#fef2f2', borderColor: '#fecaca', label: 'Cancelled',   icon: XCircle },
};

const getConfig = (status: string) =>
  STATUS_CONFIG[status.toLowerCase()] || {
    iconBg: '#94a3b8', textColor: '#475569', bgColor: '#f8fafc', borderColor: '#e2e8f0',
    label: status, icon: AlertCircle,
  };

// ── Timeline ───────────────────────────────────────────────────────────────────
const ORDER_STEPS = [
  { key: 'ORDER_CREATED', label: 'Order Placed', sub: 'Order received',   icon: Package },
  { key: 'CONFIRMED',     label: 'Confirmed',    sub: 'Order confirmed',  icon: ShieldCheck },
  { key: 'PROCESSING',    label: 'Processing',   sub: 'Being prepared',   icon: Clock },
  { key: 'SHIPPED',       label: 'Shipped',      sub: 'On the way',       icon: Truck },
  { key: 'DELIVERED',     label: 'Delivered',    sub: 'Order delivered',  icon: CheckCircle },
];

const getActiveStep = (status: string) =>
  ORDER_STEPS.findIndex(s => s.key === status.toUpperCase());

// ── Section Card ───────────────────────────────────────────────────────────────
function SectionCard({
  title, icon: Icon, iconColor, iconBg, children, delay = 0,
}: {
  title: string; icon: any; iconColor: string; iconBg: string;
  children: React.ReactNode; delay?: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      className="bg-white rounded-[22px] mx-4 mb-3.5 overflow-hidden shadow-sm"
    >
      <View className="flex-row items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50">
        <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: iconBg }}>
          <Icon size={17} color={iconColor} />
        </View>
        <Text className="text-[15px] font-extrabold text-slate-900">{title}</Text>
      </View>
      <View className="p-4">{children}</View>
    </Animated.View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { if (id) fetchOrderDetails(); }, [id]);

  useEffect(() => {
    if (order) Animated.timing(heroAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [order]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrderById(id);
      if (res.success && res.data) setOrder(res.data);
    } catch { showErrorToast('Error', 'Failed to load order details'); }
    finally { setLoading(false); }
  };

  // ── Top Bar ─────────────────────────────────────────────────────────────────
  const TopBar = ({ title = 'Order Details', subtitle = '' }: { title?: string; subtitle?: string }) => (
    <View className={`bg-[#1a1a2e] ${Platform.OS === 'ios' ? 'pt-14' : 'pt-5'} pb-5 px-5 shadow-xl`}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View className="flex-row items-center gap-3.5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-2xl bg-white/12 border border-white/10 items-center justify-center"
          activeOpacity={0.75}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[18px] font-extrabold text-white tracking-tight">{title}</Text>
          {!!subtitle && <Text className="text-[12px] text-slate-500 mt-0.5">{subtitle}</Text>}
        </View>
      </View>
    </View>
  );

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-slate-50">
        <TopBar />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1a1a2e" />
          <Text className="text-slate-500 mt-3.5 text-sm font-semibold">Loading order details…</Text>
        </View>
      </View>
    );
  }

  // ── Not Found ───────────────────────────────────────────────────────────────
  if (!order) {
    return (
      <View className="flex-1 bg-slate-50">
        <TopBar />
        <View className="flex-1 items-center justify-center px-9">
          <View className="w-24 h-24 rounded-full bg-slate-100 items-center justify-center mb-6">
            <Package size={46} color="#cbd5e1" />
          </View>
          <Text className="text-[22px] font-black text-slate-900 mb-2.5 text-center">Order Not Found</Text>
          <Text className="text-sm text-slate-500 text-center leading-5 mb-8">
            The order you're looking for doesn't exist or may have been removed.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-[#1a1a2e] rounded-[18px] px-9 py-4"
            activeOpacity={0.85}
          >
            <Text className="text-white font-extrabold text-[15px]">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const cfg = getConfig(order.status);
  const Icon = cfg.icon;
  const isCancelled = order.status.toUpperCase() === 'CANCELLED';
  const activeStep = getActiveStep(order.status);

  return (
    <View className="flex-1 bg-slate-50">
      <TopBar title="Order Details" subtitle={`#${order.orderId}`} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero Status Banner ───────────────────────────────────────────── */}
        <Animated.View
          style={{ opacity: heroAnim }}
          className="mx-4 mt-4 mb-1.5 rounded-[22px] overflow-hidden shadow-lg"
        >
          <View className="bg-[#1a1a2e] p-5 flex-row items-center gap-4">
            {/* Status icon */}
            <View
              className="w-16 h-16 rounded-[20px] items-center justify-center"
              style={{ backgroundColor: cfg.iconBg, shadowColor: cfg.iconBg, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6 }}
            >
              <Icon size={30} color="#ffffff" />
            </View>

            <View className="flex-1">
              <Text className="text-[20px] font-black text-white mb-1 tracking-tight">{cfg.label}</Text>
              <Text className="text-[13px] text-slate-400 leading-[18px]">
                {isCancelled
                  ? 'This order has been cancelled'
                  : order.status === 'DELIVERED'
                  ? 'Your order has been delivered!'
                  : 'Your order is being processed'}
              </Text>
            </View>

            {/* Payment pill */}
            <View
              className="rounded-xl px-2.5 py-1.5"
              style={{
                backgroundColor:
                  order.paymentStatus === 'PAID'   ? '#10b981'
                  : order.paymentStatus === 'FAILED' ? '#ef4444' : '#f59e0b',
              }}
            >
              <Text className="text-[10px] text-white font-extrabold tracking-wider">
                {order.paymentStatus}
              </Text>
            </View>
          </View>

          {/* Footer strip */}
          <View
            className="flex-row px-5 py-3 justify-between items-center"
            style={{ backgroundColor: cfg.bgColor }}
          >
            <View className="flex-row items-center gap-1.5">
              <Hash size={13} color={cfg.textColor} />
              <Text className="text-[13px] font-extrabold" style={{ color: cfg.textColor }}>{order.orderId}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <CalendarDays size={13} color={cfg.textColor} />
              <Text className="text-[12px] font-semibold" style={{ color: cfg.textColor }}>
                {orderService.formatDate(order.createdAt)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Timeline ──────────────────────────────────────────────────────── */}
        {!isCancelled && (
          <SectionCard title="Order Progress" icon={Truck} iconColor="#3b82f6" iconBg="#eff6ff" delay={80}>
            <View className="px-1">
              {ORDER_STEPS.map((step, i) => {
                const done   = i <= activeStep;
                const active = i === activeStep;
                const isLast = i === ORDER_STEPS.length - 1;
                const SI = step.icon;
                return (
                  <View key={step.key} className="flex-row items-start">
                    <View className="items-center w-11">
                      <View
                        className="items-center justify-center rounded-xl"
                        style={{
                          width: active ? 38 : 32, height: active ? 38 : 32, borderRadius: active ? 13 : 11,
                          backgroundColor: done ? cfg.iconBg : '#e2e8f0',
                          shadowColor: active ? cfg.iconBg : 'transparent',
                          shadowOffset: { width: 0, height: 3 }, shadowOpacity: active ? 0.45 : 0, shadowRadius: 8, elevation: active ? 5 : 0,
                        }}
                      >
                        <SI size={active ? 18 : 15} color={done ? '#ffffff' : '#94a3b8'} />
                      </View>
                      {!isLast && (
                        <View
                          className="w-0.5 my-1 rounded-sm"
                          style={{ height: 28, backgroundColor: done && i < activeStep ? cfg.iconBg : '#e2e8f0' }}
                        />
                      )}
                    </View>
                    <View className={`flex-1 pl-3 ${active ? 'pt-2' : 'pt-1.5'} ${isLast ? '' : 'pb-1'}`}>
                      <Text className={`${active ? 'text-[15px] font-extrabold' : 'text-[13px] font-semibold'} ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                        {step.label}
                      </Text>
                      {active && (
                        <Text className="text-[11px] font-semibold mt-0.5" style={{ color: cfg.textColor }}>
                          {step.sub}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </SectionCard>
        )}

        {/* ── Order Items ────────────────────────────────────────────────────── */}
        <SectionCard title={`Items (${order.items.length})`} icon={Package} iconColor="#8b5cf6" iconBg="#faf5ff" delay={160}>
          {order.items.map((item, i) => (
            <View
              key={item.id}
              className={`flex-row gap-3.5 py-3.5 ${i < order.items.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <View className="w-[76px] h-[76px] rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden items-center justify-center">
                {item.productImage ? (
                  <Image source={{ uri: item.productImage }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <Package size={28} color="#cbd5e1" />
                )}
              </View>

              <View className="flex-1">
                <Text className="text-sm font-extrabold text-slate-900 mb-1 leading-[19px]" numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text className="text-[11px] text-slate-400 font-semibold mb-2">
                  SKU: {item.sku}  ·  {item.vendorName}
                </Text>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row gap-1.5">
                    <View className="bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Text className="text-[12px] text-slate-600 font-bold">Qty: {item.quantity}</Text>
                    </View>
                    <View className="bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Text className="text-[12px] text-slate-600 font-bold">₹{item.unitPrice.toFixed(2)} ea.</Text>
                    </View>
                  </View>
                  <Text className="text-[15px] font-black text-slate-900">₹{item.totalPrice.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          ))}
        </SectionCard>

        {/* ── Shipping Address ──────────────────────────────────────────────── */}
        <SectionCard title="Shipping Address" icon={MapPin} iconColor="#3b82f6" iconBg="#eff6ff" delay={240}>
          <View className="flex-row gap-3.5 mb-4">
            <View className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center">
              <MapPin size={20} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-slate-900 mb-1">{order.shippingAddress.fullName}</Text>
              <Text className="text-sm text-slate-500 leading-5">
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
              </Text>
              <Text className="text-sm text-slate-500 mt-0.5">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
              </Text>
              <Text className="text-sm text-slate-500">{order.shippingAddress.country}</Text>
            </View>
          </View>

          <View className="bg-slate-50 rounded-2xl p-3.5 gap-3 border border-slate-100">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center">
                <Phone size={14} color="#3b82f6" />
              </View>
              <Text className="text-sm text-slate-700 font-semibold">{order.shippingAddress.phone}</Text>
            </View>
            <View className="h-px bg-slate-100" />
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center">
                <Mail size={14} color="#3b82f6" />
              </View>
              <Text className="text-sm text-slate-700 font-semibold">{order.customerEmail}</Text>
            </View>
          </View>
        </SectionCard>

        {/* ── Payment Info ───────────────────────────────────────────────────── */}
        <SectionCard title="Payment Details" icon={CreditCard} iconColor="#10b981" iconBg="#ecfdf5" delay={320}>
          <View className="gap-3">
            <View className="flex-row justify-between items-center py-2.5 border-b border-slate-50">
              <Text className="text-[13px] text-slate-500 font-semibold">Method</Text>
              <Text className="text-[13px] font-bold text-slate-800">{order.paymentMethod}</Text>
            </View>

            <View className="flex-row justify-between items-center py-2.5 border-b border-slate-50">
              <Text className="text-[13px] text-slate-500 font-semibold">Payment Status</Text>
              <View
                className="px-3 py-1.5 rounded-xl border"
                style={{
                  backgroundColor: order.paymentStatus === 'PAID' ? '#ecfdf5' : order.paymentStatus === 'FAILED' ? '#fef2f2' : '#fffbeb',
                  borderColor:     order.paymentStatus === 'PAID' ? '#a7f3d0' : order.paymentStatus === 'FAILED' ? '#fecaca'  : '#fde68a',
                }}
              >
                <Text
                  className="text-[12px] font-extrabold"
                  style={{ color: order.paymentStatus === 'PAID' ? '#059669' : order.paymentStatus === 'FAILED' ? '#dc2626' : '#d97706' }}
                >
                  {order.paymentStatus}
                </Text>
              </View>
            </View>

            {order.paymentId && (
              <View className="pt-1">
                <Text className="text-[11px] text-slate-400 font-semibold mb-1">Transaction ID</Text>
                <Text className="text-xs text-slate-600 font-bold" numberOfLines={1}>{order.paymentId}</Text>
              </View>
            )}
          </View>
        </SectionCard>

        {/* ── Order Summary ─────────────────────────────────────────────────── */}
        <SectionCard title="Order Summary" icon={Receipt} iconColor="#f59e0b" iconBg="#fffbeb" delay={400}>
          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500 font-semibold">Subtotal</Text>
              <Text className="text-sm font-bold text-slate-800">₹{order.subtotal.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500 font-semibold">Shipping</Text>
              <Text className={`text-sm font-bold ${order.shippingCost === 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                {order.shippingCost === 0 ? 'FREE' : `₹${order.shippingCost.toFixed(2)}`}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500 font-semibold">Tax</Text>
              <Text className="text-sm font-bold text-slate-800">₹{order.tax.toFixed(2)}</Text>
            </View>
            {order.discount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-emerald-600 font-bold">Discount</Text>
                <Text className="text-sm font-extrabold text-emerald-600">-₹{order.discount.toFixed(2)}</Text>
              </View>
            )}

            {/* Grand total panel */}
            <View className="flex-row justify-between items-center border-t-2 border-slate-100 pt-4 mt-1.5 bg-slate-50 rounded-2xl p-4 -mx-0.5">
              <View>
                <Text className="text-[12px] text-slate-400 font-semibold mb-1">GRAND TOTAL</Text>
                <Text className="text-[28px] font-black text-slate-900 tracking-tight">
                  ₹{order.totalAmount.toFixed(2)}
                </Text>
              </View>
              <View className="bg-[#1a1a2e] rounded-2xl px-3.5 py-2.5">
                <Text className="text-[11px] text-slate-400 font-semibold text-center">incl.</Text>
                <Text className="text-[11px] text-amber-400 font-extrabold text-center">all taxes</Text>
              </View>
            </View>
          </View>
        </SectionCard>

        {/* ── Action Buttons ─────────────────────────────────────────────────── */}
        <View className="flex-row gap-3 mx-4 mb-4">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)' as any)}
            className="flex-1 flex-row items-center justify-center gap-2 py-4 rounded-[18px] bg-white border-2 border-slate-200"
            activeOpacity={0.8}
          >
            <RotateCcw size={16} color="#1a1a2e" />
            <Text className="text-sm font-extrabold text-[#1a1a2e]">Shop Again</Text>
          </TouchableOpacity>

          {['SHIPPED', 'PROCESSING', 'CONFIRMED'].includes(order.status.toUpperCase()) && (
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-2 py-4 rounded-[18px] bg-[#1a1a2e] shadow-lg"
              activeOpacity={0.85}
            >
              <Truck size={16} color="#f59e0b" />
              <Text className="text-sm font-extrabold text-white">Track Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
