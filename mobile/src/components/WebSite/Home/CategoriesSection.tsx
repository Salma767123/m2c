import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Package, ChevronRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { categoryService, Category } from '@/services/categoryService';

const CARD_SIZE = 92;
const CARD_GAP = 14;

const pressableOpacity = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.7 : 1,
});

export default function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true',
          sortBy: 'sortOrder',
          sortOrder: 'asc',
        });

        if (isMounted && response.success && response.data) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const renderSkeleton = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: CARD_SIZE,
            marginRight: CARD_GAP,
            alignItems: 'center',
          }}
        >
          <View
            className="bg-slate-200 rounded-3xl mb-2"
            style={{ width: CARD_SIZE, height: CARD_SIZE }}
          />
          <View
            className="bg-slate-200 rounded-md"
            style={{ height: 10, width: '70%' }}
          />
        </View>
      ))}
    </ScrollView>
  );

  if (!loading && categories.length === 0) {
    return null;
  }

  return (
    <View className="bg-white pt-6 pb-7">
      <View className="px-4 flex-row items-center justify-between mb-4">
        <View className="flex-1 pr-3">
          <Text
            className="text-xl font-extrabold text-slate-900"
            style={{ lineHeight: 26 }}
          >
            Shop by Category
          </Text>
          <Text
            className="text-sm text-slate-600 mt-0.5"
            style={{ lineHeight: 20 }}
          >
            Explore our curated collection
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/categories' as any)}
          accessibilityLabel="View all categories"
          accessibilityRole="button"
          hitSlop={8}
          style={pressableOpacity}
          className="flex-row items-center bg-slate-100 rounded-full pl-3.5 pr-2.5 py-2 min-h-[36px]"
        >
          <Text className="text-xs font-bold text-slate-900 mr-0.5">
            View All
          </Text>
          <ChevronRight size={14} color="#0f172a" strokeWidth={2.5} />
        </Pressable>
      </View>

      {loading ? (
        renderSkeleton()
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          decelerationRate="fast"
        >
          {categories.map((category, idx) => (
            <View
              key={category.id}
              style={{
                width: CARD_SIZE,
                marginRight: idx === categories.length - 1 ? 0 : CARD_GAP,
              }}
            >
            <Pressable
              onPress={() =>
                router.push(`/(tabs)/categories/${category.slug}` as any)
              }
              accessibilityLabel={`View ${category.name} category`}
              accessibilityRole="button"
              android_ripple={{
                color: 'rgba(15,23,42,0.08)',
                borderless: true,
              }}
              style={({ pressed }) => ({
                width: CARD_SIZE,
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <View
                className="mb-2 overflow-hidden rounded-3xl bg-slate-100 border border-slate-200/70"
                style={{
                  width: CARD_SIZE,
                  height: CARD_SIZE,
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                {category.image ? (
                  <Image
                    source={{ uri: category.image }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                    accessibilityLabel={`${category.name} image`}
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Package size={32} color="#94a3b8" strokeWidth={1.5} />
                  </View>
                )}
              </View>
              <Text
                className="text-xs font-bold text-slate-900 text-center"
                style={{ lineHeight: 16 }}
                numberOfLines={2}
              >
                {category.name}
              </Text>
            </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
