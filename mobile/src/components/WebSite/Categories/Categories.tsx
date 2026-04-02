import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { Package, Search, ShoppingCart, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { categoryService, type Category } from '@/services/categoryService';

// ─── Header Component ─────────────────────────────────────────────────────────
function Header() {
  return (
    <View className={`bg-black ${Platform.OS === 'ios' ? 'pt-0' : 'pt-4'} pb-4 px-5`}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-white text-2xl font-extrabold tracking-tight">Categories</Text>
          <Text className="text-gray-400 text-xs mt-0.5">Browse our collections</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.push('/(any)/search' as any)}
            className="w-9 h-9 rounded-xl bg-white/10 items-center justify-center"
            activeOpacity={0.7}
          >
            <Search size={18} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/cart' as any)}
            className="w-9 h-9 rounded-xl bg-white/10 items-center justify-center"
            activeOpacity={0.7}
          >
            <ShoppingCart size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────
function CategoryCard({ category, onPress }: { category: Category; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-[48%] mb-4 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
      activeOpacity={0.75}
    >
      {/* Image area */}
      <View className="w-full aspect-square bg-gray-100 relative">
        {category.image ? (
          <Image
            source={{ uri: category.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Package size={40} color="#d1d5db" />
          </View>
        )}
        {/* Dark overlay gradient at bottom */}
        <View
          className="absolute bottom-0 left-0 right-0 h-14"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
        />
      </View>

      {/* Info area */}
      <View className="px-3 py-3">
        <Text className="text-sm font-bold text-gray-900 mb-0.5" numberOfLines={1}>
          {category.name}
        </Text>
        <View className="flex-row items-center justify-between">
          {category.subcategoryCount !== undefined && category.subcategoryCount > 0 ? (
            <Text className="text-[11px] text-gray-500">
              {category.subcategoryCount} subcategories
            </Text>
          ) : (
            <Text className="text-[11px] text-gray-400">Explore</Text>
          )}
          <ChevronRight size={13} color="#9ca3af" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
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
        status: 'ACTIVE',
        showRootOnly: 'true',
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      });

      if (response.success && response.data) {
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
    router.push(`/(tabs)/categories/${category.slug}` as any);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Header />
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="text-gray-500 text-sm font-medium">Loading Categories…</Text>
        </View>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Header />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
            <Package size={32} color="#9ca3af" />
          </View>
          <Text className="text-lg font-extrabold text-gray-900 mb-1 text-center">
            Something went wrong
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-6">{error}</Text>
          <TouchableOpacity
            onPress={fetchCategories}
            className="bg-black px-6 py-3 rounded-xl"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-sm">Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Header />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section label */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-base font-extrabold text-gray-900">All Categories</Text>
          <Text className="text-xs text-gray-400">{categories.length} available</Text>
        </View>

        {categories.length === 0 ? (
          /* Empty state */
          <View className="items-center py-16">
            <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Package size={36} color="#d1d5db" />
            </View>
            <Text className="text-lg font-extrabold text-gray-900 mb-1 text-center">
              No Categories Yet
            </Text>
            <Text className="text-sm text-gray-500 text-center">
              Categories will appear here once they are added.
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onPress={() => handleCategoryPress(category)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
