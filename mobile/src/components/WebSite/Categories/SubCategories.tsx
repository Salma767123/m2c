import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Package,
  ArrowRight,
  Grid3X3,
  ShoppingCart,
  ArrowLeft,
  AlertCircle,
  Search,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { categoryService, Category } from '@/services/categoryService';

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

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 16;
const GRID_GAP = 16;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

const pressableOpacity = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.7 : 1,
});

export function SubCategories({ categorySlug }: SubCategoriesProps) {
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoryAndSubcategories = useCallback(async () => {
    try {
      setError(null);

      const categoriesResponse = await categoryService.getAllCategories({
        status: 'ACTIVE',
        showRootOnly: 'true',
        includeSubcategories: 'true',
      });

      if (categoriesResponse.success && categoriesResponse.data) {
        const foundCategory = categoriesResponse.data.find(
          (cat: Category) => cat.slug === categorySlug,
        );

        if (foundCategory) {
          setCategory(foundCategory);
          if (foundCategory.subcategories && foundCategory.subcategories.length > 0) {
            setSubcategories(foundCategory.subcategories);
          } else {
            const subResponse = await categoryService.getSubcategories(foundCategory.id);
            if (subResponse.success && subResponse.data) {
              setSubcategories(subResponse.data);
            } else {
              setSubcategories([]);
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
      setRefreshing(false);
    }
  }, [categorySlug]);

  useEffect(() => {
    fetchCategoryAndSubcategories();
  }, [fetchCategoryAndSubcategories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategoryAndSubcategories();
  }, [fetchCategoryAndSubcategories]);

  const handleSubcategoryPress = (subcategory: Subcategory) => {
    router.push({
      pathname: '/(any)/products',
      params: {
        category: category?.slug,
        subcategory: subcategory.slug,
      },
    } as any);
  };

  const handleBrowseAllProducts = () => {
    router.push('/(any)/products' as any);
  };

  const renderCard = (item: Subcategory) => {
    return (
      <View
        key={item.id}
        style={{
          width: CARD_WIDTH,
        }}
      >
      <Pressable
        onPress={() => handleSubcategoryPress(item)}
        accessibilityLabel={`Browse ${item.name} products`}
        accessibilityRole="button"
        android_ripple={{ color: 'rgba(15,23,42,0.06)', borderless: false }}
        style={({ pressed }) => ({
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <View
          className="bg-white rounded-3xl overflow-hidden border border-slate-200/70"
          style={{
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <View
            style={{ width: '100%', aspectRatio: 1, backgroundColor: '#f1f5f9' }}
          >
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={250}
                accessibilityLabel={`${item.name} image`}
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-slate-100">
                <Package size={40} color="#94a3b8" strokeWidth={1.5} />
              </View>
            )}
            {item.productCount !== undefined ? (
              <View
                className="absolute top-2.5 right-2.5 bg-white rounded-full px-2.5 py-1"
                style={{
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text className="text-[11px] font-bold text-slate-900">
                  {item.productCount}{' '}
                  {item.productCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="px-4 py-3">
            <Text
              className="text-base font-bold text-slate-900 mb-1"
              numberOfLines={1}
              style={{ lineHeight: 22 }}
            >
              {item.name}
            </Text>
            <View className="flex-row items-center">
              <Text className="text-xs text-slate-700 font-semibold">
                Explore
              </Text>
              <ArrowRight
                size={14}
                color="#334155"
                strokeWidth={2.25}
                style={{ marginLeft: 4 }}
              />
            </View>
          </View>
        </View>
      </Pressable>
      </View>
    );
  };

  const renderSkeletonGrid = () => (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: GRID_PADDING,
        columnGap: GRID_GAP,
        rowGap: GRID_GAP,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => {
        return (
          <View
            key={i}
            style={{
              width: CARD_WIDTH,
            }}
          >
            <View className="bg-white rounded-3xl overflow-hidden border border-slate-200/70">
              <View
                style={{
                  width: '100%',
                  aspectRatio: 1,
                  backgroundColor: '#e2e8f0',
                }}
              />
              <View className="px-4 py-3">
                <View
                  className="bg-slate-200 rounded-md mb-2"
                  style={{ height: 14, width: '70%' }}
                />
                <View
                  className="bg-slate-100 rounded-md"
                  style={{ height: 10, width: '40%' }}
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50">
        <HeaderBar title="Loading..." />
        <ScrollView
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: GRID_PADDING, marginBottom: 16 }}>
            <View
              className="rounded-3xl bg-slate-200"
              style={{ height: 180 }}
            />
          </View>
          {renderSkeletonGrid()}
        </ScrollView>
      </View>
    );
  }

  if (error || !category) {
    return (
      <View className="flex-1 bg-slate-50">
        <HeaderBar title="Category" />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-5">
            <AlertCircle size={36} color="#dc2626" strokeWidth={1.75} />
          </View>
          <Text
            className="text-xl font-bold text-slate-900 mb-2 text-center"
            style={{ lineHeight: 28 }}
          >
            {error || 'Category Not Found'}
          </Text>
          <Text
            className="text-base text-slate-600 text-center mb-6"
            style={{ lineHeight: 24 }}
          >
            We couldn't find what you're looking for.
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/categories' as any)}
            accessibilityLabel="Back to categories"
            accessibilityRole="button"
            style={({ pressed }) => ({
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
            className="flex-row items-center bg-slate-900 rounded-2xl px-8 min-h-[48px] justify-center"
          >
            <ArrowLeft size={18} color="#ffffff" strokeWidth={2.25} />
            <Text className="text-white font-bold text-base ml-2">
              Back to Categories
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <HeaderBar title={category.name} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0f172a"
            colors={['#0f172a']}
          />
        }
      >
        <View
          style={{
            paddingHorizontal: GRID_PADDING,
            paddingTop: 16,
            marginBottom: 16,
          }}
        >
          <View
            className="relative rounded-3xl overflow-hidden"
            style={{
              height: 180,
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            {category.image ? (
              <Image
                source={{ uri: category.image }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                accessibilityLabel={`${category.name} banner`}
              />
            ) : (
              <View className="w-full h-full bg-slate-800" />
            )}
            <View
              className="absolute inset-0 justify-end p-5"
              style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}
            >
              <View className="flex-row items-center bg-white/20 self-start rounded-full px-3 py-1 mb-2 border border-white/30">
                <Sparkles size={12} color="#ffffff" strokeWidth={2.25} />
                <Text className="text-white text-[11px] font-bold ml-1.5 uppercase tracking-wide">
                  Collection
                </Text>
              </View>
              <Text
                className="text-white text-2xl font-extrabold mb-1"
                style={{ lineHeight: 30 }}
                numberOfLines={2}
              >
                {category.name}
              </Text>
              <View className="flex-row items-center">
                <Package size={14} color="#e2e8f0" strokeWidth={2} />
                <Text className="text-slate-200 text-sm font-semibold ml-1.5">
                  {subcategories.length}{' '}
                  {subcategories.length === 1
                    ? 'Subcategory'
                    : 'Subcategories'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {subcategories.length > 0 ? (
          <>
            <View style={{ paddingHorizontal: GRID_PADDING, marginBottom: 12 }}>
              <Text
                className="text-lg font-extrabold text-slate-900"
                style={{ lineHeight: 24 }}
              >
                Shop by Subcategory
              </Text>
              <Text className="text-sm text-slate-600 mt-0.5">
                Choose a collection to explore
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                paddingHorizontal: GRID_PADDING,
                columnGap: GRID_GAP,
                rowGap: GRID_GAP,
              }}
            >
              {subcategories.map(renderCard)}
            </View>
          </>
        ) : (
          <View className="items-center py-12 px-8">
            <View className="w-20 h-20 rounded-full bg-slate-100 items-center justify-center mb-5">
              <Search size={36} color="#64748b" strokeWidth={1.75} />
            </View>
            <Text
              className="text-xl font-bold text-slate-900 mb-2 text-center"
              style={{ lineHeight: 28 }}
            >
              No Subcategories Yet
            </Text>
            <Text
              className="text-base text-slate-600 text-center"
              style={{ lineHeight: 24 }}
            >
              This category doesn't have any subcategories yet.
            </Text>
          </View>
        )}

        <View
          style={{
            marginHorizontal: GRID_PADDING,
            marginTop: 8,
          }}
        >
          <View
            className="bg-slate-900 rounded-3xl p-5"
            style={{
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <Text
              className="text-lg font-extrabold text-white mb-1 text-center"
              style={{ lineHeight: 24 }}
            >
              Can't find what you need?
            </Text>
            <Text
              className="text-sm text-slate-300 mb-4 text-center"
              style={{ lineHeight: 20 }}
            >
              Browse our complete collection of products
            </Text>
            <Pressable
              onPress={handleBrowseAllProducts}
              accessibilityLabel="Browse all products"
              accessibilityRole="button"
              style={({ pressed }) => ({
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
              className="flex-row items-center justify-center bg-white rounded-2xl min-h-[48px] px-6"
            >
              <Grid3X3 size={18} color="#0f172a" strokeWidth={2.25} />
              <Text className="text-slate-900 font-bold text-base ml-2">
                Browse All Products
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderBar({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View className="bg-white px-4 py-3 flex-row items-center justify-between border-b border-slate-200">
      <View className="flex-row items-center flex-1">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          style={pressableOpacity}
          className="w-11 h-11 items-center justify-center rounded-full bg-slate-100 mr-3"
        >
          <ArrowLeft size={20} color="#0f172a" strokeWidth={2.25} />
        </Pressable>
        <Text
          className="text-lg font-extrabold text-slate-900 flex-1"
          numberOfLines={1}
          style={{ lineHeight: 24 }}
        >
          {title}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/(tabs)/cart' as any)}
        accessibilityLabel="View cart"
        accessibilityRole="button"
        hitSlop={8}
        style={pressableOpacity}
        className="w-11 h-11 items-center justify-center rounded-full bg-slate-100"
      >
        <ShoppingCart size={20} color="#0f172a" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

export default SubCategories;
