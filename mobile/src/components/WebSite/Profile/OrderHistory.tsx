import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  total: number;
  items: number;
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await orderService.getUserOrders();
      // if (response.success) {
      //   setOrders(response.data);
      // }
      
      // Mock data for now
      setTimeout(() => {
        setOrders([]);
        setLoading(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching orders');
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'delivered':
      case 'completed':
        return <CheckCircle size={20} color="#16a34a" />;
      case 'shipped':
      case 'dispatched':
        return <Truck size={20} color="#2563eb" />;
      case 'processing':
      case 'order_created':
      case 'confirmed':
        return <Clock size={20} color="#ca8a04" />;
      case 'cancelled':
      case 'failed':
        return <Package size={20} color="#dc2626" />;
      default:
        return <Package size={20} color="#64748b" />;
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped':
      case 'dispatched':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
      case 'order_created':
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <ActivityIndicator size="large" color="#4b5563" />
        <Text className="mt-4 text-gray-600">Loading orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <AlertCircle size={48} color="#dc2626" />
        <Text className="mt-4 text-red-600 text-center">{error}</Text>
        <TouchableOpacity
          onPress={fetchOrders}
          className="mt-4 bg-blue-600 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Package size={64} color="#d1d5db" />
        <Text className="text-xl font-bold text-gray-900 mt-4 mb-2">
          No Orders Yet
        </Text>
        <Text className="text-gray-600 text-center">
          You haven't placed any orders yet. Start shopping to see your order history here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        {orders.map((order) => (
          <View
            key={order.id}
            className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-gray-900">
                Order #{order.orderNumber}
              </Text>
              <View className={`flex-row items-center px-3 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <Text className="text-xs font-semibold ml-1">
                  {formatStatus(order.status)}
                </Text>
              </View>
            </View>

            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-600">Date</Text>
                <Text className="text-sm font-medium text-gray-900">{order.date}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-600">Items</Text>
                <Text className="text-sm font-medium text-gray-900">{order.items}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-600">Total</Text>
                <Text className="text-base font-bold text-gray-900">${order.total.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity className="mt-4 bg-gray-100 py-3 rounded-lg">
              <Text className="text-center text-gray-700 font-semibold">View Details</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
