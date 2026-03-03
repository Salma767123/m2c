import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { Package } from 'lucide-react-native';
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
        sortOrder: 'asc'
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
      <View className="bg-white px-4 py-6">
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color="#374151" />
          <Text className="mt-4 text-gray-600">Loading categories...</Text>
        </View>
      </View>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <View className="bg-white px-4 py-6">
      {/* Header Section */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">
            Shop by Category
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            Explore our carefully curated collection
          </Text>
        </View>
      </View>

      {/* Categories Horizontal Scroll */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
        className="mb-4"
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => router.push(`/(tabs)/categories/${category.slug}` as any)}
            className="mr-4"
            style={{ width: 80 }}
            activeOpacity={0.7}
          >
            {/* Category Image */}
            <View className="w-20 h-20 mb-2 overflow-hidden rounded-xl bg-gray-100 shadow-md">
              {category.image ? (
                <Image
                  source={{ uri: category.image }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <Package size={32} color="#9ca3af" />
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

      {/* View All Button */}
      <View className="items-center mt-2">
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/categories' as any)}
          className="bg-gray-800 px-6 py-3 rounded-lg"
          activeOpacity={0.8}
        >
          <Text className="text-white text-sm font-bold">View All Categories</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
