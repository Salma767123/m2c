import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  RefreshControl,
  Animated,
} from 'react-native';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  ShoppingBag,
  Star,
} from 'lucide-react-native';
import { router } from 'expo-router';
import orderService, { Order as APIOrder } from '@/services/orderService';
import { OrdersSkeleton } from '@/components/ui/Skeleton';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  total: number;
  items: OrderItem[];
  trackingNumber?: string;
  estimatedDelivery?: string;
  paymentStatus?: string;
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const normalizeStatus = (s: string): string => {
  const n = s.toLowerCase();
  if (['order_created', 'confirmed', 'pending', 'processing'].includes(n)) return 'processing';
  if (['dispatched', 'shipped'].includes(n)) return 'shipped';
  if (['completed', 'delivered', 'received'].includes(n)) return 'received';
  if (['failed', 'cancelled'].includes(n)) return 'cancelled';
  return n;
};

const STATUS_CONFIG: Record<string, {
  iconBg: string; textColor: string; bgColor: string;
  label: string; icon: any;
}> = {
  received: {
    iconBg: '#10b981', textColor: '#065f46', bgColor: '#ecfdf5',
    label: 'Received', icon: CheckCircle,
  },
  shipped: {
    iconBg: '#3b82f6', textColor: '#1e40af', bgColor: '#eff6ff',
    label: 'Shipped', icon: Truck,
  },
  processing: {
    iconBg: '#f59e0b', textColor: '#92400e', bgColor: '#fffbeb',
    label: 'Processing', icon: Clock,
  },
  cancelled: {
    iconBg: '#ef4444', textColor: '#991b1b', bgColor: '#fef2f2',
    label: 'Cancelled', icon: XCircle,
  },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] || {
    iconBg: '#94a3b8', textColor: '#475569', bgColor: '#f8fafc',
    label: status.charAt(0).toUpperCase() + status.slice(1), icon: Package,
  };

// ── OrderCard ──────────────────────────────────────────────────────────────────

function OrderCard({ order, index }: { order: Order; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(24)).current;
  const config = getStatusConfig(order.status);
  const StatusIcon = config.icon;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const displayItems = expanded ? order.items : order.items.slice(0, 2);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          marginBottom: 14,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        {/* Status accent bar */}
        <View style={{ height: 3, backgroundColor: config.iconBg }} />

        <View style={{ padding: 16 }}>
          {/* Order header: ID + status badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                ORDER
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 2 }}>
                #{order.orderNumber}
              </Text>
              <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                Placed on {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: config.bgColor, borderRadius: 20,
              paddingHorizontal: 11, paddingVertical: 7,
            }}>
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: config.iconBg,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <StatusIcon size={11} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: config.textColor }}>
                {config.label}
              </Text>
            </View>
          </View>

          {/* Total + payment status */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
          }}>
            <Text style={{ fontSize: 13, color: '#6b7280' }}>Order Total</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {order.paymentStatus && (
                <View style={{
                  backgroundColor: order.paymentStatus.toUpperCase() === 'PAID' ? '#ecfdf5' : '#fffbeb',
                  paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
                }}>
                  <Text style={{
                    fontSize: 10, fontWeight: '700',
                    color: order.paymentStatus.toUpperCase() === 'PAID' ? '#059669' : '#d97706',
                  }}>
                    {order.paymentStatus}
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>
                ${order.total.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Items preview */}
          <View style={{ gap: 10, marginBottom: 14 }}>
            {displayItems.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: '#f9fafb', borderRadius: 12, padding: 10,
                }}
              >
                <View style={{
                  width: 52, height: 52, borderRadius: 10,
                  backgroundColor: '#f1f5f9', overflow: 'hidden',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={{ width: 52, height: 52 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Package size={22} color="#94a3b8" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Qty: {item.quantity}</Text>
                    {item.size && <Text style={{ fontSize: 11, color: '#64748b' }}>Size: {item.size}</Text>}
                    {item.color && <Text style={{ fontSize: 11, color: '#64748b' }}>Color: {item.color}</Text>}
                  </View>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          {/* Show more/less */}
          {order.items.length > 2 && (
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 5, paddingVertical: 8, marginBottom: 10,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, color: '#3b82f6', fontWeight: '600' }}>
                {expanded ? 'Show Less' : `Show ${order.items.length - 2} More Items`}
              </Text>
              {expanded
                ? <ChevronUp size={15} color="#3b82f6" />
                : <ChevronDown size={15} color="#3b82f6" />
              }
            </TouchableOpacity>
          )}

          {/* Action buttons */}
          <View style={{
            flexDirection: 'row', gap: 10, paddingTop: 12,
            borderTopWidth: 1, borderTopColor: '#f1f5f9', flexWrap: 'wrap',
          }}>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/orders/${order.id}` as any)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#1a1a2e', borderRadius: 10,
                paddingHorizontal: 14, paddingVertical: 10,
              }}
              activeOpacity={0.8}
            >
              <Eye size={14} color="#ffffff" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>View Details</Text>
            </TouchableOpacity>

            {order.status === 'received' && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fde68a',
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                }}
                activeOpacity={0.8}
              >
                <Star size={14} color="#d97706" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400e' }}>Write Review</Text>
              </TouchableOpacity>
            )}

            {order.trackingNumber && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                }}
                activeOpacity={0.8}
              >
                <Truck size={14} color="#3b82f6" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1d4ed8' }}>Track Order</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Estimated delivery chip */}
          {order.estimatedDelivery && !['received', 'cancelled'].includes(order.status) && (
            <View style={{
              backgroundColor: '#eff6ff', borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 8,
              flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
            }}>
              <Clock size={13} color="#3b82f6" />
              <Text style={{ fontSize: 11, color: '#1d4ed8', fontWeight: '500' }}>
                Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderService.getUserOrders();
      if (response.success && response.data) {
        // Transform API data → component format (same logic as web Order.tsx)
        const transformed: Order[] = response.data.map((apiOrder: any) => ({
          id: apiOrder.id,
          orderNumber: apiOrder.orderId,
          date: apiOrder.createdAt,
          status: normalizeStatus(apiOrder.status),
          total: apiOrder.totalAmount,
          paymentStatus: apiOrder.paymentStatus,
          items: apiOrder.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            name: item.productName,
            image: item.productImage || '',
            quantity: item.quantity,
            price: item.unitPrice,
            size: item.size,
            color: item.color,
          })),
          trackingNumber: apiOrder.trackingReference,
          estimatedDelivery: apiOrder.estimatedDelivery,
        }));
        setOrders(transformed);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  // ── Filter logic (same as web) ─────────────────────────────────────────────
  const filtered = orders.filter((order) => {
    const matchSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter === 'all') return matchSearch;
    return matchSearch && order.status.toLowerCase().includes(statusFilter.toLowerCase());
  });

  const currentOrders = filtered.filter(
    (o) => !['received', 'cancelled'].includes(o.status.toLowerCase())
  );
  const pastOrders = filtered.filter(
    (o) => ['received', 'cancelled'].includes(o.status.toLowerCase())
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
        <OrdersSkeleton />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f8f9fa' }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <AlertCircle size={36} color="#ef4444" />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#991b1b', marginBottom: 8 }}>Something went wrong</Text>
        <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>{error}</Text>
        <TouchableOpacity
          onPress={fetchOrders}
          style={{ backgroundColor: '#1a1a2e', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (orders.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f8f9fa' }}>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <ShoppingBag size={44} color="#d1d5db" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          No Orders Yet
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          You haven't placed any orders yet.{'\n'}Start shopping to see your history here.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)')}
          style={{
            backgroundColor: '#1a1a2e', borderRadius: 16,
            paddingHorizontal: 32, paddingVertical: 15,
          }}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {/* Search + filter bar — matches web Order.tsx */}
      <View style={{
        backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
      }}>
        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: '#f3f4f6', borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
        }}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            placeholder="Search by order ID or product…"
            placeholderTextColor="#9ca3af"
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{ flex: 1, fontSize: 14, color: '#111827', padding: 0 }}
          />
        </View>

        {/* Status filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['all', 'processing', 'shipped', 'received', 'cancelled'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setStatusFilter(f)}
              activeOpacity={0.75}
              style={{
                paddingHorizontal: 14, paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: statusFilter === f ? '#1a1a2e' : '#f3f4f6',
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: '700',
                color: statusFilter === f ? '#ffffff' : '#6b7280',
                textTransform: 'capitalize',
              }}>
                {f === 'all' ? 'All Orders' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a1a2e" colors={['#1a1a2e']} />
        }
      >
        {/* Current Orders section */}
        {currentOrders.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 }}>
              Current Orders
            </Text>
            {currentOrders.map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} />
            ))}
          </View>
        )}

        {/* Past Orders section */}
        {pastOrders.length > 0 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 }}>
              Past Orders
            </Text>
            {pastOrders.map((order, i) => (
              <OrderCard key={order.id} order={order} index={currentOrders.length + i} />
            ))}
          </View>
        )}

        {/* No results state */}
        {filtered.length === 0 && (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Package size={36} color="#d1d5db" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 }}>No Orders Found</Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : "You haven't placed any orders yet"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
