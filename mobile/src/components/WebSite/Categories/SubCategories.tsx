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
import {
  Package,
  ArrowRight,
  Grid3X3,
  Search,
  ShoppingCart,
  ArrowLeft,
  ChevronRight,
  Layers,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { categoryService, Category } from '@/services/categoryService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount?: number;
}

interface SubCategoriesProps {
  categorySlug: string;
}

// ─── Subcategory Card ─────────────────────────────────────────────────────────
function SubcategoryCard({
  subcategory,
  onPress,
}: {
  subcategory: Subcategory;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-[48%] mb-4 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
      activeOpacity={0.75}
    >
      {/* Image */}
      <View className="h-40 bg-gray-100 relative">
        {subcategory.image ? (
          <Image
            source={{ uri: subcategory.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Package size={36} color="#d1d5db" />
          </View>
        )}

        {/* Product count badge */}
        {subcategory.productCount !== undefined && (
          <View className="absolute top-2.5 right-2.5 bg-black/70 rounded-full px-2.5 py-1">
            <Text className="text-white text-[10px] font-bold">
              {subcategory.productCount} items
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View className="px-3 pt-2.5 pb-3">
        <Text className="text-sm font-bold text-gray-900 mb-0.5" numberOfLines={1}>
          {subcategory.name}
        </Text>
        {subcategory.description ? (
          <Text className="text-[11px] text-gray-500 leading-4 mb-2" numberOfLines={2}>
            {subcategory.description}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-1 mt-1">
          <Text className="text-[11px] font-semibold text-gray-700">Explore</Text>
          <ChevronRight size={11} color="#6b7280" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SubCategories({ categorySlug }: SubCategoriesProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCategoryAndSubcategories();
  }, [categorySlug]);

  const fetchCategoryAndSubcategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const categoriesResponse = await categoryService.getAllCategories({
        status: 'ACTIVE',
        showRootOnly: 'true',
        includeSubcategories: 'true',
      });

      if (categoriesResponse.success && categoriesResponse.data) {
        const foundCategory = categoriesResponse.data.find(
          (cat: Category) => cat.slug === categorySlug
        );

        if (foundCategory) {
          setCategory(foundCategory);

          if (foundCategory.subcategories && foundCategory.subcategories.length > 0) {
            setSubcategories(foundCategory.subcategories);
          } else {
            const subcategoriesResponse = await categoryService.getSubcategories(foundCategory.id);
            if (subcategoriesResponse.success && subcategoriesResponse.data) {
              setSubcategories(subcategoriesResponse.data);
            }
          }
        } else {
          setError('Category not found');
        }
      } else {
        setError('Failed to load category');
      }
    } catch (err) {
      console.error('Failed to fetch category and subcategories:', err);
      setError('Failed to load category');
    } finally {
      setLoading(false);
    }
  };

  const handleSubcategoryPress = (subcategory: Subcategory) => {
    router.push({
      pathname: '/(any)/products',
      params: {
        categoryName: category?.name,
        subcategoryName: subcategory.name,
        category: category?.slug,
        subcategory: subcategory.slug,
      },
    } as any);
  };

  const handleBackToCategories = () => {
    router.push('/(tabs)/categories' as any);
  };

  const handleSearchProducts = () => {
    router.push('/(any)/search' as any);
  };

  const handleBrowseAllProducts = () => {
    router.push('/(any)/products' as any);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <ActivityIndicator size="large" color="#000000" />
        <Text className="text-gray-500 mt-3 text-sm font-medium">Loading…</Text>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !category) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        {/* Minimal header */}
        <View className={`bg-black ${Platform.OS === 'ios' ? 'pt-0' : 'pt-4'} pb-4 px-5`}>
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-2">
            <ArrowLeft size={20} color="#ffffff" />
            <Text className="text-white font-semibold text-sm">Back</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
            <Package size={32} color="#9ca3af" />
          </View>
          <Text className="text-lg font-extrabold text-gray-900 mb-1 text-center">
            {error || 'Category Not Found'}
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-6">
            We couldn't find the category you're looking for.
          </Text>
          <TouchableOpacity
            onPress={handleBackToCategories}
            className="bg-black px-6 py-3 rounded-xl"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-sm">Back to Categories</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View className={`bg-black ${Platform.OS === 'ios' ? 'pt-0' : 'pt-4'} pb-4 px-5`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-8 h-8 rounded-xl bg-white/10 items-center justify-center"
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white text-lg font-extrabold tracking-tight" numberOfLines={1}>
                {category.name}
              </Text>
              <Text className="text-gray-400 text-xs mt-0.5">
                {subcategories.length} subcategories
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={handleSearchProducts}
              className="w-9 h-9 rounded-xl bg-white/10 items-center justify-center"
              activeOpacity={0.7}
            >
              <Search size={17} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/cart' as any)}
              className="w-9 h-9 rounded-xl bg-white/10 items-center justify-center"
              activeOpacity={0.7}
            >
              <ShoppingCart size={17} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Banner ────────────────────────────────────────────────────────── */}
        <View className="h-48 relative">
          {category.image ? (
            <Image
              source={{ uri: category.image }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-gray-300" />
          )}
          {/* Overlay */}
          <View
            className="absolute inset-0 items-center justify-end pb-5 px-5"
            style={{ backgroundColor: 'rgba(0,0,0,0.50)' }}
          >
            <View className="flex-row items-center gap-2 bg-white/20 rounded-full px-4 py-1.5">
              <Layers size={13} color="#ffffff" />
              <Text className="text-white text-xs font-semibold">
                {subcategories.length} Subcategories Available
              </Text>
            </View>
          </View>
        </View>

        {/* ── Grid ──────────────────────────────────────────────────────────── */}
        <View className="px-4 pt-5">
          {/* Section label */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-extrabold text-gray-900">Subcategories</Text>
            <Text className="text-xs text-gray-400">{subcategories.length} available</Text>
          </View>

          {subcategories.length > 0 ? (
            <View className="flex-row flex-wrap justify-between">
              {subcategories.map((subcategory) => (
                <SubcategoryCard
                  key={subcategory.id}
                  subcategory={subcategory}
                  onPress={() => handleSubcategoryPress(subcategory)}
                />
              ))}
            </View>
          ) : (
            /* Empty state */
            <View className="items-center py-12">
              <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Package size={36} color="#d1d5db" />
              </View>
              <Text className="text-lg font-extrabold text-gray-900 mb-1 text-center">
                No Subcategories Found
              </Text>
              <Text className="text-sm text-gray-500 text-center mb-6 px-6">
                This category doesn't have any subcategories yet. Check back later.
              </Text>
              <TouchableOpacity
                onPress={handleBackToCategories}
                className="bg-black px-6 py-3 rounded-xl"
                activeOpacity={0.85}
              >
                <Text className="text-white font-bold text-sm">Browse All Categories</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── CTA Section ─────────────────────────────────────────────────── */}
          <View className="mt-6 bg-black rounded-2xl overflow-hidden">
            <View className="px-6 py-7 items-center">
              <Text className="text-lg font-extrabold text-white mb-1.5 text-center">
                Can't Find What You're Looking For?
              </Text>
              <Text className="text-sm text-gray-400 text-center mb-5 leading-5">
                Use search or browse our complete collection to discover more.
              </Text>
              <View className="w-full gap-3">
                <TouchableOpacity
                  onPress={handleSearchProducts}
                  className="flex-row items-center justify-center bg-white px-6 py-3.5 rounded-xl gap-2"
                  activeOpacity={0.85}
                >
                  <Search size={16} color="#111827" />
                  <Text className="text-gray-900 font-bold text-sm">Search Products</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBrowseAllProducts}
                  className="flex-row items-center justify-center border border-white/30 bg-white/10 px-6 py-3.5 rounded-xl gap-2"
                  activeOpacity={0.85}
                >
                  <Grid3X3 size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-sm">Browse All Products</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default SubCategories;
