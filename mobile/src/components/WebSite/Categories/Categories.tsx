import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Package, Search, ShoppingCart } from 'lucide-react-native';
import { router } from 'expo-router';
import { categoryService, type Category } from "@/services/categoryService";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await categoryService.getAllCategories({
        status: "ACTIVE",
        showRootOnly: "true",
        sortBy: "sortOrder",
        sortOrder: "asc",
      });

      console.log('Categories response:', response);

      if (response.success && response.data) {
        console.log('Categories data:', response.data);
        setCategories(response.data);
      } else {
        setError('Failed to load categories');
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (category: Category) => {
    // Navigate to subcategories page using category slug
    router.push(`/(tabs)/categories/${category.slug}` as any);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white p-4 flex-row items-center justify-between border-b border-gray-200">
          <Text className="text-xl font-bold text-gray-800">All Categories</Text>
          <View className="flex-row items-center space-x-4 gap-4">
            <TouchableOpacity onPress={() => router.push("/(any)/search" as any)}>
              <Search size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/cart" as any)}>
              <ShoppingCart size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Banner Skeleton */}
        <View className="h-48 bg-gray-200">
          <View className="absolute inset-0 bg-black/60 items-center justify-center">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text className="text-white text-xl font-bold mt-4">Loading Categories...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white p-4 flex-row items-center justify-between border-b border-gray-200">
          <Text className="text-xl font-bold text-gray-800">All Categories</Text>
          <View className="flex-row items-center space-x-4 gap-4">
            <TouchableOpacity onPress={() => router.push("/(any)/search" as any)}>
              <Search size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/cart" as any)}>
              <ShoppingCart size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Error Banner */}
        <View className="h-48 bg-gray-200">
          <View className="absolute inset-0 bg-black/60 items-center justify-center px-4">
            <Text className="text-white text-2xl font-bold mb-2 text-center">
              Error Loading Categories
            </Text>
            <Text className="text-white text-base text-center">{error}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-4 flex-row items-center justify-between border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-800">All Categories</Text>
        <View className="flex-row items-center space-x-4 gap-4">
          <TouchableOpacity onPress={() => router.push("/(any)/search" as any)}>
            <Search size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(tabs)/cart" as any)}>
            <ShoppingCart size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 96, padding: 16 }}>
      {/* Categories Grid */}
      {categories.length === 0 ? (
        <View className="items-center py-12">
          <Package size={64} color="#d1d5db" />
          <Text className="text-xl font-bold text-gray-900 mt-4 mb-2">
            No Categories Available
          </Text>
          <Text className="text-gray-600 text-center">
            Categories will appear here once they are added.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap justify-between">
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => handleCategoryPress(category)}
              className="w-[48%] mb-4"
              activeOpacity={0.7}
            >
              {/* Category Image */}
              <View className="w-full aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
                {category.image ? (
                  <Image
                    source={{ uri: category.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Package size={48} color="#9ca3af" />
                  </View>
                )}
              </View>

              {/* Category Name */}
              <Text className="text-base font-semibold text-gray-900 text-center mb-1">
                {category.name}
              </Text>
              
              {/* Subcategory Count */}
              {category.subcategoryCount !== undefined && category.subcategoryCount > 0 && (
                <Text className="text-sm text-gray-500 text-center">
                  {category.subcategoryCount} subcategories
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
    </View>
  );
}
