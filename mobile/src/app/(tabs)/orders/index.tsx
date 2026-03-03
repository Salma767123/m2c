import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { Package, Truck, CheckCircle, Clock, XCircle, AlertCircle, ChevronRight, ShoppingBag, LogIn } from 'lucide-react-native';
import { router } from 'expo-router';
import { orderService, Order } from '@/services/orderService';
import { userAuthService } from '@/services/userAuthService';
import { showErrorToast } from '@/lib/toast-utils';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_CONFIG: Record<string, { gradient: [string, string]; iconBg: string; textColor: string; icon: any; label?: string }> = {
  delivered: {
    gradient: ['#ecfdf5', '#d1fae5'],
    iconBg: '#10b981',
    textColor: '#065f46',
    icon: CheckCircle,
  },
  shipped: {
    gradient: ['#eff6ff', '#dbeafe'],
    iconBg: '#3b82f6',
    textColor: '#1e40af',
    icon: Truck,
  },
  processing: {
    gradient: ['#fffbeb', '#fef3c7'],
    iconBg: '#f59e0b',
    textColor: '#92400e',
    icon: Clock,
  },
  confirmed: {
    gradient: ['#fffbeb', '#fef3c7'],
    iconBg: '#f59e0b',
    textColor: '#92400e',
    icon: Clock,
  },
  order_created: {
    gradient: ['#faf5ff', '#ede9fe'],
    iconBg: '#8b5cf6',
    textColor: '#5b21b6',
    icon: Package,
  },
  cancelled: {
    gradient: ['#fef2f2', '#fee2e2'],
    iconBg: '#ef4444',
    textColor: '#991b1b',
    icon: XCircle,
  },
};

const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status.toLowerCase()] || {
    gradient: ['#f8fafc', '#f1f5f9'] as [string, string],
    iconBg: '#94a3b8',
    textColor: '#475569',
    icon: AlertCircle,
  };
};

function OrderCard({ order, index }: { order: Order; index: number }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;
  const config = getStatusConfig(order.status);
  const StatusIcon = config.icon;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        onPress={() => router.push(`/(tabs)/orders/${order.id}` as any)}
        activeOpacity={0.7}
        className="bg-white rounded-2xl mb-4 overflow-hidden"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        {/* Status Accent Bar */}
        <View style={{ height: 3, backgroundColor: config.iconBg }} />

        <View className="p-4">
          {/* Top Row: Order ID + Status Badge */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-xs text-gray-400 font-medium tracking-wider uppercase mb-1">
                ORDER
              </Text>
              <Text className="text-base font-bold text-gray-900">
                #{order.orderId}
              </Text>
            </View>

            <View
              style={{
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: config.gradient[0],
              }}
            >
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: config.iconBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 6,
                  }}
                >
                  <StatusIcon size={12} color="#ffffff" />
                </View>
                <Text style={{ color: config.textColor, fontSize: 12, fontWeight: '700' }}>
                  {orderService.formatStatus(order.status)}
                </Text>
              </View>
            </View>
          </View>

          {/* Details Grid */}
          <View
            className="bg-gray-50 rounded-xl p-3 mb-4"
            style={{ gap: 10 }}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-500">Date</Text>
              <Text className="text-sm font-semibold text-gray-800">
                {orderService.formatDate(order.createdAt)}
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-500">Items</Text>
              <Text className="text-sm font-semibold text-gray-800">
                {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-500">Payment</Text>
              <View
                style={{
                  backgroundColor:
                    order.paymentStatus === 'PAID'
                      ? '#ecfdf5'
                      : order.paymentStatus === 'FAILED'
                      ? '#fef2f2'
                      : '#fffbeb',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
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
          </View>

          {/* Bottom Row: Total + Action */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-gray-400 font-medium mb-0.5">TOTAL</Text>
              <Text className="text-xl font-bold text-gray-900">
                ${order.totalAmount.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/orders/${order.id}` as any)}
              className="flex-row items-center bg-gray-900 rounded-xl px-4 py-2.5"
              activeOpacity={0.8}
            >
              <Text className="text-white text-sm font-semibold mr-1">Details</Text>
              <ChevronRight size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const tabIndicatorAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkAuthAndFetchOrders();
  }, []);

  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: activeTab === 'current' ? 0 : 1,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [activeTab]);

  const checkAuthAndFetchOrders = async () => {
    const authenticated = await userAuthService.isAuthenticated();
    setIsAuthenticated(authenticated);

    if (authenticated) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getUserOrders();
      if (response.success && response.data) {
        setOrders(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
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

  const currentOrders = orders.filter(
    (order) => !['DELIVERED', 'CANCELLED'].includes(order.status)
  );

  const orderHistory = orders.filter(
    (order) => ['DELIVERED', 'CANCELLED'].includes(order.status)
  );

  const displayOrders = activeTab === 'current' ? currentOrders : orderHistory;

  // ── Unauthenticated State ──
  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-5 pt-4 pb-5"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text className="text-2xl font-bold text-gray-900">My Orders</Text>
          <Text className="text-sm text-gray-500 mt-1">Track and manage your orders</Text>
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
            <LogIn size={40} color="#94a3b8" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-2">Login Required</Text>
          <Text className="text-gray-500 text-center text-base mb-8 leading-6">
            Sign in to view your orders and track deliveries in real-time
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/Login')}
            activeOpacity={0.85}
            className="bg-gray-900 rounded-2xl px-10 py-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text className="text-white font-bold text-base">Login Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading State ──
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-white px-5 pt-4 pb-5"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text className="text-2xl font-bold text-gray-900">My Orders</Text>
          <Text className="text-sm text-gray-500 mt-1">Track and manage your orders</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1f2937" />
          <Text className="text-gray-500 mt-4 text-sm">Loading your orders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Premium Header ── */}
      <View
        className="bg-white px-5 pt-4 pb-4"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold text-gray-900">My Orders</Text>
            <Text className="text-sm text-gray-500 mt-0.5">Track and manage your orders</Text>
          </View>
          <View
            style={{
              backgroundColor: '#f1f5f9',
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package size={20} color="#64748b" />
          </View>
        </View>

        {/* ── Animated Tab Switcher ── */}
        <View
          className="flex-row bg-gray-100 rounded-2xl p-1"
          style={{ position: 'relative' }}
        >
          {/* Animated Indicator */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              width: (SCREEN_WIDTH - 48) / 2,
              height: 40,
              borderRadius: 14,
              backgroundColor: '#111827',
              transform: [{
                translateX: tabIndicatorAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, (SCREEN_WIDTH - 48) / 2],
                }),
              }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 4,
            }}
          />

          <TouchableOpacity
            onPress={() => setActiveTab('current')}
            className="flex-1 items-center justify-center"
            style={{ height: 40, zIndex: 1 }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: activeTab === 'current' ? '#ffffff' : '#6b7280',
                fontWeight: '700',
                fontSize: 14,
              }}
            >
              Active ({currentOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('history')}
            className="flex-1 items-center justify-center"
            style={{ height: 40, zIndex: 1 }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: activeTab === 'history' ? '#ffffff' : '#6b7280',
                fontWeight: '700',
                fontSize: 14,
              }}
            >
              History ({orderHistory.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Orders List ── */}
      {displayOrders.length === 0 ? (
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
            <ShoppingBag size={40} color="#94a3b8" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
            {activeTab === 'current' ? 'No Active Orders' : 'No Order History'}
          </Text>
          <Text className="text-gray-500 text-center text-sm mb-8 leading-5">
            {activeTab === 'current'
              ? "You don't have any active orders.\nStart shopping to place your first order!"
              : "Your completed and cancelled orders\nwill show up here."}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)' as any)}
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
            <Text className="text-white font-bold text-base">Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1f2937"
              colors={['#1f2937']}
            />
          }
        >
          {displayOrders.map((order, index) => (
            <OrderCard key={order.id} order={order} index={index} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
