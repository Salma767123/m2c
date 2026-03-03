import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import SubCategories from '@/components/WebSite/Categories/SubCategories';

export default function CategoryDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Invalid category</Text>
      </View>
    );
  }

  return <SubCategories categorySlug={id} />;
}
