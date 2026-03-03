import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
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
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { orderService, Order } from '@/services/orderService';
import { showErrorToast } from '@/lib/toast-utils';



// ── Status Configuration ──
const STATUS_CONFIG: Record<string, {
  gradient: [string, string];
  iconBg: string;
  textColor: string;
  icon: any;
  bgColor: string;
}> = {
  delivered: {
    gradient: ['#ecfdf5', '#d1fae5'],
    iconBg: '#10b981',
    textColor: '#065f46',
    bgColor: '#ecfdf5',
    icon: CheckCircle,
  },
  shipped: {
    gradient: ['#eff6ff', '#dbeafe'],
    iconBg: '#3b82f6',
    textColor: '#1e40af',
    bgColor: '#eff6ff',
    icon: Truck,
  },
  processing: {
    gradient: ['#fffbeb', '#fef3c7'],
    iconBg: '#f59e0b',
    textColor: '#92400e',
    bgColor: '#fffbeb',
    icon: Clock,
  },
  confirmed: {
    gradient: ['#fffbeb', '#fef3c7'],
    iconBg: '#f59e0b',
    textColor: '#92400e',
    bgColor: '#fffbeb',
    icon: Clock,
  },
  order_created: {
    gradient: ['#faf5ff', '#ede9fe'],
    iconBg: '#8b5cf6',
    textColor: '#5b21b6',
    bgColor: '#faf5ff',
    icon: Package,
  },
  cancelled: {
    gradient: ['#fef2f2', '#fee2e2'],
    iconBg: '#ef4444',
    textColor: '#991b1b',
    bgColor: '#fef2f2',
    icon: XCircle,
  },
};

const getConfig = (status: string) =>
  STATUS_CONFIG[status.toLowerCase()] || {
    gradient: ['#f8fafc', '#f1f5f9'] as [string, string],
    iconBg: '#94a3b8',
    textColor: '#475569',
    bgColor: '#f8fafc',
    icon: Package,
  };

// ── Timeline Steps ──
const ORDER_STEPS = [
  { key: 'ORDER_CREATED', label: 'Order Placed', icon: Package },
  { key: 'CONFIRMED', label: 'Confirmed', icon: ShieldCheck },
  { key: 'PROCESSING', label: 'Processing', icon: Clock },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

function getActiveStepIndex(status: string): number {
  const idx = ORDER_STEPS.findIndex(
    (s) => s.key === status.toUpperCase()
  );
  return idx >= 0 ? idx : 0;
}

// ── Section Card Component ──
function SectionCard({
  title,
  icon: Icon,
  children,
  delay = 0,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  delay?: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        overflow: 'hidden',
      }}
    >
      {/* Section Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: '#f1f5f9',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Icon size={16} color="#64748b" />
        </View>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>
          {title}
        </Text>
      </View>

      {/* Section Content */}
      <View style={{ padding: 16 }}>{children}</View>
    </Animated.View>
  );
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await orderService.getOrderById(id);
      if (response.success && response.data) {
        setOrder(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch order details:', error);
      showErrorToast('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <View
          className="bg-white px-5 py-4 flex-row items-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Order Details</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1f2937" />
          <Text className="text-gray-500 mt-4 text-sm">Loading order details...</Text>
        </View>
      </View>
    );
  }

  // ── Not Found State ──
  if (!order) {
    return (
      <View className="flex-1 bg-gray-50">
        <View
          className="bg-white px-5 py-4 flex-row items-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Order Details</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Package size={40} color="#94a3b8" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2">Order Not Found</Text>
          <Text className="text-gray-500 text-center text-sm mb-8">
            The order you're looking for doesn't exist or has been removed
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            className="bg-gray-900 rounded-2xl px-8 py-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text className="text-white font-bold text-base">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusConfig = getConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const isCancelled = order.status.toUpperCase() === 'CANCELLED';
  const activeStepIndex = getActiveStepIndex(order.status);

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Premium Header ── */}
      <View
        className="bg-white px-5 pt-4 pb-5"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#1e293b" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">Order Details</Text>
            <Text className="text-xs text-gray-500 mt-0.5">#{order.orderId}</Text>
          </View>
        </View>

        {/* Status Banner */}
        <View
          style={{
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: statusConfig.gradient[0],
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: statusConfig.iconBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <StatusIcon size={22} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text
              style={{
                fontSize: 17,
                fontWeight: '700',
                color: statusConfig.textColor,
                marginBottom: 2,
              }}
            >
              {orderService.formatStatus(order.status)}
            </Text>
            <Text style={{ fontSize: 12, color: statusConfig.textColor, opacity: 0.7 }}>
              {isCancelled
                ? 'This order has been cancelled'
                : order.status === 'DELIVERED'
                ? 'Your order has been delivered!'
                : 'Your order is being processed'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Order Progress Timeline ── */}
        {!isCancelled && (
          <SectionCard title="Order Progress" icon={Truck} delay={0}>
            <View style={{ paddingHorizontal: 4, paddingTop: 4 }}>
              {ORDER_STEPS.map((step, index) => {
                const isCompleted = index <= activeStepIndex;
                const isActive = index === activeStepIndex;
                const StepIcon = step.icon;
                const isLast = index === ORDER_STEPS.length - 1;

                return (
                  <View
                    key={step.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      marginBottom: isLast ? 0 : 4,
                    }}
                  >
                    {/* Timeline Line + Circle */}
                    <View style={{ alignItems: 'center', width: 36 }}>
                      <View
                        style={{
                          width: isActive ? 34 : 28,
                          height: isActive ? 34 : 28,
                          borderRadius: isActive ? 17 : 14,
                          backgroundColor: isCompleted
                            ? statusConfig.iconBg
                            : '#e2e8f0',
                          alignItems: 'center',
                          justifyContent: 'center',
                          ...(isActive
                            ? {
                                shadowColor: statusConfig.iconBg,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.4,
                                shadowRadius: 6,
                                elevation: 4,
                              }
                            : {}),
                        }}
                      >
                        <StepIcon
                          size={isActive ? 16 : 14}
                          color={isCompleted ? '#ffffff' : '#94a3b8'}
                        />
                      </View>
                      {!isLast && (
                        <View
                          style={{
                            width: 2,
                            height: 24,
                            backgroundColor: isCompleted && index < activeStepIndex
                              ? statusConfig.iconBg
                              : '#e2e8f0',
                            marginVertical: 2,
                            borderRadius: 1,
                          }}
                        />
                      )}
                    </View>

                    {/* Step Label */}
                    <View style={{ flex: 1, paddingLeft: 10, paddingTop: isActive ? 7 : 4 }}>
                      <Text
                        style={{
                          fontSize: isActive ? 14 : 13,
                          fontWeight: isActive ? '700' : '500',
                          color: isCompleted ? '#1e293b' : '#94a3b8',
                        }}
                      >
                        {step.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </SectionCard>
        )}

        {/* ── Order Items ── */}
        <SectionCard title={`Items (${order.items.length})`} icon={Package} delay={100}>
          {order.items.map((item, index) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row',
                paddingVertical: 12,
                ...(index < order.items.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }
                  : {}),
              }}
            >
              {/* Product Image */}
              {item.productImage ? (
                <Image
                  source={{ uri: item.productImage }}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 14,
                    backgroundColor: '#f8fafc',
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 14,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Package size={28} color="#94a3b8" />
                </View>
              )}

              {/* Product Details */}
              <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: 4,
                  }}
                  numberOfLines={2}
                >
                  {item.productName}
                </Text>
                <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                  SKU: {item.sku}  •  {item.vendorName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View
                    style={{
                      backgroundColor: '#f1f5f9',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                      {item.quantity} × ${item.unitPrice.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>
                    ${item.totalPrice.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </SectionCard>

        {/* ── Shipping Address ── */}
        <SectionCard title="Shipping Address" icon={MapPin} delay={200}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: '#eff6ff',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <MapPin size={18} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 }}>
                {order.shippingAddress.fullName}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 2 }}>
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748b', lineHeight: 20 }}>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.zipCode}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                {order.shippingAddress.country}
              </Text>
            </View>
          </View>

          {/* Contact Info */}
          <View
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: 12,
              padding: 12,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Phone size={14} color="#64748b" />
              <Text style={{ fontSize: 13, color: '#475569', marginLeft: 10, fontWeight: '500' }}>
                {order.shippingAddress.phone}
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#e2e8f0' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Mail size={14} color="#64748b" />
              <Text style={{ fontSize: 13, color: '#475569', marginLeft: 10, fontWeight: '500' }}>
                {order.customerEmail}
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* ── Payment Information ── */}
        <SectionCard title="Payment" icon={CreditCard} delay={300}>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CreditCard size={16} color="#64748b" />
                <Text style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>Method</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b' }}>
                {order.paymentMethod}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: '#64748b' }}>Status</Text>
              <View
                style={{
                  backgroundColor:
                    order.paymentStatus === 'PAID'
                      ? '#ecfdf5'
                      : order.paymentStatus === 'FAILED'
                      ? '#fef2f2'
                      : '#fffbeb',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color:
                      order.paymentStatus === 'PAID'
                        ? '#059669'
                        : order.paymentStatus === 'FAILED'
                        ? '#dc2626'
                        : '#d97706',
                  }}
                >
                  {order.paymentStatus}
                </Text>
              </View>
            </View>

            {order.paymentId && (
              <>
                <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: '#64748b' }}>Transaction ID</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                      style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}
                      numberOfLines={1}
                    >
                      {order.paymentId.length > 16
                        ? `${order.paymentId.slice(0, 16)}...`
                        : order.paymentId}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </SectionCard>

        {/* ── Order Summary ── */}
        <SectionCard title="Order Summary" icon={Receipt} delay={400}>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#64748b' }}>Subtotal</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b' }}>
                ${order.subtotal.toFixed(2)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#64748b' }}>Shipping</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: order.shippingCost === 0 ? '#059669' : '#1e293b' }}>
                {order.shippingCost === 0 ? 'FREE' : `$${order.shippingCost.toFixed(2)}`}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#64748b' }}>Tax</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b' }}>
                ${order.tax.toFixed(2)}
              </Text>
            </View>

            {order.discount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: '#059669' }}>Discount</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#059669' }}>
                  -${order.discount.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Total */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: '#e2e8f0',
                paddingTop: 12,
                marginTop: 4,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>
                Total
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1e293b' }}>
                ${order.totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* ── Order Date Footer ── */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <CalendarDays size={16} color="#64748b" />
            </View>
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>Order Date</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>
            {orderService.formatDate(order.createdAt)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
