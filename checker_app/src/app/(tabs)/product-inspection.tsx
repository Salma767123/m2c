import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import ProductInspectionForm from '@/components/Products/ProductInspectionForm';

export default function ProductInspectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    productId: string;
    productName: string;
    vendorName: string;
  }>();

  const { productId, productName, vendorName } = params;

  if (!productId || !productName || !vendorName) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-gray-500 text-sm">Missing product information.</Text>
        <TouchableOpacity
          className="mt-4 px-4 py-2 bg-gray-900 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-white font-medium text-sm">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-4 pb-2 flex-row items-center border-b border-gray-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
            Product Inspection
          </Text>
          <Text className="text-xs text-gray-500" numberOfLines={1}>
            {productName}
          </Text>
        </View>
      </View>

      {/* Form */}
      <ProductInspectionForm
        productId={productId}
        productName={productName}
        vendorName={vendorName}
        onComplete={() => router.back()}
        onCancel={() => router.back()}
      />
    </View>
  );
}
