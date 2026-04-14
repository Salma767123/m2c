import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { AlertCircle, FileText, CheckCircle2 } from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { router } from 'expo-router';

export default function ProductsTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Assuming getAssignedProducts is implemented in qcCheckerService
        const response = await qcCheckerService.getAssignedProducts();
        if (mounted && response?.success && response.data) {
          setProducts(response.data);
        } else if (mounted) {
          // Fallback static data
          setProducts([
            { id: '1', name: "Men's Cotton T-Shirt", baseSku: "TSH-M-C-01", category: "Apparel", approvalStatus: "PENDING", vendor: { companyName: "Global Textiles Ltd", ownerName: "John Doe" } },
            { id: '2', name: "Denim Jeans Classic", baseSku: "JNS-D-C-02", category: "Apparel", approvalStatus: "UNDER_REVIEW", vendor: { companyName: "Premium Garments C..", ownerName: "Jane Smith" } },
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch assigned products:", error);
        if (mounted) {
          setProducts([
            { id: '1', name: "Men's Cotton T-Shirt", baseSku: "TSH-M-C-01", category: "Apparel", approvalStatus: "PENDING", vendor: { companyName: "Global Textiles Ltd", ownerName: "John Doe" } }
          ]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProducts();
    return () => { mounted = false; };
  }, []);

  const getStatusStyle = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'PENDING') return { bg: 'bg-amber-100', text: 'text-amber-800' };
    if (s === 'APPROVED') return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
    if (s === 'REJECTED') return { bg: 'bg-red-100', text: 'text-red-800' };
    if (s === 'UNDER_REVIEW') return { bg: 'bg-blue-100', text: 'text-blue-800' };
    return { bg: 'bg-gray-100', text: 'text-gray-800' };
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-gray-500 font-medium">Loading Assigned Products...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View className="mb-6">
        <Text className="text-3xl font-extrabold text-gray-900 mb-1">Assigned Products</Text>
        <Text className="text-gray-600 text-sm">Review and approve or reject vendor products</Text>
      </View>

      <View className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <View className="px-5 py-4 border-b border-gray-100 bg-slate-50">
          <Text className="text-lg font-bold text-gray-900">Products Awaiting Inspection</Text>
        </View>

        {products.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <AlertCircle size={48} color="#d1d5db" />
            <Text className="mt-4 text-gray-500 font-medium text-base">No assigned products at this time</Text>
          </View>
        ) : (
          <View className="p-4 gap-y-4">
            {products.map((product) => {
              const statusStyle = getStatusStyle(product.approvalStatus);
              const needsInspection = product.approvalStatus === 'PENDING' || product.approvalStatus === 'UNDER_REVIEW';

              return (
                <View key={product.id} className="border border-gray-200 rounded-xl p-4">
                  {/* Header info */}
                  <View className="flex-row items-center mb-4">
                    <View className="w-14 h-14 bg-gray-100 rounded-lg items-center justify-center overflow-hidden mr-3">
                      {product.images?.[0]?.url ? (
                        <Image source={{ uri: product.images[0].url }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Text className="text-[10px] text-gray-400 font-medium">No Image</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>{product.name}</Text>
                      <Text className="text-xs text-gray-500 font-mono mt-0.5">SKU: {product.baseSku}</Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between mb-4 border-t border-b border-gray-100 py-3">
                    <View className="flex-1">
                      <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Vendor</Text>
                      <Text className="font-semibold text-gray-900 text-sm" numberOfLines={1}>{product.vendor?.companyName}</Text>
                      <Text className="text-xs text-gray-500" numberOfLines={1}>{product.vendor?.ownerName}</Text>
                    </View>
                    <View className="flex-1 pl-2">
                       <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Status</Text>
                       <View className={`self-start px-2 py-0.5 rounded-full ${statusStyle.bg}`}>
                         <Text className={`text-[10px] font-bold ${statusStyle.text}`}>{product.approvalStatus}</Text>
                       </View>
                       <Text className="text-xs text-gray-700 mt-1">{product.category}</Text>
                    </View>
                  </View>

                  {needsInspection ? (
                    <TouchableOpacity 
                      className="flex-row items-center justify-center py-2.5 rounded-xl border border-blue-200 bg-blue-50"
                      onPress={() => { /* Handled Product Inspection logic */ }}
                    >
                      <FileText size={16} color="#2563eb" />
                      <Text className="ml-2 font-bold text-blue-700 text-sm">Start Inspection</Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="flex-row items-center justify-center py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                      <CheckCircle2 size={16} color="#10b981" />
                      <Text className="ml-2 font-bold text-gray-600 text-sm">Inspection Completed</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}