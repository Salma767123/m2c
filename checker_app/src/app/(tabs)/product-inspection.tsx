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
      {/* Form (renders its own header with exit-guard-aware back button) */}
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
