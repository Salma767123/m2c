import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react-native';
import { ProductCard } from '@/components/WebSite/ProductCard/ProductCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// Mock wishlist products
const mockWishlistProducts = [
  {
    id: '1',
    name: 'Premium Cotton Fabric',
    price: 29.99,
    originalPrice: 39.99,
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
    rating: 4.5,
    reviewCount: 128,
    inStock: true,
    category: 'cotton',
    description: 'High-quality cotton fabric perfect for clothing and home textiles.'
  },
  {
    id: '2',
    name: 'Luxury Silk Textile',
    price: 89.99,
    originalPrice: 119.99,
    image: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400',
    rating: 4.8,
    reviewCount: 89,
    inStock: true,
    category: 'silk',
    description: 'Elegant silk textile with premium finish and lustrous appearance.'
  },
];

export default function WishlistScreen() {
  const [wishlistItems, setWishlistItems] = useState(mockWishlistProducts);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    loadWishlist();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const loadWishlist = async () => {
    try {
      const wishlistData = await AsyncStorage.getItem('wishlistItems');
      if (wishlistData) {
        setWishlistItems(JSON.parse(wishlistData));
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const handleAddToCart = async (productId: string, quantity: number) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to add items to cart',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/(auth)/Login') }
        ]
      );
      return;
    }

    try {
      // Add to cart logic here
      Alert.alert('Success', 'Item added to cart');
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    Alert.alert(
      'Remove from Wishlist',
      'Are you sure you want to remove this item from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedItems = wishlistItems.filter(item => item.id !== productId);
              setWishlistItems(updatedItems);
              await AsyncStorage.setItem('wishlistItems', JSON.stringify(updatedItems));
              Alert.alert('Removed', 'Item removed from wishlist');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item');
            }
          }
        }
      ]
    );
  };

  const handleClearWishlist = () => {
    Alert.alert(
      'Clear Wishlist',
      'Are you sure you want to remove all items from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setWishlistItems([]);
              await AsyncStorage.setItem('wishlistItems', JSON.stringify([]));
              Alert.alert('Cleared', 'Wishlist cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear wishlist');
            }
          }
        }
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <Heart size={64} color="#d1d5db" />
        <Text className="text-2xl font-bold text-gray-900 mt-4 mb-2">
          Login Required
        </Text>
        <Text className="text-gray-600 text-center mb-6">
          Please login to view and manage your wishlist items
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/Login')}
          className="bg-gray-900 rounded-xl px-8 py-4"
        >
          <Text className="text-white font-bold text-lg">Login Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">My Wishlist</Text>
          <Text className="text-gray-600 mt-1">Save items for later</Text>
        </View>

        {/* Empty State */}
        <View className="flex-1 items-center justify-center p-6">
          <Heart size={64} color="#d1d5db" />
          <Text className="text-2xl font-bold text-gray-900 mt-4 mb-2">
            Your wishlist is empty
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            Start adding items to your wishlist by tapping the heart icon on products
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            className="bg-gray-900 rounded-xl px-8 py-4"
          >
            <Text className="text-white font-bold text-lg">Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">My Wishlist</Text>
            <Text className="text-gray-600 mt-1">
              {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
          
          {wishlistItems.length > 0 && (
            <TouchableOpacity
              onPress={handleClearWishlist}
              className="flex-row items-center bg-red-50 px-4 py-2 rounded-xl"
            >
              <Trash2 size={16} color="#ef4444" />
              <Text className="text-red-600 font-medium ml-2">Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Wishlist Items */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 8, paddingBottom: 68 }}>
        <View className="flex-row flex-wrap justify-between">
          {wishlistItems.map((product) => (
            <View key={product.id} className="w-[48%] mb-4">
              <ProductCard
                product={product}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleRemoveFromWishlist}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="bg-white border-t border-gray-200 p-4">
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/cart')}
          className="bg-gray-900 rounded-xl py-4 flex-row items-center justify-center"
        >
          <ShoppingCart size={20} color="#ffffff" />
          <Text className="text-white font-bold text-lg ml-2">View Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}