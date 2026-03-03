import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Package, ArrowRight, Grid3X3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { categoryService, Category } from '@/services/categoryService';
import { Search, ShoppingCart,ArrowLeft } from 'lucide-react-native';

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

      // Get all categories to find the one with matching slug
      const categoriesResponse = await categoryService.getAllCategories({
        status: 'ACTIVE',
        showRootOnly: 'true',
        includeSubcategories: 'true'
      });
      
      if (categoriesResponse.success && categoriesResponse.data) {
        const foundCategory = categoriesResponse.data.find(
          (cat: Category) => cat.slug === categorySlug
        );
        
        if (foundCategory) {
          setCategory(foundCategory);
          
          // If category has subcategories, use them
          if (foundCategory.subcategories && foundCategory.subcategories.length > 0) {
            setSubcategories(foundCategory.subcategories);
          } else {
            // Otherwise, fetch subcategories separately
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

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        {/* Banner Skeleton */}
        <View className="h-52 bg-gray-200">
          <View className="absolute inset-0 bg-black/50 items-center justify-center">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text className="text-white text-xl font-bold mt-4">Loading...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error || !category) {
    return (
      <View className="flex-1 bg-white">
        {/* Error Banner */}
        <View className="h-52 bg-gray-200">
          <View className="absolute inset-0 bg-black/50 items-center justify-center px-4">
            <Text className="text-white text-3xl font-bold mb-4 text-center">
              {error || 'Category Not Found'}
            </Text>
            <TouchableOpacity
              onPress={handleBackToCategories}
              className="bg-white px-6 py-3 rounded-lg"
            >
              <Text className="text-gray-900 font-semibold">Back to Categories</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
          {/* Header */}
 <View className="bg-white p-4 flex-row items-center justify-between border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">{category.name}</Text>
          </View>
          <View className="flex-row items-center space-x-4 gap-4">
            <TouchableOpacity onPress={() => router.push("/(any)/search" as any)}>
              <Search size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/cart" as any)}>
              <ShoppingCart size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
    
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 96 }}>
      {/* Banner Header Section */}
      <View className="h-52 relative">
        {category.image ? (
          <Image
            source={{ uri: category.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800" />
        )}
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-4">
          <Text className="text-white text-3xl font-bold text-center mb-3">
            {category.name}
          </Text>
          {/* <Text className="text-white text-base text-center mb-4 px-2">
            {category.description || `Explore our curated collection of ${category.name.toLowerCase()} with premium quality and craftsmanship`}
          </Text> */}
          <View className="flex-row items-center bg-white/30 rounded-full px-4 py-2">
            <Package size={16} color="#ffffff" />
            <Text className="text-white text-sm font-semibold ml-2">
              {subcategories.length} Subcategories Available
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View className="px-4 py-6">
        {/* Subcategories Grid */}
        {subcategories.length > 0 ? (
          <View className="flex-row flex-wrap justify-between">
            {subcategories.map((subcategory) => (
              <TouchableOpacity
                key={subcategory.id}
                onPress={() => handleSubcategoryPress(subcategory)}
                className="w-[48%] mb-6 bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
                activeOpacity={0.7}
              >
                {/* Image Section */}
                <View className="h-44 bg-gradient-to-br from-gray-100 to-orange-200 relative">
                  {subcategory.image ? (
                    <Image
                      source={{ uri: subcategory.image }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <Package size={48} color="#6b7280" style={{ opacity: 0.5 }} />
                    </View>
                  )}
                  
                  {/* Product Count Badge */}
                  {subcategory.productCount !== undefined && (
                    <View className="absolute top-3 right-3 bg-white/95 rounded-full px-3 py-1 shadow-lg">
                      <Text className="text-xs font-semibold text-gray-700">
                        {subcategory.productCount} items
                      </Text>
                    </View>
                  )}
                </View>

                {/* Content Section */}
                <View className="p-4">
                  <Text className="text-lg font-bold text-gray-900 mb-2" numberOfLines={2}>
                    {subcategory.name}
                  </Text>
                  {subcategory.description && (
                    <Text className="text-sm text-gray-600 leading-relaxed mb-3" numberOfLines={3}>
                      {subcategory.description}
                    </Text>
                  )}

                  {/* Action Button */}
                  <View className="flex-row items-center">
                    <Text className="text-sm text-gray-600 font-semibold">
                      Explore Collection
                    </Text>
                    <ArrowRight size={16} color="#4b5563" style={{ marginLeft: 8 }} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* Empty State */
          <View className="items-center py-12">
            <View className="bg-white rounded-2xl shadow-lg p-8 items-center max-w-md">
              <Package size={64} color="#d1d5db" />
              <Text className="text-2xl font-bold text-gray-900 mt-6 mb-4 text-center">
                No Subcategories Found
              </Text>
              <Text className="text-gray-600 text-center mb-6">
                This category doesn't have any subcategories yet. Check back later for updates.
              </Text>
              <TouchableOpacity
                onPress={handleBackToCategories}
                className="bg-amber-600 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold">Browse All Categories</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Call to Action Section */}
        <View className="mt-8 bg-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          <View className="px-6 py-8 items-center">
            <Text className="text-2xl font-bold text-white mb-3 text-center">
              Can't Find What You're Looking For?
            </Text>
            <Text className="text-lg text-gray-100 mb-6 text-center px-2">
              Discover more products with our advanced search or browse our complete collection
            </Text>
            <View className="w-full gap-3">
              <TouchableOpacity
                onPress={handleSearchProducts}
                className="flex-row items-center justify-center bg-white px-6 py-4 rounded-xl shadow-lg"
              >
                <Package size={20} color="#4b5563" />
                <Text className="text-gray-600 font-bold ml-2">Search Products</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBrowseAllProducts}
                className="flex-row items-center justify-center border-2 border-white px-6 py-4 rounded-xl"
              >
                <Grid3X3 size={20} color="#ffffff" />
                <Text className="text-white font-bold ml-2">Browse All Products</Text>
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
