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
  ShoppingCart,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { categoryService, type Category } from '@/services/categoryService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 16;
const GRID_GAP = 16;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

const pressableOpacity = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.7 : 1,
});

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories();
  }, [fetchCategories]);

  const handleCategoryPress = (category: Category) => {
    router.push(`/(tabs)/categories/${category.slug}` as any);
  };

  const renderCard = (item: Category) => {
    const count = item.subcategoryCount ?? 0;
    return (
      <View
        key={item.id}
        style={{
          width: CARD_WIDTH,
        }}
      >
      <Pressable
        onPress={() => handleCategoryPress(item)}
        accessibilityLabel={`View ${item.name} subcategories`}
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
                accessibilityLabel={`${item.name} category image`}
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-slate-100">
                <Package size={44} color="#94a3b8" strokeWidth={1.5} />
              </View>
            )}
            {count > 0 ? (
              <View
                className="absolute top-2.5 right-2.5 flex-row items-center bg-white rounded-full px-2.5 py-1"
                style={{
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text className="text-[11px] font-bold text-slate-900">
                  {count}
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
            <View className="flex-row items-center justify-between">
              <Text
                className="text-xs text-slate-600 font-medium flex-1"
                numberOfLines={1}
              >
                {count > 0
                  ? `${count} ${count === 1 ? 'subcategory' : 'subcategories'}`
                  : 'Explore now'}
              </Text>
              <ChevronRight size={16} color="#475569" strokeWidth={2.25} />
            </View>
          </View>
        </View>
      </Pressable>
      </View>
    );
  };

  const renderSkeleton = () => (
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
                  style={{ height: 10, width: '50%' }}
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-white px-4 pt-3 pb-4 border-b border-slate-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text
              className="text-2xl font-extrabold text-slate-900"
              style={{ lineHeight: 30 }}
            >
              All Categories
            </Text>
            <Text className="text-sm text-slate-600 mt-0.5">
              Browse our complete collection
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
      </View>

      {loading ? (
        <ScrollView
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {renderSkeleton()}
        </ScrollView>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-5">
            <AlertCircle size={36} color="#dc2626" strokeWidth={1.75} />
          </View>
          <Text
            className="text-xl font-bold text-slate-900 mb-2 text-center"
            style={{ lineHeight: 28 }}
          >
            Something went wrong
          </Text>
          <Text
            className="text-base text-slate-600 text-center mb-6"
            style={{ lineHeight: 24 }}
          >
            {error}
          </Text>
          <Pressable
            onPress={fetchCategories}
            accessibilityLabel="Retry loading categories"
            accessibilityRole="button"
            style={({ pressed }) => ({
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
            className="flex-row items-center bg-slate-900 rounded-2xl px-8 min-h-[48px] justify-center"
          >
            <RefreshCw size={18} color="#ffffff" strokeWidth={2.25} />
            <Text className="text-white font-bold text-base ml-2">
              Try Again
            </Text>
          </Pressable>
        </View>
      ) : categories.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-slate-100 items-center justify-center mb-5">
            <Search size={36} color="#64748b" strokeWidth={1.75} />
          </View>
          <Text
            className="text-xl font-bold text-slate-900 mb-2 text-center"
            style={{ lineHeight: 28 }}
          >
            No Categories Yet
          </Text>
          <Text
            className="text-base text-slate-600 text-center"
            style={{ lineHeight: 24 }}
          >
            Categories will appear here once they are added.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
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
              flexDirection: 'row',
              flexWrap: 'wrap',
              paddingHorizontal: GRID_PADDING,
              columnGap: GRID_GAP,
              rowGap: GRID_GAP,
            }}
          >
            {categories.map(renderCard)}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
