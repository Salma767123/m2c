import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  CheckCircle,
  Package,
  Truck,
  CreditCard,
  MapPin,
  Mail,
  ArrowRight,
  AlertCircle,
  Clock,
  ShoppingCart,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { orderService, Order } from '@/services/orderService';
import { popRecentOrder } from '@/lib/recentOrder';
import { useCart } from '@/context/CartContext';

const fmt = (n: number) => `$${n.toFixed(2)}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const estimateDelivery = (iso: string) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function OrderConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refreshCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadOrder();
    refreshCart(); // Clear cart badge after successful order
  }, [id]);

  const loadOrder = async () => {
    // The checkout screen stashes the just-created order in AsyncStorage so we
    // can render immediately instead of refetching. Only the original screen
    // that placed the order sees this; navigating back here later falls
    // through to the network fetch (right behavior — fresh data).
    const cached = await popRecentOrder(id);
    if (cached) {
      setOrder(cached);
      setLoading(false);
      return;
    }
    try {
      const res = await orderService.getOrderById(id);
      if (res.success && res.data) setOrder(res.data);
    } catch { /* handled by null state */ }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: insets.top + 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <AlertCircle size={32} color="#dc2626" />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Order Not Found</Text>
        <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>
          {"We couldn't find your order details."}
        </Text>
        <Pressable onPress={() => router.push('/(tabs)')} accessibilityRole="button">
          <View style={{ backgroundColor: '#111827', paddingHorizontal: 24, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Go Home</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  const isConfirmed = !['FAILED', 'CANCELLED'].includes(order.status);
  const addr = order.shippingAddress;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success hero */}
        <View style={{ alignItems: 'center', paddingTop: insets.top + 40, paddingBottom: 24, paddingHorizontal: 32 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isConfirmed ? '#f0fdf4' : '#fef2f2',
              borderWidth: 2,
              borderColor: isConfirmed ? '#bbf7d0' : '#fecaca',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            {isConfirmed ? (
              <CheckCircle size={40} color="#16a34a" />
            ) : (
              <Clock size={40} color="#dc2626" />
            )}
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
            {isConfirmed ? 'Order Confirmed!' : 'Order Processing'}
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 }}>
            {isConfirmed
              ? `Thank you! Your order #${order.orderId} has been placed successfully.`
              : 'Your order is being processed.'}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 14 }}>
          {/* Order info grid */}
          <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
            <View style={{ backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Order Information</Text>
            </View>
            <View style={{ padding: 16, gap: 14 }}>
              <InfoRow icon={<Package size={16} color="#6b7280" />} label="Order Number" value={order.orderId} mono />
              <InfoRow icon={<Clock size={16} color="#6b7280" />} label="Order Date" value={formatDate(order.createdAt)} />
              <InfoRow icon={<Truck size={16} color="#6b7280" />} label="Estimated Delivery" value={estimateDelivery(order.createdAt)} />
              <InfoRow icon={<CreditCard size={16} color="#6b7280" />} label="Payment" value={`${order.paymentMethod} · ${order.paymentStatus}`} />
            </View>
          </View>

          {/* Items */}
          <Section title="Items">
            {order.items.map((item: any, i: number) => (
              <View key={item.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#f3f4f6' }}>
                <View style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                  {item.productImage ? (
                    <Image source={{ uri: item.productImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={16} color="#d1d5db" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={1}>{item.productName}</Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>Qty: {item.quantity}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', alignSelf: 'center' }}>{fmt(item.totalPrice)}</Text>
              </View>
            ))}
          </Section>

          {/* Price summary */}
          <Section title="Price Summary">
            <SumRow label="Subtotal" value={fmt(order.subtotal)} />
            {order.tax > 0 ? <SumRow label="Tax" value={fmt(order.tax)} /> : null}
            <SumRow label="Shipping" value={order.shippingCost === 0 ? 'Free' : fmt(order.shippingCost)} color={order.shippingCost === 0 ? '#16a34a' : undefined} />
            {order.discount > 0 ? <SumRow label="Discount" value={`-${fmt(order.discount)}`} color="#16a34a" /> : null}
            <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 6 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{fmt(order.totalAmount)}</Text>
            </View>
          </Section>

          {/* Shipping address */}
          <Section title="Shipping Address">
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{addr.fullName}</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 18 }}>
              {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
            </Text>
            <Text style={{ fontSize: 13, color: '#6b7280' }}>
              {addr.city}, {addr.state} {addr.zipCode}
            </Text>
            {addr.country ? <Text style={{ fontSize: 13, color: '#6b7280' }}>{addr.country}</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <MapPin size={12} color="#6b7280" />
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{addr.phone}</Text>
            </View>
          </Section>

          {/* Email notification */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#fff',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              padding: 14,
            }}
          >
            <Mail size={18} color="#6b7280" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>Email Updates</Text>
              <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                {"We'll send updates to "}{order.customerEmail}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={{ gap: 10, marginTop: 4 }}>
            <Pressable
              onPress={() => router.push(`/(tabs)/orders/${order.id}` as any)}
              accessibilityRole="button"
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#111827',
                  height: 52,
                  borderRadius: 14,
                  gap: 8,
                }}
              >
                <Package size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>View Order Details</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)')}
              accessibilityRole="button"
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  backgroundColor: '#fff',
                  height: 52,
                  borderRadius: 14,
                  gap: 8,
                }}
              >
                <ShoppingCart size={18} color="#111827" />
                <Text style={{ color: '#111827', fontSize: 15, fontWeight: '700' }}>Continue Shopping</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{title}</Text>
      </View>
      <View style={{ padding: 16 }}>{children}</View>
    </View>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: mono ? '800' : '600', color: '#111827', marginTop: 1, fontFamily: mono ? 'monospace' : undefined }}>{value}</Text>
      </View>
    </View>
  );
}

function SumRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <Text style={{ fontSize: 13, color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: color || '#111827' }}>{value}</Text>
    </View>
  );
}
