import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { Package, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { categoryService, Category } from '@/services/categoryService';

export default function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryService.getAllCategories({
        status: 'ACTIVE',
        showRootOnly: 'true',
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      });
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="bg-gray-50 px-4 py-8">
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color="#111827" />
          <Text className="mt-3 text-xs text-gray-400 tracking-widest uppercase">
            Loading…
          </Text>
        </View>
      </View>
    );
  }

  if (categories.length === 0) return null;

  return (
    <View className="bg-gray-50 px-4 pt-6 pb-5">

      {/* ── Section Header ─────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between mb-5">
        {/* Left: accent bar + title */}
        <View className="flex-row items-center flex-1">
          <View className="w-1 h-6 bg-black rounded-full mr-3" />
          <View>
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
              Browse
            </Text>
            <Text className="text-lg font-bold text-gray-900 leading-tight">
              Shop by Category
            </Text>
          </View>
        </View>

        {/* Right: View All pill */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/categories' as any)}
          className="flex-row items-center bg-gray-700 px-3 py-1.5 rounded-lg"
          activeOpacity={0.8}
        >
          <Text className="text-sm font-semibold text-gray-100 mr-1">View All</Text>
          <ArrowRight size={12} color="#f5f5f5" />
        </TouchableOpacity>
      </View>

      {/* ── Categories Horizontal Scroll ───────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8 }}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => router.push(`/(tabs)/categories/${category.slug}` as any)}
            className="mr-3 items-center"
            style={{ width: 76 }}
            activeOpacity={0.75}
          >
            {/* Category Image circle */}
            <View
              className="mb-2 overflow-hidden bg-white"
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                borderWidth: 1.5,
                borderColor: '#e5e5e5',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.07,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {category.image ? (
                <Image
                  source={{ uri: category.image }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full items-center justify-center bg-gray-100">
                  <Package size={28} color="#9ca3af" />
                </View>
              )}
            </View>

            {/* Category Name */}
            <Text
              className="text-xs font-semibold text-gray-700 text-center leading-tight"
              numberOfLines={2}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

    </View>
  );
}
