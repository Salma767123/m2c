import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
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
  AlertCircle,
  FileText,
  X,
  Star,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '@/lib/axios';
import { orderService, Order } from '@/services/orderService';
import { showErrorToast, showSuccessToast } from '@/lib/toast-utils';
import ReviewModal from '@/components/WebSite/Review/ReviewModal';
import { reviewService } from '@/services/reviewService';

// ─── Status helpers ───────────────────────────────────────────────────────────
type StatusInfo = { icon: any; label: string; bg: string; fg: string; iconBg: string };

const STATUS: Record<string, StatusInfo> = {
  delivered:        { icon: CheckCircle, label: 'Delivered',    bg: '#f0fdf4', fg: '#16a34a', iconBg: '#16a34a' },
  shipped:          { icon: Truck,       label: 'Shipped',      bg: '#eff6ff', fg: '#2563eb', iconBg: '#2563eb' },
  processing:       { icon: Clock,       label: 'Processing',   bg: '#fffbeb', fg: '#d97706', iconBg: '#f59e0b' },
  confirmed:        { icon: Clock,       label: 'Confirmed',    bg: '#fffbeb', fg: '#d97706', iconBg: '#f59e0b' },
  order_created:    { icon: Package,     label: 'Order Placed', bg: '#f3f4f6', fg: '#374151', iconBg: '#6b7280' },
  packed_by_vendor: { icon: Package,     label: 'Packed',       bg: '#eff6ff', fg: '#2563eb', iconBg: '#2563eb' },
  cancelled:        { icon: XCircle,     label: 'Cancelled',    bg: '#fef2f2', fg: '#dc2626', iconBg: '#dc2626' },
};

const getStatus = (s: string): StatusInfo =>
  STATUS[s.toLowerCase()] ?? { icon: AlertCircle, label: s, bg: '#f3f4f6', fg: '#374151', iconBg: '#6b7280' };

const STEPS = [
  { key: 'ORDER_CREATED', label: 'Placed',     icon: Package },
  { key: 'CONFIRMED',     label: 'Confirmed',  icon: ShieldCheck },
  { key: 'PROCESSING',    label: 'Processing', icon: Clock },
  { key: 'SHIPPED',       label: 'Shipped',    icon: Truck },
  { key: 'DELIVERED',     label: 'Delivered',  icon: CheckCircle },
];

const getStepIndex = (s: string) => STEPS.findIndex((st) => st.key === s.toUpperCase());

const fmt = (n: number) => `$${n.toFixed(2)}`;

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrderById(id);
      if (res.success && res.data) {
        setOrder(res.data);
        // Check if user already reviewed any product in this order
        if (res.data.status === 'DELIVERED' && res.data.items?.length > 0) {
          const check = await reviewService.checkReviewStatus(
            res.data.items[0].productId,
            res.data.id,
          );
          if (check.hasReviewed) setHasReviewed(true);
        }
      }
    } catch {
      showErrorToast('Error', 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order?.id) return;
    setLoadingInvoice(true);
    try {
      const res = await axios.get(`/orders/${order.id}/invoice`, {
        responseType: 'text',
      });
      // The backend returns raw HTML
      const html = typeof res.data === 'string' ? res.data : String(res.data);
      setInvoiceHtml(html);
    } catch (err: any) {
      showErrorToast('Failed', 'Could not generate invoice. Please try again.');
    } finally {
      setLoadingInvoice(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <Header title="Order Details" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={{ color: '#6b7280', marginTop: 12, fontSize: 13 }}>Loading order…</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <Header title="Order Details" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Package size={32} color="#d1d5db" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
            Order Not Found
          </Text>
          <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>
            {"The order you're looking for doesn't exist."}
          </Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <View style={{ backgroundColor: '#111827', paddingHorizontal: 24, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Go Back</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  const s = getStatus(order.status);
  const SIcon = s.icon;
  const isCancelled = order.status.toUpperCase() === 'CANCELLED';
  const activeStep = getStepIndex(order.status);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title="Order Details" subtitle={`#${order.orderId}`} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: s.iconBg, alignItems: 'center', justifyContent: 'center' }}>
              <SIcon size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{s.label}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {orderService.formatDate(order.createdAt)}
              </Text>
            </View>
            <View style={{ backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: s.fg }}>{order.paymentStatus}</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        {!isCancelled ? (
          <Section title="Order Progress">
            {STEPS.map((step, i) => {
              const done = i <= activeStep;
              const current = i === activeStep;
              const last = i === STEPS.length - 1;
              const SI = step.icon;
              return (
                <View key={step.key} style={{ flexDirection: 'row' }}>
                  <View style={{ alignItems: 'center', width: 36 }}>
                    <View
                      style={{
                        width: current ? 32 : 28,
                        height: current ? 32 : 28,
                        borderRadius: current ? 10 : 8,
                        backgroundColor: done ? s.iconBg : '#e5e7eb',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SI size={current ? 16 : 13} color={done ? '#fff' : '#9ca3af'} />
                    </View>
                    {!last ? (
                      <View style={{ width: 2, height: 20, borderRadius: 1, marginVertical: 2, backgroundColor: done && i < activeStep ? s.iconBg : '#e5e7eb' }} />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, paddingLeft: 10, paddingTop: current ? 4 : 2, paddingBottom: last ? 0 : 2 }}>
                    <Text style={{ fontSize: current ? 14 : 12, fontWeight: done ? '700' : '500', color: done ? '#111827' : '#9ca3af' }}>
                      {step.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Section>
        ) : null}

        {/* Items — includes variant/SKU/vendor matching web */}
        <Section title={`Items (${order.items.length})`}>
          {order.items.map((item: any, i: number) => (
            <View key={item.id} style={{ paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#f3f4f6' }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                  {item.productImage ? (
                    <Image source={{ uri: item.productImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={20} color="#d1d5db" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 17 }} numberOfLines={2}>
                    {item.productName}
                  </Text>
                  {/* Variant details — color/size (matches web) */}
                  {(item.color || item.size) ? (
                    <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      {[item.color, item.size ? `Size: ${item.size}` : null].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>Qty: {item.quantity}</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>·</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(item.unitPrice)} each</Text>
                  </View>
                  {/* SKU + Vendor — available in API, matches web */}
                  {(item.sku || item.vendorName) ? (
                    <Text style={{ fontSize: 10, color: '#d1d5db', marginTop: 2 }}>
                      {[item.sku ? `SKU: ${item.sku}` : null, item.vendorName].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', alignSelf: 'center' }}>
                  {fmt(item.totalPrice)}
                </Text>
              </View>
            </View>
          ))}
        </Section>

        {/* Delivery info — estimated/actual date (matches web) */}
        <Section title="Delivery Info">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={14} color="#2563eb" />
            </View>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                {order.status === 'DELIVERED' ? 'Delivered' : 'Estimated Delivery'}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                {order.status === 'DELIVERED'
                  ? `Delivered on ${orderService.formatDate(order.updatedAt)}`
                  : (order as any).estimatedDelivery
                    ? orderService.formatDate((order as any).estimatedDelivery)
                    : 'To be updated'}
              </Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#f3f4f6', marginBottom: 12 }} />

          {/* Address */}
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{order.shippingAddress.fullName}</Text>
          <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 18 }}>
            {order.shippingAddress.addressLine1}
            {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
          </Text>
          <Text style={{ fontSize: 13, color: '#6b7280' }}>
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
          </Text>
          {order.shippingAddress.country ? (
            <Text style={{ fontSize: 13, color: '#6b7280' }}>{order.shippingAddress.country}</Text>
          ) : null}

          {/* Contact — stacked vertically so email doesn't get cut */}
          <View style={{ marginTop: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Phone size={13} color="#6b7280" />
              <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>{order.shippingAddress.phone}</Text>
            </View>
            {order.customerEmail ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Mail size={13} color="#6b7280" />
                <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500', flexShrink: 1 }}>{order.customerEmail}</Text>
              </View>
            ) : null}
          </View>
        </Section>

        {/* Payment */}
        <Section title="Payment">
          <Row label="Method" value={order.paymentMethod} />
          <Row label="Status" value={order.paymentStatus} valueColor={order.paymentStatus === 'PAID' ? '#16a34a' : order.paymentStatus === 'FAILED' ? '#dc2626' : '#d97706'} />
          {order.paymentId ? <Row label="Transaction" value={order.paymentId} small /> : null}
        </Section>

        {/* Summary */}
        <Section title="Order Summary">
          <Row label="Subtotal" value={fmt(order.subtotal)} />
          {order.tax > 0 ? <Row label="Tax" value={fmt(order.tax)} /> : null}
          <Row label="Shipping" value={order.shippingCost === 0 ? 'Free' : fmt(order.shippingCost)} valueColor={order.shippingCost === 0 ? '#16a34a' : undefined} />
          {order.discount > 0 ? <Row label="Discount" value={`-${fmt(order.discount)}`} valueColor="#16a34a" /> : null}
          <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>Total</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{fmt(order.totalAmount)}</Text>
          </View>
        </Section>

        {/* Actions — matches web: Invoice for all, Review for delivered */}
        <Section title="Actions">
          <View style={{ gap: 10 }}>
            {/* Download Invoice — fetches HTML from API, shows in WebView modal */}
            <Pressable
              onPress={handleDownloadInvoice}
              disabled={loadingInvoice}
              accessibilityRole="button"
              accessibilityLabel="Download invoice"
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 44,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  backgroundColor: '#fff',
                  gap: 6,
                  opacity: loadingInvoice ? 0.6 : 1,
                }}
              >
                {loadingInvoice ? (
                  <ActivityIndicator size={14} color="#111827" />
                ) : (
                  <FileText size={15} color="#111827" />
                )}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>
                  {loadingInvoice ? 'Generating...' : 'View Invoice'}
                </Text>
              </View>
            </Pressable>

            {/* Write Review — only for delivered orders */}
            {order.status === 'DELIVERED' ? (
              <Pressable
                onPress={() => { if (!hasReviewed) setShowReviewModal(true); }}
                disabled={hasReviewed}
                accessibilityRole="button"
                accessibilityLabel={hasReviewed ? 'Review submitted' : 'Write a review'}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: hasReviewed ? '#f0fdf4' : '#111827',
                    gap: 6,
                  }}
                >
                  {hasReviewed ? (
                    <>
                      <CheckCircle size={15} color="#16a34a" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#16a34a' }}>Review Submitted</Text>
                    </>
                  ) : (
                    <>
                      <Star size={15} color="#f59e0b" fill="#f59e0b" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>Write a Review</Text>
                    </>
                  )}
                </View>
              </Pressable>
            ) : null}

            {/* Navigation */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => router.push('/(tabs)' as any)} accessibilityRole="button" style={{ flex: 1 }}>
                <View style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Shop Again</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => router.push('/(tabs)/orders' as any)} accessibilityRole="button" style={{ flex: 1 }}>
                <View style={{ height: 48, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>All Orders</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </Section>
      </ScrollView>

      {/* Invoice modal — shows HTML from backend in a WebView */}
      <Modal
        visible={invoiceHtml !== null}
        animationType="slide"
        onRequestClose={() => setInvoiceHtml(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Modal header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Invoice</Text>
            <Pressable onPress={() => setInvoiceHtml(null)} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
              <View style={{ padding: 4 }}>
                <X size={22} color="#111827" />
              </View>
            </Pressable>
          </View>
          {invoiceHtml ? (
            <WebView
              source={{ html: invoiceHtml }}
              style={{ flex: 1 }}
              scalesPageToFit
            />
          ) : null}
        </View>
      </Modal>

      {/* Review Modal */}
      {order ? (
        <ReviewModal
          visible={showReviewModal}
          orderId={order.id}
          orderDisplayId={order.orderId}
          items={order.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
          }))}
          onClose={() => setShowReviewModal(false)}
          onReviewSubmitted={() => { setHasReviewed(true); }}
        />
      ) : null}
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const headerInsets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: '#fff',
        paddingHorizontal: 8,
        paddingTop: headerInsets.top + 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)/orders' as any))}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        style={{ padding: 8 }}
      >
        <ArrowLeft size={22} color="#111827" />
      </Pressable>
      <View style={{ flex: 1, marginLeft: 4 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
      }}
    >
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{title}</Text>
      </View>
      <View style={{ padding: 16 }}>{children}</View>
    </View>
  );
}

// ─── Summary row ──────────────────────────────────────────────────────────────
function Row({ label, value, valueColor, small }: { label: string; value: string; valueColor?: string; small?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ fontSize: 13, color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: small ? 11 : 13, fontWeight: '600', color: valueColor || '#111827' }} numberOfLines={1}>{value}</Text>
    </View>
  );
}
